"""Regresión startup: BaproAR caído no debe bloquear el arranque de la app.

Ver RETRO.md → "Startup sync en lifespan".
"""
import asyncio
import time
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.main import app


async def _noop(db):
    pass


async def _simulated_slow_baproar(db):
    """Simula un BaproAR que no responde nunca."""
    await asyncio.sleep(60)


async def _failing_sync(db):
    raise RuntimeError("BaproAR unavailable")


def test_health_check_responds_fast_even_if_baproar_hangs():
    """Con BaproAR colgado, el /health debe responder <2s (no bloqueado por el sync)."""
    with patch("app.main.sync_marketplace_sellers", _simulated_slow_baproar), \
         patch("app.main.cleanup_old_operations", _noop):
        with TestClient(app) as client:
            t0 = time.monotonic()
            resp = client.get("/health")
            elapsed = time.monotonic() - t0
            assert resp.status_code == 200
            assert elapsed < 2.0, f"/health tardó {elapsed:.2f}s, debería ser <2s"


def test_app_starts_even_if_sync_raises():
    """Si el sync tira una excepción, la app debe arrancar igual y /health responder OK."""
    with patch("app.main.sync_marketplace_sellers", _failing_sync), \
         patch("app.main.cleanup_old_operations", _noop):
        with TestClient(app) as client:
            resp = client.get("/health")
            assert resp.status_code == 200
