"""
Servicio del dashboard.

`build_owner_summary()` es el corazón del dashboard Owner/Admin v2:
consulta órdenes del marketplace vía VTEX Orders API, agrega KPIs +
serie GMV 30d + torta órdenes 24h + top sellers, y cachea 5 min in-memory.

El cache es dict global con TTL. Es intencional que sea global (compartido
entre requests) y suficientemente simple — no hace falta Redis para esto.
En un pod recién levantado, el primer GET tarda 3-6s (llamadas a VTEX),
después es <10ms hasta el próximo TTL.
"""
import asyncio
import logging
import time
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.sellers.models import Seller

from .orders_client import list_orders

logger = logging.getLogger(__name__)

_CACHE_TTL_SECONDS = 300  # 5 minutos
_cache: dict[str, tuple[float, dict]] = {}


async def build_owner_summary(db: AsyncSession) -> dict:
    """
    KPIs + series para dashboard Owner/Admin. Cacheado 5 min por key `owner`.
    """
    now_ts = time.time()
    cached = _cache.get("owner")
    if cached and (now_ts - cached[0]) < _CACHE_TTL_SECONDS:
        logger.debug("dashboard.summary owner cache HIT (age=%ds)", int(now_ts - cached[0]))
        return cached[1]

    now = datetime.now(timezone.utc)
    d30 = now - timedelta(days=30)
    d60 = now - timedelta(days=60)
    d1 = now - timedelta(hours=24)

    # Traemos 60d de una para poder calcular delta 30d vs 30d previos con una sola query
    orders_60d, seller_rows = await asyncio.gather(
        _safe_list_orders(d60, now, statuses=["payment-approved", "invoiced", "handling", "ready-for-handling"]),
        _fetch_sellers(db),
    )

    # ─── GMV 30d y 30d previos ─────────────────────────────────
    gmv_30d = 0.0
    gmv_prev_30d = 0.0
    for o in orders_60d:
        value = _order_value(o)
        cdate = _order_date(o)
        if cdate is None:
            continue
        if cdate >= d30:
            gmv_30d += value
        elif cdate >= d60:
            gmv_prev_30d += value

    delta_pct = None
    if gmv_prev_30d > 0:
        delta_pct = round((gmv_30d - gmv_prev_30d) / gmv_prev_30d * 100, 1)

    # ─── Serie diaria GMV 30d ─────────────────────────────────
    daily: dict[str, float] = defaultdict(float)
    for o in orders_60d:
        cdate = _order_date(o)
        if cdate is None or cdate < d30:
            continue
        key = cdate.strftime("%Y-%m-%d")
        daily[key] += _order_value(o)

    series = []
    for i in range(30):
        day = (d30 + timedelta(days=i)).strftime("%Y-%m-%d")
        series.append({"date": day, "value": round(daily.get(day, 0.0), 2)})

    # ─── Órdenes 24h por status ───────────────────────────────
    orders_24h_all = await _safe_list_orders(d1, now, statuses=None)
    status_counter: Counter = Counter()
    for o in orders_24h_all:
        st = _normalize_status(o.get("status"))
        status_counter[st] += 1

    # ─── Sellers activos vs inactivos ─────────────────────────
    total = len(seller_rows)
    active = sum(1 for s in seller_rows if getattr(s, "vendiendo", None) is True)
    inactive = total - active

    # ─── Top 10 sellers por GMV 30d ───────────────────────────
    by_seller: dict[str, dict] = defaultdict(lambda: {"gmv": 0.0, "orders": 0, "name": ""})
    for o in orders_60d:
        cdate = _order_date(o)
        if cdate is None or cdate < d30:
            continue
        seller_id = _order_seller(o)
        if not seller_id:
            continue
        row = by_seller[seller_id]
        row["gmv"] += _order_value(o)
        row["orders"] += 1

    # Nombres de sellers (best-effort — puede que no todos matcheen)
    name_map = {s.seller_id: (s.seller_name or s.seller_id) for s in seller_rows if s.seller_id}
    for sid, row in by_seller.items():
        row["name"] = name_map.get(sid, sid)

    top_10 = sorted(
        (
            {"seller_id": sid, "name": row["name"], "gmv": round(row["gmv"], 2), "orders": row["orders"]}
            for sid, row in by_seller.items()
        ),
        key=lambda x: x["gmv"],
        reverse=True,
    )[:10]

    summary = {
        "gmv_30d": {
            "value": round(gmv_30d, 2),
            "prev": round(gmv_prev_30d, 2),
            "delta_pct": delta_pct,
        },
        "orders_24h": {
            "total": sum(status_counter.values()),
            "by_status": dict(status_counter),
        },
        "gmv_30d_series": series,
        "sellers": {"total": total, "active": active, "inactive": inactive},
        "top_sellers_30d": top_10,
        "generated_at": now.isoformat(),
    }

    _cache["owner"] = (now_ts, summary)
    logger.info(
        "dashboard.summary owner rebuilt gmv30=%.0f orders24=%d sellers=%d top=%d",
        gmv_30d, summary["orders_24h"]["total"], total, len(top_10),
    )
    return summary


# ─── helpers ────────────────────────────────────────────────


async def _safe_list_orders(since, until, statuses):
    """Envoltura que loguea y devuelve [] si BaproAR falla — el dashboard no debe romperse."""
    try:
        return await list_orders(since, until, statuses)
    except Exception as e:
        logger.warning("orders fetch failed: %s", e, exc_info=True)
        return []


async def _fetch_sellers(db: AsyncSession):
    result = await db.execute(select(Seller))
    return result.scalars().all()


def _order_value(o: dict) -> float:
    """VTEX Orders API devuelve value en centavos. Convertimos a pesos."""
    raw = o.get("totalValue") or o.get("value") or 0
    try:
        return float(raw) / 100.0
    except (TypeError, ValueError):
        return 0.0


def _order_date(o: dict):
    raw = o.get("creationDate") or o.get("orderDate")
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except (TypeError, ValueError):
        return None


def _order_seller(o: dict) -> str | None:
    return o.get("sellerId") or o.get("marketplaceSellerId") or None


def _normalize_status(status: str | None) -> str:
    if not status:
        return "unknown"
    s = status.lower()
    if s in {"payment-approved", "invoiced", "handling", "ready-for-handling", "invoice"}:
        return "paid"
    if s in {"cancel", "canceled", "cancelled", "cancellation-requested"}:
        return "cancelled"
    if s in {"payment-pending", "waiting-for-seller-decision", "waiting-for-authorization", "on-order-completed"}:
        return "pending"
    return s
