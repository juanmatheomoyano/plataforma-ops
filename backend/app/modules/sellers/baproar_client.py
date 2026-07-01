"""
BaproAR Marketplace — VTEX Seller Register API client.
Endpoint base: /api/seller-register/pvt/sellers
Auth: X-VTEX-API-AppKey / X-VTEX-API-AppToken (credenciales del marketplace BaproAR)
"""
import logging

import httpx

logger = logging.getLogger(__name__)

_BASE = "https://baproar.vtexcommercestable.com.br/api/seller-register/pvt/sellers"
_TIMEOUT = httpx.Timeout(20.0)

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


async def list_sellers(app_key: str, app_token: str) -> list[dict]:
    """Devuelve todos los sellers del marketplace BaproAR iterando todas las páginas."""
    all_items: list[dict] = []
    page = 1

    while True:
        resp = await get_client().get(
            _BASE,
            params={"page": page, "pageSize": 50},
            headers=_headers(app_key, app_token),
        )
        resp.raise_for_status()
        data = resp.json()

        if isinstance(data, list):
            # La API devolvió una lista plana — no hay paginación
            return data

        items = data.get("items") or data.get("sellers") or []
        all_items.extend(items)

        paging = data.get("paging", {})
        total_pages = paging.get("pages", 1)

        logger.debug("BaproAR sellers page %d/%d — %d items", page, total_pages, len(items))

        if page >= total_pages or not items:
            break
        page += 1

    return all_items


async def toggle_seller(seller_id: str, is_active: bool, app_key: str, app_token: str) -> None:
    """Activa o desactiva un seller en BaproAR. Lanza excepción si no es 200."""
    url = f"{_BASE}/{seller_id}"
    body = [{"operation": "replace", "path": "/isActive", "value": is_active}]
    resp = await get_client().patch(url, json=body, headers=_headers(app_key, app_token))
    resp.raise_for_status()
