"""
CRUD Medios de Pago — service layer.
Migrado desde crud_medios_de_pago_v6.py con lógica de filtros y fechas preservada.
"""
import asyncio
import logging
import uuid
from datetime import datetime, time, timedelta, timezone

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
    FiltrosRequest,
    UpdateRequest,
)

logger = logging.getLogger(__name__)

# Argentina = UTC-3
AR_TZ = timezone(timedelta(hours=-3))


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
            # UTC — convertir a AR
            dt = datetime.fromisoformat(s.replace("Z", "+00:00"))
        elif "+" in s[10:] or (s.count("-") > 2):
            # Tiene offset explícito
            dt = datetime.fromisoformat(s)
        else:
            # Sin zona → tratar como hora local AR
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
    """Extrae hora de un campo de regla (beginTime/endTime)."""
    val = rule.get(field)
    if not val:
        return None
    return _parse_time(str(val))


def _compare_time(rule_t: time | None, filter_t: time | None, mode: str) -> bool:
    if filter_t is None:
        return True
    if rule_t is None:
        return False
    if mode == "gte":
        return rule_t >= filter_t
    if mode == "lte":
        return rule_t <= filter_t
    return rule_t == filter_t


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
        if filtros.connector.lower() not in (rule.get("connector") or "").lower():
            return False

    # ── brands ─────────────────────────────────────────────────────────────
    if filtros.brands:
        rule_brands = [b.lower() for b in (rule.get("brands") or [])]
        if not any(b.lower() in rule_brands for b in filtros.brands):
            return False

    # ── levels ─────────────────────────────────────────────────────────────
    if filtros.levels:
        rule_level = rule.get("level") or rule.get("paymentSystemLevel")
        try:
            rule_level = int(rule_level)
        except (TypeError, ValueError):
            rule_level = None
        in_list = rule_level in filtros.levels
        if filtros.levels_mode == "include" and not in_list:
            return False
        if filtros.levels_mode == "exclude" and in_list:
            return False

    # ── cuotas ─────────────────────────────────────────────────────────────
    if filtros.cuotas is not None:
        raw = rule.get("installments") or rule.get("numberOfInstallments")
        if raw is None:
            return False
        if isinstance(raw, list):
            # Lista de objetos {count, ...}
            counts = [
                int(i["count"]) if isinstance(i, dict) else int(i)
                for i in raw
                if i is not None
            ]
            if filtros.cuotas_mode == "exacta":
                if filtros.cuotas not in counts:
                    return False
            else:  # contiene
                if not any(filtros.cuotas == c for c in counts):
                    return False
        else:
            rule_cuotas = int(raw)
            if filtros.cuotas_mode == "exacta" and rule_cuotas != filtros.cuotas:
                return False
            if filtros.cuotas_mode == "contiene" and filtros.cuotas != rule_cuotas:
                return False

    # ── fechas ─────────────────────────────────────────────────────────────
    date_filter_active = filtros.fecha_mode != "todos"

    if filtros.fecha_mode == "sin_fecha":
        # Solo reglas SIN fecha
        if rule.get("beginDate") or rule.get("endDate"):
            return False
        return True

    if date_filter_active:
        rule_begin = _normalize_to_ar(rule.get("beginDate"))
        rule_end = _normalize_to_ar(rule.get("endDate"))

        # Regla sin fecha cuando hay filtro activo → EXCLUIR (lógica crítica del script)
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
    brands = rule.get("brands") or []
    return ", ".join(str(b) for b in brands) if brands else ""


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
        rows.append(CrudRowOut(
            seller_id=s.seller_id,
            rule_id=str(r.get("id", "")),
            rule_name=r.get("name"),
            brand=_rule_brands(r),
            level=str(r.get("level", "")),
            estado=_rule_estado(r),
            detalle="matched",
        ))
    return rows


async def execute_create(
    sellers_creds: list[tuple[Seller, str, str]],
    accion: AcreateRequest,
    dry_run: bool,
) -> list[CrudRowOut]:
    rows = []
    body = {
        "paymentSystem": accion.ps_name,
        "name": accion.rule_name,
        "level": accion.level,
        "installments": accion.cuotas,
        "enabled": accion.enabled,
    }
    if accion.begin_date:
        body["beginDate"] = accion.begin_date
    if accion.end_date:
        body["endDate"] = accion.end_date

    for seller, app_key, app_token in sellers_creds:
        if dry_run:
            rows.append(CrudRowOut(
                seller_id=seller.seller_id,
                rule_id=None,
                rule_name=accion.rule_name,
                brand=None,
                level=str(accion.level),
                estado="activo" if accion.enabled else "inactivo",
                detalle="dry_run — no ejecutado",
            ))
        else:
            try:
                created = await vtex_client.create_rule(
                    seller.seller_id, app_key, app_token, body
                )
                rows.append(CrudRowOut(
                    seller_id=seller.seller_id,
                    rule_id=str(created.get("id", "")),
                    rule_name=accion.rule_name,
                    brand=None,
                    level=str(accion.level),
                    estado="activo" if accion.enabled else "inactivo",
                    detalle="creado",
                ))
            except Exception as e:
                rows.append(CrudRowOut(
                    seller_id=seller.seller_id,
                    rule_id=None,
                    rule_name=accion.rule_name,
                    brand=None,
                    level=None,
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
    patch = {k: v for k, v in cambios.model_dump(exclude_none=True).items()}

    # Map schema fields to VTEX field names
    field_map = {
        "begin_date": "beginDate",
        "end_date": "endDate",
        "cuotas": "installments",
        "enabled": "enabled",
        "level": "level",
    }

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
                level=str(rule.get("level", "")),
                estado=_rule_estado(rule),
                detalle=f"dry_run — cambios: {patch}",
            ))
        else:
            try:
                updated_body = {**rule}
                for schema_field, vtex_field in field_map.items():
                    if schema_field in patch:
                        updated_body[vtex_field] = patch[schema_field]

                await vtex_client.update_rule(
                    seller.seller_id, seller.app_key_enc and "" or "",  # placeholder
                    "", rule_id, updated_body
                )
                rows.append(CrudRowOut(
                    seller_id=seller.seller_id,
                    rule_id=str(rule_id),
                    rule_name=rule.get("name"),
                    brand=_rule_brands(rule),
                    level=str(rule.get("level", "")),
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
                level=str(rule.get("level", "")),
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
                    level=str(rule.get("level", "")),
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
    await db.flush()  # get op.id

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

    if request.operacion == "R":
        # Fetch all + filter
        raw_data = await fetch_all_sellers_parallel(sellers_creds)
        for sd in raw_data:
            if sd["error"]:
                rows.append(CrudRowOut(
                    seller_id=sd["seller"].seller_id,
                    rule_id=None, rule_name=None, brand=None, level=None,
                    estado="error",
                    detalle=sd["error"],
                ))
                continue
            matched = build_matched_rules(sd, request.filtros)
            rows.extend(execute_read(matched))

    elif request.operacion == "C":
        if not request.accion_create:
            raise ValueError("accion_create es requerido para operacion C")
        rows = await execute_create(sellers_creds, request.accion_create, request.dry_run)

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
    )
