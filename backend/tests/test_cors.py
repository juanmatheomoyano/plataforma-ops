"""Regresión CORS — la config debe rechazar orígenes no autorizados y aceptar los Tauri/dev.

Ver RETRO.md → "CORS reabierto a *". Este test evita que vuelva a pasar.
"""
from fastapi.testclient import TestClient

from app.main import app, _ALLOWED_ORIGINS

client = TestClient(app)


def test_allowed_origins_no_wildcard():
    """No debe haber '*' en la lista de orígenes permitidos."""
    assert "*" not in _ALLOWED_ORIGINS


def test_tauri_origins_permitted():
    """Los orígenes de la app Tauri deben estar en la lista."""
    assert "http://tauri.localhost" in _ALLOWED_ORIGINS
    assert "https://tauri.localhost" in _ALLOWED_ORIGINS


def test_preflight_from_allowed_origin_returns_cors_headers():
    resp = client.options(
        "/health",
        headers={
            "Origin": "http://tauri.localhost",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert resp.headers.get("access-control-allow-origin") == "http://tauri.localhost"


def test_preflight_from_malicious_origin_has_no_cors_headers():
    resp = client.options(
        "/health",
        headers={
            "Origin": "https://malicioso.com",
            "Access-Control-Request-Method": "GET",
        },
    )
    # Sin allow-origin en la respuesta → el navegador rechaza la request real
    assert resp.headers.get("access-control-allow-origin") is None


def test_request_from_malicious_origin_has_no_cors_headers():
    resp = client.get("/health", headers={"Origin": "https://malicioso.com"})
    assert resp.status_code == 200  # El servidor responde igual (no bloquea server-side)
    assert resp.headers.get("access-control-allow-origin") is None
