"""Matriz de permisos por rol.

Verifica que cada endpoint protegido responde con el status esperado según el rol
del usuario autenticado. No usa BD real: overrides `get_current_user` y `get_db`.

Convención:
- "ok"   → status ≠ 401/403 (guard pasó, aunque después el endpoint pueda fallar por falta de data).
- "deny" → status == 403 (guard rechazó).

Sin este test, un rename de rol o un cambio en `require_role` puede romper
autorización sin que nadie se dé cuenta.
"""
import uuid
from unittest.mock import AsyncMock

import pytest
from fastapi.testclient import TestClient

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.main import app
from app.modules.auth.models import UserRole


ROLES = ["admin", "supervisor", "analista", "viewer"]
UUID_PLACEHOLDER = "00000000-0000-0000-0000-000000000000"


class _FakeUser:
    def __init__(self, role_name: str):
        self.id = uuid.UUID("00000000-0000-0000-0000-000000000001")
        self.username = f"test_{role_name}"
        self.email = f"{role_name}@test.local"
        self.full_name = f"Test {role_name}"
        self.role = UserRole(role_name)
        self.is_active = True


def _fake_user_dep(role_name: str):
    async def _dep():
        return _FakeUser(role_name)
    return _dep


async def _fake_db_dep():
    yield AsyncMock()


@pytest.fixture
def client():
    app.dependency_overrides[get_db] = _fake_db_dep
    # raise_server_exceptions=False → 500 llega como response (no propaga a pytest).
    # Los endpoints crashean con AsyncMock, no importa: verificamos solo el guard.
    yield TestClient(app, raise_server_exceptions=False)
    app.dependency_overrides.clear()


def _override_role(role: str):
    app.dependency_overrides[get_current_user] = _fake_user_dep(role)


# ─────────────────────────────────────────────────────────────────────────────
# MATRIZ DE PERMISOS
# (method, path, {rol: "ok"|"deny"})
# ─────────────────────────────────────────────────────────────────────────────

MATRIX = [
    # ── USERS ──────────────────────────────────────────────────────────────
    ("GET", "/api/users", None, {
        "admin": "ok", "supervisor": "ok", "analista": "deny", "viewer": "deny"}),
    ("GET", "/api/users/export", None, {
        "admin": "ok", "supervisor": "ok", "analista": "deny", "viewer": "deny"}),
    ("GET", f"/api/users/{UUID_PLACEHOLDER}", None, {
        "admin": "ok", "supervisor": "deny", "analista": "deny", "viewer": "deny"}),
    ("POST", "/api/users", {}, {
        "admin": "ok", "supervisor": "deny", "analista": "deny", "viewer": "deny"}),
    ("PATCH", f"/api/users/{UUID_PLACEHOLDER}", {}, {
        "admin": "ok", "supervisor": "deny", "analista": "deny", "viewer": "deny"}),
    ("POST", f"/api/users/{UUID_PLACEHOLDER}/reset-password", {}, {
        "admin": "ok", "supervisor": "deny", "analista": "deny", "viewer": "deny"}),

    # ── SELLERS ────────────────────────────────────────────────────────────
    ("GET", "/api/sellers", None, {
        "admin": "ok", "supervisor": "ok", "analista": "ok", "viewer": "ok"}),
    ("POST", "/api/sellers", {}, {
        "admin": "ok", "supervisor": "ok", "analista": "ok", "viewer": "deny"}),
    ("GET", "/api/sellers/export", None, {
        "admin": "ok", "supervisor": "ok", "analista": "deny", "viewer": "deny"}),
    ("POST", "/api/sellers/sync-marketplace", None, {
        "admin": "ok", "supervisor": "ok", "analista": "deny", "viewer": "deny"}),
    ("GET", "/api/sellers/analistas", None, {
        "admin": "ok", "supervisor": "ok", "analista": "ok", "viewer": "ok"}),
    ("GET", "/api/sellers/integraciones", None, {
        "admin": "ok", "supervisor": "ok", "analista": "ok", "viewer": "ok"}),
    ("GET", f"/api/sellers/{UUID_PLACEHOLDER}", None, {
        "admin": "ok", "supervisor": "ok", "analista": "ok", "viewer": "ok"}),
    ("PATCH", f"/api/sellers/{UUID_PLACEHOLDER}", {}, {
        "admin": "ok", "supervisor": "ok", "analista": "ok", "viewer": "deny"}),
    ("POST", f"/api/sellers/{UUID_PLACEHOLDER}/deactivate", None, {
        "admin": "ok", "supervisor": "ok", "analista": "ok", "viewer": "deny"}),
    ("POST", f"/api/sellers/{UUID_PLACEHOLDER}/test-connection", None, {
        "admin": "ok", "supervisor": "ok", "analista": "deny", "viewer": "deny"}),
    ("POST", f"/api/sellers/{UUID_PLACEHOLDER}/marketplace-toggle", None, {
        "admin": "ok", "supervisor": "ok", "analista": "deny", "viewer": "deny"}),

    # ── CRUD MEDIOS ────────────────────────────────────────────────────────
    ("POST", "/api/crud-medios/cleanup", None, {
        "admin": "ok", "supervisor": "deny", "analista": "deny", "viewer": "deny"}),
]


@pytest.mark.parametrize("role", ROLES)
@pytest.mark.parametrize("method,path,body,expectations", MATRIX)
def test_role_permission(client, role, method, path, body, expectations):
    _override_role(role)
    expected = expectations[role]

    if body is None:
        resp = client.request(method, path)
    else:
        resp = client.request(method, path, json=body)

    if expected == "deny":
        assert resp.status_code == 403, (
            f"{role} debería tener 403 en {method} {path} (got {resp.status_code})"
        )
    else:  # "ok" — pasó el guard, cualquier código no 401/403
        assert resp.status_code not in (401, 403), (
            f"{role} debería pasar el guard en {method} {path} (got {resp.status_code})"
        )


def test_no_auth_returns_401(client):
    """Sin override de get_current_user, endpoints protegidos deben tirar 401."""
    app.dependency_overrides.pop(get_current_user, None)
    resp = client.get("/api/users")
    assert resp.status_code in (401, 403), f"Sin auth debería 401/403, got {resp.status_code}"
