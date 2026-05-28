"""
CRUD Medios de Pago — service layer.
Migrado desde crud_medios_de_pago_v6.py con lógica de filtros y fechas preservada.
"""
import asyncio
import logging
import uuid
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.sellers.models import EstadoKeys, Seller
from app.modules.sellers.service import get_decrypted_credentials

from . import vtex_client
from .models import CrudOperation, CrudOperationRow
from .schemas import (
    AcreateRequest,
    CrudRequest,
    CrudResponse,
    CrudRowOut,
    EventoConfig,
    EventoValidateRequest,
    EventoValidateResponse,
    FiltrosRequest,
    GrupoDashboard,
    SellerDashboard,
    SellerEventoResult,
    UpdateRequest,
)

logger = logging.getLogger(__name__)

# Argentina = UTC-3
AR_TZ = timezone(timedelta(hours=-3))

PAYMENT_SYSTEMS_MAP = {
    "visa":       {"id": 2,  "name": "Visa"},
    "mastercard": {"id": 4,  "name": "Mastercard"},
    "electron":   {"id": 10, "name": "Visa Electron"},
}


# ── Date/time normalization ────────────────────────────────────────────────────

def _normalize_to_ar(dt_str: str | None) -> datetime | None:
    """
    Convierte strings de fecha VTEX a datetime en hora Argentina.
    Preserva la lógica crítica del script:
      - T00:00:00 sin Z → hora local AR (medianoche AR)
      - T03:00:00Z con Z → UTC → equivale a medianoche AR
    """
    if not dt_str:
        return None
    try:
        s = dt_str.strip()
        if s.endswith("Z"):
            dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        elif "+" in s[10:] or (s.count("-") > 2):
            dt = datetime.fromisoformat(s)
        else:
            dt = datetime.fromisoformat(s).replace(tzinfo=AR_TZ)
        return dt.astimezone(AR_TZ)
    except (ValueError, TypeError):
        return None


def _parse_date(date_str: str | None) -> datetime | None:
    """YYYY-MM-DD → medianoche AR."""
    if not date_str:
        return None
    try:
        d = datetime.strptime(date_str, "%Y-%m-%d")
        return d.replace(tzinfo=AR_TZ)
    except ValueError:
        return None


def _parse_time(t_str: str | None) -> time | None:
    if not t_str:
        return None
    for fmt in ("%H:%M:%S", "%H:%M"):
        try:
            return datetime.strptime(t_str.strip(), fmt).time()
        except ValueError:
            continue
    return None


def _rule_time(rule: dict, field: str) -> time | None:
    val = rule.get(field)
    if not val:
        return None
    return _parse_time(str(val))


def _compare_time(rule_t: time | None, filter_t: time | None, mode: str) -> bool:
    if filter_t is None:
        return True
    if rule_t is None:
        return False
    if mode == "exclude":
        return rule_t != filter_t
    # "include" and default = exact match
    return rule_t == filter_t


def _build_installments(cuotas: list[int]) -> list[dict]:
    return [
        {"quantity": q, "value": 0.0, "interestRate": 0.0, "interestTax": 0.0}
        for q in sorted(cuotas)
    ]


def _extract_connector(rules: list[dict]) -> tuple[str | None, str | None, str | None]:
    """
    Extrae connector.implementation, connector.affiliationId e issuer.name
    de la primera regla del seller que tenga ambos campos completos.
    Replica la lógica de extract_connector del script v6.
    """
    for r in rules:
        conn = r.get("connector") or {}
        if conn.get("implementation") and conn.get("affiliationId"):
            issuer = (r.get("issuer") or {}).get(
                "name", "banco de la provincia de buenos aires"
            )
            return conn["implementation"], conn["affiliationId"], issuer
    return None, None, None


# ── Payment validation constants ─────────────────────────────────────────────

# Maps short connector key (lowercase) → canonical short name
CONNECTOR_ALIASES: dict[str, str] = {
    "paymentprovider_paywaypartnerar-payway-v0": "payway",
}

VALID_CONNECTORS = {"payway", "promissory"}
REQUIRED_FIRMAS = {"2": "Visa", "4": "Mastercard"}

_L1 = frozenset({"electron", "business", "corporate t", "premier", "purchasing"})
_LC = frozenset({"classic", "gold", "gold/prem", "platinum", "black", "signature"})

CUOTA_CONFIGS: list[tuple[str, frozenset, frozenset]] = [
    ("Tarjetas en 1 pago",    _L1, frozenset({1})),
    ("Tarjetas en 6 cuotas",  _LC, frozenset({1, 3, 6})),
    ("Tarjetas en 9 cuotas",  _LC, frozenset({1, 3, 6, 9})),
    ("Tarjetas en 12 cuotas", _LC, frozenset({1, 3, 6, 9, 12})),
    ("Tarjetas en 18 cuotas", _LC, frozenset({1, 3, 6, 9, 12, 18})),
    ("Tarjetas en 24 cuotas", _LC, frozenset({1, 3, 6, 9, 12, 18, 24})),
]


def _parse_connector_short(impl: str) -> str:
    if not impl:
        return ""
    parts = impl.split(".")
    name = parts[-1].replace("Connector", "") if parts else impl
    return name.strip()


def _normalize_connector(conn: str) -> str:
    if not conn:
        return conn
    return CONNECTOR_ALIASES.get(conn.lower().strip(), conn.lower().strip())


def _is_vigente(begin_date: str | None, end_date: str | None) -> str:
    hoy = datetime.now(timezone.utc).date()
    try:
        inicio = datetime.fromisoformat(
            begin_date.replace("Z", "+00:00")
        ).date() if begin_date else None
        fin = datetime.fromisoformat(
            end_date.replace("Z", "+00:00")
        ).date() if end_date else None
        if inicio and hoy < inicio:
            return "No (no comenzó)"
        if fin and hoy > fin:
            return "No (vencida)"
        return "Sí"
    except Exception:
        return "Sin fecha"


def parse_rule_enriched(seller_id: str, seller_name: str, rule: dict) -> dict:
    """
    Convierte una regla VTEX raw en un dict enriquecido con todos los campos
    necesarios para validación y exportación. Fiel al parse_rule del script v3.5.
    """
    installment_opts = rule.get("installmentOptions") or {}
    installments = installment_opts.get("installments") or []
    quantities = sorted([i.get("quantity", 0) for i in installments if i.get("quantity")])
    max_cuotas = max(quantities) if quantities else None
    cuotas_lista = ",".join(str(q) for q in quantities) if quantities else None
    tiene_interes = any(
        (i.get("interestRate") or 0) > 0 or (i.get("interestTax") or 0) > 0
        for i in installments
    )
    canales = rule.get("salesChannels") or []
    sc_ids = ",".join(str(sc.get("id", "")) for sc in canales)
    impl = (rule.get("connector") or {}).get("implementation") or ""
    begin_date = rule.get("beginDate") or ""
    end_date = rule.get("endDate") or ""

    return {
        "vendedor":               seller_name,
        "cuenta":                 seller_id,
        "id_regla":               str(rule.get("id", "")),
        "nombre_regla":           rule.get("name", ""),
        "id_sistema_pago":        str((rule.get("paymentSystem") or {}).get("id", "")),
        "sistema_pago":           (rule.get("paymentSystem") or {}).get("name", "") or "",
        "nivel_tarjeta":          (rule.get("cardLevel") or {}).get("name", "") or "",
        "cobrand":                (rule.get("cobrand") or {}).get("name", "") or "",
        "emisor":                 (rule.get("issuer") or {}).get("name", "") or "",
        "conector":               _normalize_connector(_parse_connector_short(impl)),
        "conector_completo":      impl,
        "id_afiliacion":          (rule.get("connector") or {}).get("affiliationId", "") or "",
        "habilitada":             "Sí" if rule.get("enabled") else "No",
        "es_default":             str(rule.get("isDefault", "")),
        "vigente_hoy":            _is_vigente(begin_date or None, end_date or None),
        "max_cuotas":             max_cuotas,
        "cuotas_disponibles":     cuotas_lista,
        "tiene_interes":          "Sí" if tiene_interes else "No",
        "valor_minimo_cuota":     str(installment_opts.get("minimumInstallmentValue", "") or ""),
        "fecha_inicio":           begin_date,
        "fecha_fin":              end_date,
        "es_self_autorizado":     str(rule.get("isSelfAuthorized", "")),
        "requiere_autenticacion": str(rule.get("requiresAuthentication", "")),
        "servicio_cuotas":        str(rule.get("installmentsService", "")),
        "interes_externo":        str(rule.get("externalInterest", "")),
        "valor_minimo":           str(rule.get("minimumValue", "") or ""),
        "canales_venta":          sc_ids,
        "pais":                   (rule.get("country") or {}).get("isoCode", "") or "",
    }


def _parse_cuotas_set_str(s: str | None) -> frozenset:
    if not s or str(s).strip() in ("", "None"):
        return frozenset()
    try:
        return frozenset(int(x.strip()) for x in str(s).split(",") if x.strip().isdigit())
    except Exception:
        return frozenset()


def _is_interes_externo_val(v) -> bool:
    if v is None:
        return False
    return str(v).strip().lower() not in ("", "none", "false", "0")


def _valor_min_invalido_val(v) -> bool:
    s = str(v).strip()
    if s in ("", "none", "nan"):
        return False
    try:
        return float(s) != 1.0
    except ValueError:
        return True


def check_cuota_group(
    rules: list[dict],
    target_levels: frozenset,
    expected: frozenset,
    col_name: str,
) -> tuple[str, list[str]]:
    """
    Evalúa el estado del grupo de cuotas para un seller.
    Recibe la lista COMPLETA de reglas enriquecidas del seller.
    Retorna (estado, motivos).
    Fiel a check_cuota_group del script v3.5.
    """
    group = [
        r for r in rules
        if r.get("nivel_tarjeta", "").lower().strip() in target_levels
        and r.get("nivel_tarjeta", "").strip() != ""
    ]
    if not group:
        return "No configurado", []

    for r in group:
        r["_cuotas"] = _parse_cuotas_set_str(r.get("cuotas_disponibles"))

    any_with_expected = [r for r in group if r["_cuotas"] == expected]
    if not any_with_expected:
        return "No configurado", []

    hab = [r for r in group if r.get("habilitada") == "Sí"]
    for r in hab:
        if "_cuotas" not in r:
            r["_cuotas"] = _parse_cuotas_set_str(r.get("cuotas_disponibles"))
    matching = [r for r in hab if r["_cuotas"] == expected]

    motivos: list[str] = []
    tl = set(target_levels)

    if not matching:
        disabled_with_expected = [r for r in any_with_expected if r.get("habilitada") == "No"]
        if disabled_with_expected:
            check_base = disabled_with_expected
        else:
            found_cuotas: list[int] = sorted({
                int(c) for r in hab
                for c in (r.get("cuotas_disponibles") or "").split(",")
                if c.strip().isdigit()
            })
            motivos.append(
                f"cuotas incorrectas — encontradas: {found_cuotas}, esperadas: {sorted(expected)}"
            )
            check_base = hab if hab else group
    else:
        check_base = matching

    # Check 2: firmas obligatorias Visa (id=2) + Mastercard (id=4)
    for firma_id, firma_name in REQUIRED_FIRMAS.items():
        firma_rules = [
            r for r in check_base
            if str(r.get("id_sistema_pago", "")).strip() == firma_id
        ]
        if not firma_rules:
            motivos.append(f"falta firma {firma_name} (id {firma_id})")
        else:
            covered = {r.get("nivel_tarjeta", "").lower().strip() for r in firma_rules}
            missing = tl - covered
            if missing:
                motivos.append(f"{firma_name}: levels faltantes: {sorted(missing)}")

    # Check 3: conector válido
    bad_conn = [
        r for r in check_base
        if r.get("conector", "").lower().strip() not in VALID_CONNECTORS
    ]
    if bad_conn:
        bad_names = sorted({r.get("conector", "") for r in bad_conn if r.get("conector")})
        motivos.append(f"conector inválido: {bad_names if bad_names else ['(vacío)']}")

    # Check 4: interes_externo = False
    bad_int = [r for r in check_base if _is_interes_externo_val(r.get("interes_externo"))]
    if bad_int:
        motivos.append("interes_externo debe ser False")

    # Check 5: valor_minimo_cuota = 1
    bad_min = [r for r in check_base if _valor_min_invalido_val(r.get("valor_minimo_cuota"))]
    if bad_min:
        vals = sorted({str(r.get("valor_minimo_cuota", "")) for r in bad_min if r.get("valor_minimo_cuota")})
        motivos.append(f"valor_minimo_cuota debe ser 1 (encontrado: {vals})")

    if motivos:
        return "A corregir", [f"[{col_name}] {m}" for m in motivos]

    vigencia_base = matching if matching else check_base
    vigencias = {r.get("vigente_hoy") for r in vigencia_base}
    if "Sí" in vigencias:
        return "Ok (vigente)", []
    if "No (no comenzó)" in vigencias:
        return "Ok (programado)", []
    return "Ok (inactiva)", []


def build_seller_dashboard(
    seller_id: str, seller_name: str, rules_enriched: list[dict]
) -> SellerDashboard:
    """
    Construye el dashboard de validación para un seller a partir de sus reglas enriquecidas.
    Fiel a build_dashboard del script v3.5.
    """
    active = [r for r in rules_enriched if r.get("habilitada") == "Sí"]
    activas = len(active)
    inactivas = len(rules_enriched) - activas
    vigentes = sum(1 for r in rules_enriched if r.get("vigente_hoy") == "Sí")

    sistemas = sorted({r["sistema_pago"] for r in rules_enriched if r.get("sistema_pago")})
    conectores = sorted({r["conector"] for r in rules_enriched if r.get("conector")})
    emisores = sorted({r["emisor"] for r in rules_enriched if r.get("emisor")})

    vigentes_active = [r for r in active if r.get("vigente_hoy") == "Sí"]
    max_c_vals = [r["max_cuotas"] for r in vigentes_active if r.get("max_cuotas") is not None]
    max_cuotas_activas = int(max(max_c_vals)) if max_c_vals else 0

    # Work on copies to avoid mutating the enriched dicts (check_cuota_group adds _cuotas key)
    rules_copy = [dict(r) for r in rules_enriched]

    grupos: dict[str, GrupoDashboard] = {}
    all_motivos: list[str] = []
    for col_name, target_levels, expected in CUOTA_CONFIGS:
        estado, motivos = check_cuota_group(rules_copy, target_levels, expected, col_name)
        grupos[col_name] = GrupoDashboard(estado=estado, motivos=motivos)
        all_motivos.extend(motivos)

    return SellerDashboard(
        seller_id=seller_id,
        seller_name=seller_name,
        totales=len(rules_enriched),
        activas=activas,
        inactivas=inactivas,
        vigentes_hoy=vigentes,
        firmas=sistemas,
        max_cuotas_activas=max_cuotas_activas,
        conectores=conectores,
        emisores=emisores,
        grupos=grupos,
        motivos_all=" | ".join(all_motivos),
    )


# ── Core filter ───────────────────────────────────────────────────────────────

def matches_filters(rule: dict, filtros: FiltrosRequest) -> bool:  # noqa: C901
    """
    Migración directa de matches_filters del script v6.
    Preserva: normalización AR, exclusión por fecha nula, modes include/exclude.
    """
    # ── estado ─────────────────────────────────────────────────────────────
    if filtros.estado != "todos":
        rule_enabled = rule.get("enabled", rule.get("status") in ("Active", "active", True))
        if isinstance(rule_enabled, str):
            rule_enabled = rule_enabled.lower() in ("active", "true", "1", "enabled")
        want_active = filtros.estado == "activo"
        if bool(rule_enabled) != want_active:
            return False

    # ── nombre ─────────────────────────────────────────────────────────────
    if filtros.nombre:
        if filtros.nombre.lower() not in (rule.get("name") or "").lower():
            return False

    # ── connector ──────────────────────────────────────────────────────────
    if filtros.connector:
        conn_impl = ((rule.get("connector") or {}).get("implementation") or "").lower()
        if filtros.connector.lower() not in conn_impl:
            return False

    # ── brands — match por paymentSystem.id (alineado con script v6) ───────
    if filtros.brands:
        ps_id = (rule.get("paymentSystem") or {}).get("id")
        ids = [
            PAYMENT_SYSTEMS_MAP[b.lower()]["id"]
            for b in filtros.brands
            if b.lower() in PAYMENT_SYSTEMS_MAP
        ]
        if ps_id not in ids:
            return False

    # ── levels — match por cardLevel.name (string, alineado con script v6) ─
    if filtros.levels:
        card_level = rule.get("cardLevel")
        rule_lv = (card_level.get("name") or "").strip().lower() if isinstance(card_level, dict) else ""
        in_list = rule_lv in {lv.strip().lower() for lv in filtros.levels}
        if filtros.levels_mode == "include" and not in_list:
            return False
        if filtros.levels_mode == "exclude" and in_list:
            return False

    # ── cuotas — usa installmentOptions.installments[].quantity ───────────
    if filtros.cuotas:
        inst_opts = rule.get("installmentOptions") or {}
        inst_list = inst_opts.get("installments") or []
        if inst_list:
            rule_set = {
                int(i["quantity"])
                for i in inst_list
                if isinstance(i, dict) and i.get("quantity") is not None
            }
        else:
            raw = rule.get("installments")
            if isinstance(raw, list):
                rule_set = {int(i["count"]) if isinstance(i, dict) else int(i) for i in raw if i is not None}
            elif raw is not None:
                rule_set = {int(raw)}
            else:
                rule_set = set()

        filtro_set = set(filtros.cuotas)
        if filtros.cuotas_mode == "exacta":
            if rule_set != filtro_set:
                return False
        else:  # contiene
            if not (rule_set & filtro_set):
                return False

    # ── fechas ─────────────────────────────────────────────────────────────
    date_filter_active = filtros.fecha_mode != "todos"

    if filtros.fecha_mode == "sin_fecha":
        if rule.get("beginDate") or rule.get("endDate"):
            return False
        return True

    if date_filter_active:
        rule_begin = _normalize_to_ar(rule.get("beginDate"))
        rule_end = _normalize_to_ar(rule.get("endDate"))

        if rule_begin is None and rule_end is None:
            return False

        if filtros.fecha_mode == "entre":
            ini = _parse_date(filtros.fecha_ini_date) or _normalize_to_ar(filtros.fecha_ini)
            fin = _parse_date(filtros.fecha_fin_date) or _normalize_to_ar(filtros.fecha_fin)
            if ini and rule_end and rule_end < ini:
                return False
            if fin and rule_begin and rule_begin > fin:
                return False

    # ── horarios ───────────────────────────────────────────────────────────
    if filtros.horario_ini:
        t_filter = _parse_time(filtros.horario_ini)
        t_rule = _rule_time(rule, "beginTime")
        if not _compare_time(t_rule, t_filter, filtros.horario_ini_mode):
            return False

    if filtros.horario_fin:
        t_filter = _parse_time(filtros.horario_fin)
        t_rule = _rule_time(rule, "endTime")
        if not _compare_time(t_rule, t_filter, filtros.horario_fin_mode):
            return False

    return True


# ── Fetch ─────────────────────────────────────────────────────────────────────

async def fetch_seller_rules(
    seller: Seller, app_key: str, app_token: str
) -> dict:
    try:
        rules = await vtex_client.get_rules(seller.seller_id, app_key, app_token)
        return {"seller": seller, "rules": rules, "error": None}
    except Exception as e:
        logger.error("fetch_seller_rules %s: %s", seller.seller_id, e)
        return {"seller": seller, "rules": [], "error": str(e)}


async def fetch_all_sellers_parallel(
    sellers_creds: list[tuple[Seller, str, str]],
    max_concurrent: int = 8,
) -> list[dict]:
    sem = asyncio.Semaphore(max_concurrent)

    async def _one(entry):
        seller, app_key, app_token = entry
        async with sem:
            return await fetch_seller_rules(seller, app_key, app_token)

    return list(await asyncio.gather(*[_one(e) for e in sellers_creds]))


# ── Filter + build rows ────────────────────────────────────────────────────────

def _rule_brands(rule: dict) -> str:
    ps = rule.get("paymentSystem")
    if isinstance(ps, dict) and ps.get("name"):
        return ps["name"]
    brands = rule.get("brands") or []
    return ", ".join(str(b) for b in brands)


def _rule_level(rule: dict) -> str:
    cl = rule.get("cardLevel")
    if isinstance(cl, dict) and cl.get("name"):
        return cl["name"]
    level = rule.get("level") or rule.get("paymentSystemLevel")
    return str(level) if level is not None else ""


def _rule_estado(rule: dict) -> str:
    enabled = rule.get("enabled", rule.get("status"))
    if isinstance(enabled, bool):
        return "activo" if enabled else "inactivo"
    if isinstance(enabled, str):
        return "activo" if enabled.lower() in ("active", "true", "enabled") else "inactivo"
    return "desconocido"


def build_matched_rules(
    seller_data: dict, filtros: FiltrosRequest
) -> list[dict]:
    seller = seller_data["seller"]
    matched = []
    for rule in seller_data.get("rules", []):
        if matches_filters(rule, filtros):
            matched.append({"seller": seller, "rule": rule})
    return matched


# ── Execute operations ─────────────────────────────────────────────────────────

def execute_read(matched: list[dict]) -> list[CrudRowOut]:
    rows = []
    for m in matched:
        s = m["seller"]
        r = m["rule"]
        enriched = parse_rule_enriched(s.seller_id, s.seller_name, r)
        rows.append(CrudRowOut(
            seller_id=s.seller_id,
            rule_id=enriched["id_regla"],
            rule_name=enriched["nombre_regla"],
            brand=enriched["sistema_pago"],
            level=enriched["nivel_tarjeta"],
            estado="activo" if r.get("enabled") else "inactivo",
            detalle=(
                f"vigente: {enriched['vigente_hoy']} | "
                f"cuotas: {enriched['cuotas_disponibles'] or '-'} | "
                f"conector: {enriched['conector'] or '-'}"
            ),
        ))
    return rows


async def execute_create(
    sellers_creds: list[tuple[Seller, str, str]],
    accion: AcreateRequest,
    dry_run: bool,
    raw_data: list[dict] | None = None,
) -> list[CrudRowOut]:
    rows = []

    # Build connector lookup from pre-fetched rules (seller_id → connector tuple)
    connector_map: dict[str, tuple[str, str, str]] = {}
    if raw_data:
        for sd in raw_data:
            sid = sd["seller"].seller_id
            conn_impl, aff_id, issuer = _extract_connector(sd.get("rules") or [])
            if conn_impl:
                connector_map[sid] = (conn_impl, aff_id, issuer)
            else:
                logger.warning("execute_create [%s]: no se encontró connector en las reglas existentes", sid)

    # Build all brand × level combinations
    combinations = []
    for ps_key in accion.ps_names:
        ps = PAYMENT_SYSTEMS_MAP.get(ps_key.lower())
        if not ps:
            logger.warning("execute_create: brand desconocida '%s', ignorada", ps_key)
            continue
        for level in accion.levels:
            level_prefix = level.upper().replace("/", "_").replace(" ", "_")
            ps_prefix = ps_key.upper()
            max_c = max(accion.cuotas) if accion.cuotas else 0
            if accion.rule_name_prefix:
                rule_name = (
                    f"{accion.rule_name_prefix}_{ps_prefix}_{level_prefix}_{max_c}"
                    if max_c else
                    f"{accion.rule_name_prefix}_{ps_prefix}_{level_prefix}"
                )
            else:
                rule_name = f"{ps_prefix}_{level_prefix}_{max_c}" if max_c else f"{ps_prefix}_{level_prefix}"
            combinations.append((ps, level, rule_name))

    installments = _build_installments(accion.cuotas) if accion.cuotas else []

    for seller, app_key, app_token in sellers_creds:
        conn_tuple = connector_map.get(seller.seller_id)
        conn_impl, aff_id, issuer = conn_tuple if conn_tuple else (None, None, None)

        if not dry_run and not conn_impl:
            for ps, level, rule_name in combinations:
                rows.append(CrudRowOut(
                    seller_id=seller.seller_id,
                    rule_id=None,
                    rule_name=rule_name,
                    brand=ps["name"],
                    level=level,
                    estado=None,
                    detalle="error: no se encontró connector en las reglas existentes del seller",
                ))
            continue

        for ps, level, rule_name in combinations:
            if dry_run:
                rows.append(CrudRowOut(
                    seller_id=seller.seller_id,
                    rule_id=None,
                    rule_name=rule_name,
                    brand=ps["name"],
                    level=level,
                    estado="activo" if accion.enabled else "inactivo",
                    detalle="dry_run — no ejecutado",
                ))
                continue

            body = {
                "name": rule_name,
                "salesChannels": [{"Id": 1, "Name": "Main", "IsActive": True}],
                "paymentSystem": {"id": ps["id"], "name": ps["name"], "implementation": None},
                "connector": {"implementation": conn_impl, "affiliationId": aff_id},
                "issuer": {"name": issuer},
                "antifraud": None,
                "installmentOptions": {
                    "dueDateType": 0,
                    "interestRateMethod": 0,
                    "minimumInstallmentValue": 1.0,
                    "installments": installments,
                } if installments else None,
                "enabled": accion.enabled,
                "installmentsService": False,
                "condition": None,
                "multiMerchantList": None,
                "country": {"isoCode": "ar", "name": None},
                "beginDate": accion.begin_date or None,
                "endDate": accion.end_date or None,
                "dateIntervals": None,
                "externalInterest": False,
                "minimumValue": None,
                "deadlines": [],
                "cobrand": {"name": None},
                "cardLevel": {"name": level},
            }

            try:
                created = await vtex_client.create_rule(seller.seller_id, app_key, app_token, body)
                rows.append(CrudRowOut(
                    seller_id=seller.seller_id,
                    rule_id=str(created.get("id", "")),
                    rule_name=rule_name,
                    brand=ps["name"],
                    level=level,
                    estado="activo" if accion.enabled else "inactivo",
                    detalle="creado",
                ))
            except Exception as e:
                rows.append(CrudRowOut(
                    seller_id=seller.seller_id,
                    rule_id=None,
                    rule_name=rule_name,
                    brand=ps["name"],
                    level=level,
                    estado=None,
                    detalle=f"error: {e}",
                ))
    return rows


async def execute_update(
    matched: list[dict],
    cambios: UpdateRequest,
    dry_run: bool,
) -> list[CrudRowOut]:
    rows = []

    patch = {}
    if cambios.begin_date: patch["begin_date"] = cambios.begin_date
    if cambios.end_date: patch["end_date"] = cambios.end_date
    if cambios.cuotas: patch["cuotas"] = cambios.cuotas
    if cambios.level: patch["level"] = cambios.level
    if cambios.enabled is not None: patch["enabled"] = cambios.enabled

    for m in matched:
        seller = m["seller"]
        rule = m["rule"]
        rule_id = rule.get("id")
        if rule_id is None:
            continue

        if dry_run:
            rows.append(CrudRowOut(
                seller_id=seller.seller_id,
                rule_id=str(rule_id),
                rule_name=rule.get("name"),
                brand=_rule_brands(rule),
                level=_rule_level(rule),
                estado=_rule_estado(rule),
                detalle=f"dry_run — cambios: {list(patch.keys())}",
            ))
        else:
            try:
                app_key, app_token = get_decrypted_credentials(seller)
                updated_body = {**rule}

                if "begin_date" in patch:
                    updated_body["beginDate"] = patch["begin_date"]
                if "end_date" in patch:
                    updated_body["endDate"] = patch["end_date"]
                if "enabled" in patch:
                    updated_body["enabled"] = patch["enabled"]
                if "cuotas" in patch:
                    inst = _build_installments(patch["cuotas"])
                    if updated_body.get("installmentOptions"):
                        updated_body["installmentOptions"]["installments"] = inst
                    else:
                        updated_body["installmentOptions"] = {
                            "dueDateType": 0,
                            "interestRateMethod": 0,
                            "minimumInstallmentValue": 1.0,
                            "installments": inst,
                        }
                if "level" in patch:
                    updated_body["cardLevel"] = {"name": patch["level"]} if patch["level"] else None

                await vtex_client.update_rule(
                    seller.seller_id, app_key, app_token, rule_id, updated_body
                )
                rows.append(CrudRowOut(
                    seller_id=seller.seller_id,
                    rule_id=str(rule_id),
                    rule_name=rule.get("name"),
                    brand=_rule_brands(rule),
                    level=_rule_level(rule),
                    estado=_rule_estado(rule),
                    detalle=f"actualizado: {list(patch.keys())}",
                ))
            except Exception as e:
                rows.append(CrudRowOut(
                    seller_id=seller.seller_id,
                    rule_id=str(rule_id),
                    rule_name=rule.get("name"),
                    brand=_rule_brands(rule),
                    level=None,
                    estado=None,
                    detalle=f"error: {e}",
                ))
    return rows


async def execute_delete(matched: list[dict], dry_run: bool) -> list[CrudRowOut]:
    rows = []
    for m in matched:
        seller = m["seller"]
        rule = m["rule"]
        rule_id = rule.get("id")
        if rule_id is None:
            continue

        if dry_run:
            rows.append(CrudRowOut(
                seller_id=seller.seller_id,
                rule_id=str(rule_id),
                rule_name=rule.get("name"),
                brand=_rule_brands(rule),
                level=_rule_level(rule),
                estado=_rule_estado(rule),
                detalle="dry_run — no eliminado",
            ))
        else:
            try:
                app_key, app_token = get_decrypted_credentials(seller)
                await vtex_client.delete_rule(
                    seller.seller_id, app_key, app_token, rule_id
                )
                rows.append(CrudRowOut(
                    seller_id=seller.seller_id,
                    rule_id=str(rule_id),
                    rule_name=rule.get("name"),
                    brand=_rule_brands(rule),
                    level=_rule_level(rule),
                    estado="eliminado",
                    detalle="eliminado",
                ))
            except Exception as e:
                rows.append(CrudRowOut(
                    seller_id=seller.seller_id,
                    rule_id=str(rule_id),
                    rule_name=rule.get("name"),
                    brand=_rule_brands(rule),
                    level=None,
                    estado=None,
                    detalle=f"error: {e}",
                ))
    return rows


# ── Persistence ───────────────────────────────────────────────────────────────

async def save_operation_log(
    db: AsyncSession,
    user_id: uuid.UUID,
    request: CrudRequest,
    rows: list[CrudRowOut],
    duration: float,
    sellers_scope: list[str],
    started_at: datetime,
) -> CrudOperation:
    success = sum(1 for r in rows if r.detalle and "error" not in r.detalle.lower())
    errors = sum(1 for r in rows if r.detalle and "error" in r.detalle.lower())

    op = CrudOperation(
        user_id=user_id,
        operacion=request.operacion,
        dry_run=request.dry_run,
        sellers_scope=sellers_scope,
        filtros_usados=request.filtros.model_dump(),
        total_matched=len(rows),
        total_success=success,
        total_errors=errors,
        duration_secs=round(duration, 3),
        started_at=started_at,
        finished_at=datetime.now(timezone.utc),
    )
    db.add(op)
    await db.flush()

    for row in rows:
        db.add(CrudOperationRow(
            operation_id=op.id,
            seller_id=row.seller_id,
            rule_id=row.rule_id,
            rule_name=row.rule_name,
            brand=row.brand,
            level=row.level,
            estado=row.estado,
            detalle=row.detalle,
        ))

    await db.commit()
    await db.refresh(op)
    return op


# ── Orchestrator ──────────────────────────────────────────────────────────────

async def get_active_sellers(
    db: AsyncSession, seller_ids: list[str] | None = None
) -> list[Seller]:
    q = select(Seller).where(
        Seller.is_active.is_(True),
        Seller.estado_keys == EstadoKeys.activo,
    )
    if seller_ids:
        q = q.where(Seller.seller_id.in_(seller_ids))
    result = await db.execute(q)
    return list(result.scalars().all())


async def run_crud_operation(
    db: AsyncSession,
    user_id: uuid.UUID,
    request: CrudRequest,
) -> CrudResponse:
    started_at = datetime.now(timezone.utc)

    # 1. Resolve sellers
    scope_ids = request.scope.seller_ids or []
    sellers = await get_active_sellers(db, scope_ids if scope_ids else None)
    sellers_scope = [s.seller_id for s in sellers]

    # 2. Decrypt credentials
    sellers_creds: list[tuple[Seller, str, str]] = []
    for s in sellers:
        if s.app_key_enc and s.app_token_enc:
            app_key, app_token = get_decrypted_credentials(s)
            sellers_creds.append((s, app_key, app_token))

    rows: list[CrudRowOut] = []
    dashboards: list[SellerDashboard] = []

    if request.operacion == "R":
        raw_data = await fetch_all_sellers_parallel(sellers_creds)
        for sd in raw_data:
            seller = sd["seller"]
            if sd["error"]:
                rows.append(CrudRowOut(
                    seller_id=seller.seller_id,
                    rule_id=None, rule_name=None, brand=None, level=None,
                    estado="error",
                    detalle=sd["error"],
                ))
                continue
            # Dashboard from ALL rules (unfiltered) for accurate validation
            all_enriched = [
                parse_rule_enriched(seller.seller_id, seller.seller_name, r)
                for r in sd.get("rules", [])
            ]
            if all_enriched:
                dashboards.append(
                    build_seller_dashboard(seller.seller_id, seller.seller_name, all_enriched)
                )
            # Rows from filtered rules only
            matched = build_matched_rules(sd, request.filtros)
            rows.extend(execute_read(matched))

    elif request.operacion == "C":
        if not request.accion_create:
            raise ValueError("accion_create es requerido para operacion C")
        raw_data = await fetch_all_sellers_parallel(sellers_creds)
        rows = await execute_create(sellers_creds, request.accion_create, request.dry_run, raw_data)

    elif request.operacion == "U":
        if not request.accion_update:
            raise ValueError("accion_update es requerido para operacion U")
        raw_data = await fetch_all_sellers_parallel(sellers_creds)
        all_matched = []
        for sd in raw_data:
            if not sd["error"]:
                all_matched.extend(build_matched_rules(sd, request.filtros))
        rows = await execute_update(all_matched, request.accion_update, request.dry_run)

    elif request.operacion == "D":
        raw_data = await fetch_all_sellers_parallel(sellers_creds)
        all_matched = []
        for sd in raw_data:
            if not sd["error"]:
                all_matched.extend(build_matched_rules(sd, request.filtros))
        rows = await execute_delete(all_matched, request.dry_run)

    duration = (datetime.now(timezone.utc) - started_at).total_seconds()

    # 3. Persist
    op = await save_operation_log(
        db, user_id, request, rows, duration, sellers_scope, started_at
    )

    success = sum(1 for r in rows if r.detalle and "error" not in r.detalle.lower())
    errors = len(rows) - success

    return CrudResponse(
        operation_id=op.id,
        operacion=request.operacion,
        dry_run=request.dry_run,
        total_sellers=len(sellers),
        total_matched=len(rows),
        total_success=success,
        total_errors=errors,
        duration_secs=round(duration, 3),
        rows=rows,
        dashboard=dashboards,
    )


async def fetch_enriched_for_export(
    db: AsyncSession,
    scope_ids: list[str] | None,
) -> tuple[list[dict], list[SellerDashboard], list[dict]]:
    """
    Devuelve (all_enriched_rows, dashboards, error_rows) para generación de Excel.
    Todas las reglas sin filtrar — export siempre es panorama completo.
    """
    sellers = await get_active_sellers(db, scope_ids if scope_ids else None)

    sellers_creds: list[tuple] = []
    for s in sellers:
        if s.app_key_enc and s.app_token_enc:
            app_key, app_token = get_decrypted_credentials(s)
            sellers_creds.append((s, app_key, app_token))

    raw_data = await fetch_all_sellers_parallel(sellers_creds)

    all_enriched: list[dict] = []
    dashboards: list[SellerDashboard] = []
    error_rows: list[dict] = []

    for sd in raw_data:
        seller = sd["seller"]
        if sd["error"]:
            error_rows.append({
                "vendedor": seller.seller_name,
                "cuenta":   seller.seller_id,
                "error":    sd["error"],
                "fecha":    datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
            })
            continue
        enriched = [
            parse_rule_enriched(seller.seller_id, seller.seller_name, r)
            for r in sd.get("rules", [])
        ]
        all_enriched.extend(enriched)
        if enriched:
            dashboards.append(
                build_seller_dashboard(seller.seller_id, seller.seller_name, enriched)
            )

    return all_enriched, dashboards, error_rows


async def run_evento_validation(
    db: AsyncSession,
    request: EventoValidateRequest,
) -> EventoValidateResponse:
    """
    Valida que cada seller tenga reglas configuradas correctamente para el evento:
    - Cuotas exactas = cuotas_requeridas
    - Habilitadas
    - Rango de fechas cubre el evento (beginDate <= ini, endDate >= fin)
    - Conector válido (payway | promissory)
    - Visa (id=2) + Mastercard (id=4) presentes por level
    """
    started_at = datetime.now(timezone.utc)

    scope_ids = request.scope.seller_ids or []
    sellers = await get_active_sellers(db, scope_ids if scope_ids else None)

    sellers_creds: list[tuple] = []
    for s in sellers:
        if s.app_key_enc and s.app_token_enc:
            app_key, app_token = get_decrypted_credentials(s)
            sellers_creds.append((s, app_key, app_token))

    raw_data = await fetch_all_sellers_parallel(sellers_creds)

    evento = request.evento
    expected = frozenset(evento.cuotas_requeridas)

    # Parse event dates (ART = UTC-3)
    def _parse_art(dt_str: str | None) -> datetime | None:
        if not dt_str:
            return None
        try:
            dt = datetime.fromisoformat(dt_str)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=AR_TZ)
            return dt
        except Exception:
            return None

    event_ini = _parse_art(evento.fecha_ini_art)
    event_fin = _parse_art(evento.fecha_fin_art)

    results: list[SellerEventoResult] = []
    sellers_ok = 0
    sellers_a_corregir = 0
    sellers_no_config = 0

    for sd in raw_data:
        seller = sd["seller"]
        if sd["error"]:
            results.append(SellerEventoResult(
                seller_id=seller.seller_id,
                seller_name=seller.seller_name,
                estado_general="Error",
                motivos=[sd["error"]],
            ))
            sellers_a_corregir += 1
            continue

        rules = sd.get("rules", [])
        enriched = [parse_rule_enriched(seller.seller_id, seller.seller_name, r) for r in rules]

        # Find rules for _LC levels with the exact required cuotas
        lc_rules = [
            r for r in enriched
            if r.get("nivel_tarjeta", "").lower().strip() in _LC
        ]
        for r in lc_rules:
            r["_cuotas"] = _parse_cuotas_set_str(r.get("cuotas_disponibles"))

        matching = [r for r in lc_rules if r["_cuotas"] == expected and r.get("habilitada") == "Sí"]

        if not matching:
            # Check if any exist at all (maybe disabled or wrong cuotas)
            any_with_cuotas = [r for r in lc_rules if r["_cuotas"] == expected]
            if not any_with_cuotas and not lc_rules:
                results.append(SellerEventoResult(
                    seller_id=seller.seller_id,
                    seller_name=seller.seller_name,
                    estado_general="No configurado",
                    motivos=["No hay reglas para levels _LC con las cuotas del evento"],
                ))
                sellers_no_config += 1
                continue
            motivos = [
                f"No hay reglas habilitadas con cuotas exactas {sorted(expected)} para levels _LC"
            ]
            if any_with_cuotas:
                motivos = ["Reglas con cuotas correctas pero deshabilitadas"]
            results.append(SellerEventoResult(
                seller_id=seller.seller_id,
                seller_name=seller.seller_name,
                estado_general="A corregir",
                motivos=motivos,
                total_rules_evento=len(any_with_cuotas),
            ))
            sellers_a_corregir += 1
            continue

        motivos: list[str] = []

        # Check connector
        bad_conn = [r for r in matching if r.get("conector", "").lower() not in VALID_CONNECTORS]
        if bad_conn:
            bad_names = sorted({r.get("conector", "") for r in bad_conn})
            motivos.append(f"Conector inválido: {bad_names}")

        # Check Visa + Mastercard
        for firma_id, firma_name in REQUIRED_FIRMAS.items():
            has_firma = any(str(r.get("id_sistema_pago", "")).strip() == firma_id for r in matching)
            if not has_firma:
                motivos.append(f"Falta firma {firma_name} (id {firma_id})")

        # Check date coverage
        if event_ini or event_fin:
            for r in matching:
                raw_r = next(
                    (rr for rr in rules if str(rr.get("id", "")) == r["id_regla"]),
                    None,
                )
                if not raw_r:
                    continue
                r_begin = _normalize_to_ar(raw_r.get("beginDate"))
                r_end = _normalize_to_ar(raw_r.get("endDate"))
                if event_ini and r_begin and r_begin > event_ini:
                    motivos.append(
                        f"Regla {r['id_regla'][:8]}: begin_date posterior al inicio del evento"
                    )
                if event_fin and r_end and r_end < event_fin:
                    motivos.append(
                        f"Regla {r['id_regla'][:8]}: end_date anterior al fin del evento"
                    )

        # Deduplicate motivos
        motivos = list(dict.fromkeys(motivos))

        if motivos:
            estado_general = "A corregir"
            sellers_a_corregir += 1
        else:
            estado_general = "Ok"
            sellers_ok += 1

        results.append(SellerEventoResult(
            seller_id=seller.seller_id,
            seller_name=seller.seller_name,
            estado_general=estado_general,
            motivos=motivos,
            total_rules_evento=len(matching),
        ))

    duration = (datetime.now(timezone.utc) - started_at).total_seconds()

    return EventoValidateResponse(
        evento_nombre=evento.nombre,
        total_sellers=len(sellers),
        sellers_ok=sellers_ok,
        sellers_a_corregir=sellers_a_corregir,
        sellers_no_configurado=sellers_no_config,
        duration_secs=round(duration, 3),
        results=results,
    )


async def cleanup_old_operations(db: AsyncSession) -> int:
    cutoff = datetime.now(timezone.utc) - timedelta(days=90)
    result = await db.execute(
        select(CrudOperation).where(CrudOperation.started_at < cutoff)
    )
    ops = list(result.scalars().all())
    for op in ops:
        await db.delete(op)
    if ops:
        await db.commit()
    logger.info("Cleanup: eliminadas %d operaciones con más de 90 días", len(ops))
    return len(ops)
