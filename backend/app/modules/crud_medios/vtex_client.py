"""
VTEX Payment Conditions API client.
Endpoint: /api/payments/pvt/rules
Auth: X-VTEX-API-AppKey / X-VTEX-API-AppToken headers
"""
import asyncio
import logging

import httpx

logger = logging.getLogger(__name__)

_BASE = "https://{account}.vtexcommercestable.com.br/api/payments/pvt/rules"
_TIMEOUT = httpx.Timeout(15.0)
_RETRIES = 3


def _url(seller_id: str, rule_id: int | None = None) -> str:
    base = _BASE.format(account=seller_id)
    return f"{base}/{rule_id}" if rule_id is not None else base


def _headers(app_key: str, app_token: str) -> dict:
    return {
        "X-VTEX-API-AppKey": app_key,
        "X-VTEX-API-AppToken": app_token,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


async def _request(method: str, url: str, headers: dict, **kwargs) -> dict | list:
    last_exc: Exception | None = None
    for attempt in range(_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
                resp = await client.request(method, url, headers=headers, **kwargs)
            if resp.status_code == 404:
                return []
            resp.raise_for_status()
            return resp.json() if resp.content else {}
        except (httpx.TimeoutException, httpx.ConnectError) as e:
            last_exc = e
            if attempt < _RETRIES - 1:
                await asyncio.sleep(2 ** attempt)
        except httpx.HTTPStatusError as e:
            raise RuntimeError(f"VTEX {method} {url} → {e.response.status_code}: {e.response.text[:200]}")
    raise RuntimeError(f"VTEX {method} {url} failed after {_RETRIES} attempts: {last_exc}")


async def get_rules(seller_id: str, app_key: str, app_token: str) -> list[dict]:
    result = await _request("GET", _url(seller_id), _headers(app_key, app_token))
    return result if isinstance(result, list) else []


async def create_rule(
    seller_id: str, app_key: str, app_token: str, body: dict
) -> dict:
    return await _request("POST", _url(seller_id), _headers(app_key, app_token), json=body)


async def update_rule(
    seller_id: str, app_key: str, app_token: str, rule_id: int, body: dict
) -> dict:
    return await _request("PUT", _url(seller_id, rule_id), _headers(app_key, app_token), json=body)


async def delete_rule(
    seller_id: str, app_key: str, app_token: str, rule_id: int
) -> None:
    await _request("DELETE", _url(seller_id, rule_id), _headers(app_key, app_token))
