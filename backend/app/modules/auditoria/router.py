"""Endpoint /auditoria — consulta del audit_log (solo admin)."""
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import AuditLog
from app.core.database import get_db
from app.core.dependencies import require_role

router = APIRouter(prefix="/auditoria", tags=["auditoria"])
_admin = Depends(require_role(["admin"]))


class AuditLogEntry(BaseModel):
    id: str
    timestamp: datetime
    user_id: str | None
    username: str | None
    role: str | None
    action: str
    entity: str | None
    entity_id: str | None
    ip: str | None
    request_id: str | None
    payload: dict | None

    model_config = {"from_attributes": True}


class AuditLogResponse(BaseModel):
    total: int
    limit: int
    offset: int
    entries: list[AuditLogEntry]


def _build_query(
    username: str | None,
    action: str | None,
    entity: str | None,
    entity_id: str | None,
    from_date: datetime | None,
    to_date: datetime | None,
):
    q = select(AuditLog)
    filters = []
    if username:
        filters.append(AuditLog.username.ilike(f"%{username}%"))
    if action:
        filters.append(AuditLog.action.ilike(f"%{action}%"))
    if entity:
        filters.append(AuditLog.entity == entity)
    if entity_id:
        filters.append(AuditLog.entity_id.ilike(f"%{entity_id}%"))
    if from_date:
        filters.append(AuditLog.timestamp >= from_date)
    if to_date:
        filters.append(AuditLog.timestamp <= to_date)
    for f in filters:
        q = q.where(f)
    return q


@router.get("", response_model=AuditLogResponse, dependencies=[_admin])
async def list_audit(
    username: str | None = Query(default=None),
    action: str | None = Query(default=None),
    entity: str | None = Query(default=None),
    entity_id: str | None = Query(default=None),
    from_date: datetime | None = Query(default=None),
    to_date: datetime | None = Query(default=None),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """Lista eventos del audit_log con filtros y paginación."""
    q_base = _build_query(username, action, entity, entity_id, from_date, to_date)

    total = await db.scalar(select(func.count()).select_from(q_base.subquery()))
    result = await db.execute(
        q_base.order_by(AuditLog.timestamp.desc()).limit(limit).offset(offset)
    )
    rows = list(result.scalars().all())

    return AuditLogResponse(
        total=total or 0, limit=limit, offset=offset,
        entries=[AuditLogEntry(
            id=str(r.id), timestamp=r.timestamp, user_id=str(r.user_id) if r.user_id else None,
            username=r.username, role=r.role, action=r.action, entity=r.entity,
            entity_id=r.entity_id, ip=str(r.ip) if r.ip else None,
            request_id=r.request_id, payload=r.payload,
        ) for r in rows],
    )


@router.get("/actions", dependencies=[_admin])
async def list_actions(db: AsyncSession = Depends(get_db)):
    """Devuelve la lista de `action` distintos para autocompletar filtros."""
    result = await db.execute(select(AuditLog.action).distinct().order_by(AuditLog.action))
    return sorted({r[0] for r in result.all() if r[0]})


@router.get("/export.csv", dependencies=[_admin])
async def export_csv(
    username: str | None = Query(default=None),
    action: str | None = Query(default=None),
    entity: str | None = Query(default=None),
    entity_id: str | None = Query(default=None),
    from_date: datetime | None = Query(default=None),
    to_date: datetime | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    """CSV con el filtro activo. Máximo 10k filas."""
    import csv
    import io

    q = _build_query(username, action, entity, entity_id, from_date, to_date)
    result = await db.execute(q.order_by(AuditLog.timestamp.desc()).limit(10000))
    rows = list(result.scalars().all())

    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["timestamp", "username", "role", "action", "entity", "entity_id", "ip", "request_id", "payload"])
    for r in rows:
        w.writerow([
            r.timestamp.isoformat(), r.username or "", r.role or "",
            r.action, r.entity or "", r.entity_id or "",
            str(r.ip) if r.ip else "", r.request_id or "",
            str(r.payload) if r.payload else "",
        ])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=audit_log_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"},
    )
