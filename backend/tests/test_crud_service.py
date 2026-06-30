"""
Tests unitarios para la lógica de filtros y validación de cuotas del CRUD.
No requieren BD ni conexión a VTEX.
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from datetime import datetime, timedelta, timezone
from app.modules.crud_medios.service import (
    _normalize_to_ar,
    matches_filters,
    check_cuota_group,
    AR_TZ,
    _LC,
)
from app.modules.crud_medios.schemas import FiltrosRequest


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def make_rule(**kwargs) -> dict:
    """Regla VTEX mínima con defaults razonables."""
    base = {
        "id": 1,
        "name": "Visa Classic 6c",
        "enabled": True,
        "paymentSystem": {"id": 2, "name": "Visa"},
        "cardLevel": {"name": "classic"},
        "connector": {"implementation": "vtex.paymentprovider.paywaypartnerar-payway-v0", "affiliationId": "abc"},
        "installmentOptions": {"installments": [
            {"quantity": 1}, {"quantity": 3}, {"quantity": 6}
        ]},
        "beginDate": None,
        "endDate": None,
        "beginTime": None,
        "endTime": None,
    }
    base.update(kwargs)
    return base


def make_enriched_rule(**kwargs) -> dict:
    """Regla enriquecida (formato parse_rule_enriched) para check_cuota_group."""
    base = {
        "nivel_tarjeta": "classic",
        "habilitada": "Sí",     # "Sí"
        "cuotas_disponibles": "1,3,6",
        "id_sistema_pago": "2",
        "conector": "payway",
        "interes_externo": "False",
        "valor_minimo_cuota": "1",
        "vigente_hoy": "Sí",
    }
    base.update(kwargs)
    return base


# ─────────────────────────────────────────────────────────────────────────────
# _normalize_to_ar
# ─────────────────────────────────────────────────────────────────────────────

class TestNormalizeToAr:
    def test_none_returns_none(self):
        assert _normalize_to_ar(None) is None

    def test_empty_string_returns_none(self):
        assert _normalize_to_ar("") is None

    def test_z_suffix_converts_utc_to_ar(self):
        # T03:00:00Z = 00:00:00 AR (UTC-3)
        result = _normalize_to_ar("2026-06-01T03:00:00Z")
        assert result is not None
        assert result.tzinfo is not None
        assert result.hour == 0
        assert result.minute == 0
        assert result.utcoffset() == timedelta(hours=-3)

    def test_no_tz_treated_as_ar(self):
        # Sin Z → se asume hora AR
        result = _normalize_to_ar("2026-06-01T00:00:00")
        assert result is not None
        assert result.hour == 0
        assert result.utcoffset() == timedelta(hours=-3)

    def test_midnight_utc_equals_21hs_ar(self):
        # T00:00:00Z = 21:00:00 AR del día anterior
        result = _normalize_to_ar("2026-06-01T00:00:00Z")
        assert result is not None
        assert result.hour == 21

    def test_invalid_string_returns_none(self):
        assert _normalize_to_ar("not-a-date") is None

    def test_explicit_offset_preserved(self):
        result = _normalize_to_ar("2026-06-01T00:00:00-03:00")
        assert result is not None
        assert result.hour == 0
        assert result.utcoffset() == timedelta(hours=-3)


# ─────────────────────────────────────────────────────────────────────────────
# matches_filters
# ─────────────────────────────────────────────────────────────────────────────

class TestMatchesFilters:
    def test_no_filters_matches_everything(self):
        rule = make_rule()
        filtros = FiltrosRequest()
        assert matches_filters(rule, filtros) is True

    def test_estado_activo_matches_enabled_rule(self):
        rule = make_rule(enabled=True)
        filtros = FiltrosRequest(estado="activo")
        assert matches_filters(rule, filtros) is True

    def test_estado_activo_rejects_disabled_rule(self):
        rule = make_rule(enabled=False)
        filtros = FiltrosRequest(estado="activo")
        assert matches_filters(rule, filtros) is False

    def test_estado_inactivo_matches_disabled_rule(self):
        rule = make_rule(enabled=False)
        filtros = FiltrosRequest(estado="inactivo")
        assert matches_filters(rule, filtros) is True

    def test_nombre_substring_match(self):
        rule = make_rule(name="Visa Classic 6 cuotas")
        filtros = FiltrosRequest(nombre="classic 6")
        assert matches_filters(rule, filtros) is True

    def test_nombre_no_match(self):
        rule = make_rule(name="Visa Classic 6 cuotas")
        filtros = FiltrosRequest(nombre="mastercard")
        assert matches_filters(rule, filtros) is False

    def test_brand_visa_matches(self):
        rule = make_rule(paymentSystem={"id": 2, "name": "Visa"})
        filtros = FiltrosRequest(brands=["Visa"])
        assert matches_filters(rule, filtros) is True

    def test_brand_mastercard_rejects_visa_rule(self):
        rule = make_rule(paymentSystem={"id": 2, "name": "Visa"})
        filtros = FiltrosRequest(brands=["Mastercard"])
        assert matches_filters(rule, filtros) is False

    def test_brand_multiple_matches_any(self):
        rule = make_rule(paymentSystem={"id": 4, "name": "Mastercard"})
        filtros = FiltrosRequest(brands=["Visa", "Mastercard"])
        assert matches_filters(rule, filtros) is True

    def test_level_include_match(self):
        rule = make_rule(cardLevel={"name": "classic"})
        filtros = FiltrosRequest(levels=["classic"], levels_mode="include")
        assert matches_filters(rule, filtros) is True

    def test_level_include_no_match(self):
        rule = make_rule(cardLevel={"name": "gold"})
        filtros = FiltrosRequest(levels=["classic"], levels_mode="include")
        assert matches_filters(rule, filtros) is False

    def test_level_exclude_removes_matching(self):
        rule = make_rule(cardLevel={"name": "classic"})
        filtros = FiltrosRequest(levels=["classic"], levels_mode="exclude")
        assert matches_filters(rule, filtros) is False

    def test_level_exclude_keeps_non_matching(self):
        rule = make_rule(cardLevel={"name": "gold"})
        filtros = FiltrosRequest(levels=["classic"], levels_mode="exclude")
        assert matches_filters(rule, filtros) is True

    def test_cuotas_exacta_match(self):
        rule = make_rule(installmentOptions={"installments": [
            {"quantity": 1}, {"quantity": 3}, {"quantity": 6}
        ]})
        filtros = FiltrosRequest(cuotas=[1, 3, 6], cuotas_mode="exacta")
        assert matches_filters(rule, filtros) is True

    def test_cuotas_exacta_no_match_superset(self):
        rule = make_rule(installmentOptions={"installments": [
            {"quantity": 1}, {"quantity": 3}, {"quantity": 6}, {"quantity": 9}
        ]})
        filtros = FiltrosRequest(cuotas=[1, 3, 6], cuotas_mode="exacta")
        assert matches_filters(rule, filtros) is False

    def test_cuotas_contiene_match(self):
        rule = make_rule(installmentOptions={"installments": [
            {"quantity": 1}, {"quantity": 3}, {"quantity": 6}, {"quantity": 9}
        ]})
        filtros = FiltrosRequest(cuotas=[9], cuotas_mode="contiene")
        assert matches_filters(rule, filtros) is True

    def test_cuotas_contiene_no_match(self):
        rule = make_rule(installmentOptions={"installments": [
            {"quantity": 1}, {"quantity": 3}
        ]})
        filtros = FiltrosRequest(cuotas=[9], cuotas_mode="contiene")
        assert matches_filters(rule, filtros) is False

    def test_sin_fecha_rejects_rule_with_dates(self):
        rule = make_rule(beginDate="2026-06-01T00:00:00", endDate="2026-12-31T00:00:00")
        filtros = FiltrosRequest(fecha_mode="sin_fecha")
        assert matches_filters(rule, filtros) is False

    def test_sin_fecha_accepts_rule_without_dates(self):
        rule = make_rule(beginDate=None, endDate=None)
        filtros = FiltrosRequest(fecha_mode="sin_fecha")
        assert matches_filters(rule, filtros) is True

    def test_fecha_entre_rule_inside_range(self):
        rule = make_rule(
            beginDate="2026-06-01T00:00:00",
            endDate="2026-12-31T00:00:00",
        )
        filtros = FiltrosRequest(
            fecha_mode="entre",
            fecha_ini_date="2026-01-01",
            fecha_fin_date="2026-12-31",
        )
        assert matches_filters(rule, filtros) is True

    def test_fecha_entre_rule_before_range(self):
        rule = make_rule(
            beginDate="2025-01-01T00:00:00",
            endDate="2025-06-01T00:00:00",
        )
        filtros = FiltrosRequest(
            fecha_mode="entre",
            fecha_ini_date="2026-01-01",
            fecha_fin_date="2026-12-31",
        )
        assert matches_filters(rule, filtros) is False

    def test_connector_filter_match(self):
        rule = make_rule(connector={
            "implementation": "vtex.paymentprovider.paywaypartnerar-payway-v0",
            "affiliationId": "abc"
        })
        filtros = FiltrosRequest(connector="payway")
        assert matches_filters(rule, filtros) is True

    def test_connector_filter_no_match(self):
        rule = make_rule(connector={
            "implementation": "vtex.paymentprovider.decidir-v2",
            "affiliationId": "xyz"
        })
        filtros = FiltrosRequest(connector="payway")
        assert matches_filters(rule, filtros) is False


# ─────────────────────────────────────────────────────────────────────────────
# check_cuota_group
# ─────────────────────────────────────────────────────────────────────────────

class TestCheckCuotaGroup:
    def test_empty_rules_returns_no_configurado(self):
        estado, motivos = check_cuota_group([], _LC, frozenset({1, 3, 6}), "6c")
        assert estado == "No configurado"
        assert motivos == []

    def test_no_rules_for_target_level_returns_no_configurado(self):
        rules = [make_enriched_rule(nivel_tarjeta="electron", cuotas_disponibles="1")]
        estado, motivos = check_cuota_group(rules, _LC, frozenset({1, 3, 6}), "6c")
        assert estado == "No configurado"

    def test_correct_cuotas_habilitada_returns_ok(self):
        # target_levels reducido a {"classic"} para no necesitar todos los 6 LC levels
        # check_cuota_group verifica que cada firma cubra TODOS los target_levels
        _CLASSIC = frozenset({"classic"})
        rules = [
            make_enriched_rule(id_sistema_pago="2", nivel_tarjeta="classic"),
            make_enriched_rule(id_sistema_pago="4", nivel_tarjeta="classic"),
        ]
        estado, _ = check_cuota_group(rules, _CLASSIC, frozenset({1, 3, 6}), "6c")
        assert estado.startswith("Ok")

    def test_no_rule_has_expected_cuotas_returns_no_configurado(self):
        # Cuotas incorrectas (1,3) cuando se esperan (1,3,6) → No configurado (ninguna regla cumple)
        rules = [make_enriched_rule(cuotas_disponibles="1,3")]
        estado, _ = check_cuota_group(rules, _LC, frozenset({1, 3, 6}), "6c")
        assert estado == "No configurado"

    def test_disabled_rule_with_correct_cuotas_returns_a_corregir(self):
        # Regla con cuotas correctas pero deshabilitada → "A corregir"
        rules = [
            make_enriched_rule(
                habilitada="No",
                cuotas_disponibles="1,3,6",
                id_sistema_pago="2",
            ),
            make_enriched_rule(
                habilitada="No",
                cuotas_disponibles="1,3,6",
                id_sistema_pago="4",
            ),
        ]
        estado, motivos = check_cuota_group(rules, _LC, frozenset({1, 3, 6}), "6c")
        assert estado == "A corregir"
        assert len(motivos) > 0

    def test_missing_visa_firma_returns_a_corregir(self):
        rules = [make_enriched_rule(
            nivel_tarjeta="classic",
            habilitada="Sí",
            cuotas_disponibles="1,3,6",
            id_sistema_pago="4",  # solo Mastercard, falta Visa (id=2)
        )]
        estado, motivos = check_cuota_group(rules, _LC, frozenset({1, 3, 6}), "6c")
        assert estado == "A corregir"
        assert any("Visa" in m for m in motivos)

    def test_both_firmas_present_ok(self):
        _CLASSIC = frozenset({"classic"})
        rules = [
            make_enriched_rule(id_sistema_pago="2", nivel_tarjeta="classic"),
            make_enriched_rule(id_sistema_pago="4", nivel_tarjeta="classic"),
        ]
        estado, motivos = check_cuota_group(rules, _CLASSIC, frozenset({1, 3, 6}), "6c")
        assert estado.startswith("Ok")
        assert motivos == []

    def test_no_rule_with_exact_cuotas_but_has_others_returns_no_configurado(self):
        # Hay reglas LC pero ninguna tiene exactamente {1,3,6,9}
        rules = [make_enriched_rule(
            nivel_tarjeta="classic",
            habilitada="Sí",
            cuotas_disponibles="1,3,6",
        )]
        estado, _ = check_cuota_group(rules, _LC, frozenset({1, 3, 6, 9}), "9c")
        assert estado == "No configurado"
