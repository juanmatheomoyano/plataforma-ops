"""
Marketplace VTEX — Seller Register API client.
Endpoint base: /api/seller-register/pvt/sellers
Auth: X-VTEX-API-AppKey / X-VTEX-API-AppToken (credenciales del marketplace).
La URL base se toma de settings.MARKETPLACE_URL.
"""
import logging

import httpx

logger = logging.getLogger(__name__)

# Timeout explícito para evitar que el sync bloquee el lifespan si el marketplace está lento.
# connect corto (falla rápido si no responde), read/write razonables por página.
_TIMEOUT = httpx.Timeout(10.0, connect=5.0)

_client: httpx.AsyncClient | None = None


def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=_TIMEOUT)
    return _client


async def close_client() -> None:
    global _client
    if _client and not _client.is_closed:
        await _client.aclose()
        _client = None


def _headers(app_key: str, app_token: str) -> dict:
    return {
        "X-VTEX-API-AppKey": app_key,
        "X-VTEX-API-AppToken": app_token,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


def _base_url() -> str:
    from app.core.config import settings
    return f"{settings.MARKETPLACE_URL.rstrip('/')}/api/seller-register/pvt/sellers"


async def list_sellers(app_key: str, app_token: str) -> list[dict]:
    """Devuelve todos los sellers del marketplace usando paginación from/to."""
    all_items: list[dict] = []
    from_idx = 0
    page_size = 100
    base = _base_url()

    while True:
        to_idx = from_idx + page_size - 1
        resp = await get_client().get(
            base,
            params={"from": from_idx, "to": to_idx},
            headers=_headers(app_key, app_token),
        )
        resp.raise_for_status()
        data = resp.json()

        if isinstance(data, list):
            return data

        items = data.get("items") or []
        all_items.extend(items)

        paging = data.get("paging", {})
        total = paging.get("total", 0)
        logger.debug("Marketplace sellers from=%d to=%d — %d items de %d total", from_idx, to_idx, len(items), total)

        if not items or from_idx + page_size >= total:
            break
        from_idx += page_size

    return all_items


async def toggle_seller(seller_id: str, is_active: bool, app_key: str, app_token: str) -> None:
    """Activa o desactiva un seller en el marketplace. Lanza excepción si no es 200."""
    url = f"{_base_url()}/{seller_id}"
    body = [{"operation": "replace", "path": "/isActive", "value": is_active}]
    resp = await get_client().patch(url, json=body, headers=_headers(app_key, app_token))
    resp.raise_for_status()
