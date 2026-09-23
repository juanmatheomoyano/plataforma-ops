"""
Cliente contra VTEX Orders API del marketplace BaproAR.

Endpoint base: {MARKETPLACE_URL}/api/oms/pvt/orders
Auth: X-VTEX-API-AppKey / X-VTEX-API-AppToken (credenciales del marketplace)

Uso: solo para agregados del dashboard (GMV, count, top sellers).
No usar para operaciones write ni para lookups por orden individual.
"""
import logging
from datetime import datetime, timezone

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_TIMEOUT = httpx.Timeout(30.0, connect=5.0)
_PAGE_SIZE = 100
_MAX_PAGES = 100  # techo defensivo — 10k orders por request es el límite razonable


def _headers() -> dict:
    return {
        "X-VTEX-API-AppKey": settings.MARKETPLACE_APP_KEY,
        "X-VTEX-API-AppToken": settings.MARKETPLACE_APP_TOKEN,
        "Accept": "application/json",
    }


def _base_url() -> str:
    return f"{settings.MARKETPLACE_URL.rstrip('/')}/api/oms/pvt/orders"


async def list_orders(
    since: datetime,
    until: datetime,
    statuses: list[str] | None = None,
) -> list[dict]:
    """
    Lista órdenes creadas entre `since` y `until`.
    `statuses` opcional — si se pasa, filtra por status (ej. ["payment-approved"]).

    Retorna lista deserializada. Levanta httpx.HTTPStatusError si el marketplace
    responde 4xx/5xx.
    """
    since_iso = since.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")
    until_iso = until.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.999Z")

    creation_range = f"creationDate:[{since_iso} TO {until_iso}]"

    all_items: list[dict] = []
    page = 1
    async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
        while page <= _MAX_PAGES:
            params: dict = {
                "f_creationDate": creation_range,
                "per_page": _PAGE_SIZE,
                "page": page,
                "orderBy": "creationDate,desc",
            }
            if statuses:
                params["f_status"] = ",".join(statuses)
            resp = await client.get(_base_url(), params=params, headers=_headers())
            resp.raise_for_status()
            data = resp.json()

            items = data.get("list") or data.get("items") or []
            all_items.extend(items)

            paging = data.get("paging") or {}
            pages = paging.get("pages") or 1
            logger.debug(
                "orders page=%d/%d fetched=%d total=%d",
                page, pages, len(items), paging.get("total", 0),
            )
            if page >= pages or not items:
                break
            page += 1

    return all_items
