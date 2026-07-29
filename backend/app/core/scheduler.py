"""Lock distribuido para jobs del scheduler.

Evita que múltiples réplicas de la app corran la misma tarea en paralelo.
Ver RETRO.md → "APScheduler in-process" y BACKLOG.md → HU-04.
"""
import logging
import os
import socket
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

from sqlalchemy import DateTime, String, delete
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base

logger = logging.getLogger(__name__)


class SchedulerLock(Base):
    __tablename__ = "scheduler_locks"

    job_name: Mapped[str] = mapped_column(String(64), primary_key=True)
    locked_until: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    locked_by: Mapped[str] = mapped_column(String(128), nullable=False)


def _instance_id() -> str:
    return os.environ.get("RAILWAY_REPLICA_ID") or socket.gethostname() or str(uuid.uuid4())[:8]


async def try_acquire_lock(db: AsyncSession, job_name: str, ttl_seconds: int) -> bool:
    """Intenta tomar el lock. Devuelve True si lo obtuvo (o si el existente expiró).

    Estrategia: INSERT ... ON CONFLICT (job_name) DO UPDATE ... WHERE locked_until < NOW()
    Atómico. Si otra réplica lo tiene con lock vigente, la cláusula WHERE no matchea
    y RETURNING no devuelve nada → no lo tomamos.
    """
    now = datetime.now(timezone.utc)
    locked_until = now + timedelta(seconds=ttl_seconds)
    holder = _instance_id()

    stmt = pg_insert(SchedulerLock).values(
        job_name=job_name, locked_until=locked_until, locked_by=holder
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=[SchedulerLock.job_name],
        set_={"locked_until": locked_until, "locked_by": holder},
        where=SchedulerLock.locked_until < now,
    ).returning(SchedulerLock.job_name)

    result = await db.execute(stmt)
    acquired = result.scalar_one_or_none() is not None
    await db.commit()

    if acquired:
        logger.info("Lock '%s' tomado por %s (TTL %ds)", job_name, holder, ttl_seconds)
    else:
        logger.info("Lock '%s' ya tomado por otra réplica — skip", job_name)
    return acquired


async def release_lock(db: AsyncSession, job_name: str) -> None:
    """Libera el lock (borrado). Idempotente."""
    await db.execute(delete(SchedulerLock).where(SchedulerLock.job_name == job_name))
    await db.commit()


@asynccontextmanager
async def job_lock(db: AsyncSession, job_name: str, ttl_seconds: int):
    """Context manager: solo yield-ea si se obtuvo el lock. Libera al salir."""
    acquired = await try_acquire_lock(db, job_name, ttl_seconds)
    if not acquired:
        yield False
        return
    try:
        yield True
    finally:
        await release_lock(db, job_name)
