import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Evento
from .schemas import EventoCreate, EventoUpdate

AR_TZ = timezone(timedelta(hours=-3))


def _parse_art_dt(art_str: str | None) -> datetime | None:
    if not art_str:
        return None
    dt = datetime.fromisoformat(art_str).replace(tzinfo=AR_TZ)
    return dt.astimezone(timezone.utc)


async def create_evento(db: AsyncSession, user_id: uuid.UUID, data: EventoCreate) -> Evento:
    evento = Evento(
        nombre=data.nombre,
        fecha_ini=_parse_art_dt(data.fecha_ini_art) or datetime.now(timezone.utc),
        fecha_fin=_parse_art_dt(data.fecha_fin_art) or datetime.now(timezone.utc),
        cuotas_requeridas=data.cuotas_requeridas,
        max_cuota=data.max_cuota,
        scope_seller_ids=data.scope_seller_ids,
        creado_por=user_id,
    )
    db.add(evento)
    await db.commit()
    await db.refresh(evento)
    return evento


async def list_eventos(db: AsyncSession) -> list[Evento]:
    result = await db.execute(select(Evento).order_by(Evento.created_at.desc()))
    return list(result.scalars().all())


async def get_vigentes(db: AsyncSession) -> list[Evento]:
    """Returns active events that are current or upcoming (fecha_fin >= now)."""
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(Evento).where(
            Evento.is_active.is_(True),
            Evento.fecha_fin >= now,
        ).order_by(Evento.fecha_ini)
    )
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, evento_id: uuid.UUID) -> Evento | None:
    result = await db.execute(select(Evento).where(Evento.id == evento_id))
    return result.scalar_one_or_none()


async def update_evento(db: AsyncSession, evento_id: uuid.UUID, data: EventoUpdate) -> Evento | None:
    evento = await get_by_id(db, evento_id)
    if not evento:
        return None
    if data.nombre is not None:
        evento.nombre = data.nombre
    if data.fecha_ini_art is not None:
        evento.fecha_ini = _parse_art_dt(data.fecha_ini_art)
    if data.fecha_fin_art is not None:
        evento.fecha_fin = _parse_art_dt(data.fecha_fin_art)
    if data.cuotas_requeridas is not None:
        evento.cuotas_requeridas = data.cuotas_requeridas
    if data.max_cuota is not None:
        evento.max_cuota = data.max_cuota
    if data.scope_seller_ids is not None:
        evento.scope_seller_ids = data.scope_seller_ids
    if data.is_active is not None:
        evento.is_active = data.is_active
    await db.commit()
    await db.refresh(evento)
    return evento


async def toggle_active(db: AsyncSession, evento_id: uuid.UUID) -> Evento | None:
    evento = await get_by_id(db, evento_id)
    if not evento:
        return None
    evento.is_active = not evento.is_active
    await db.commit()
    await db.refresh(evento)
    return evento


async def delete_evento(db: AsyncSession, evento_id: uuid.UUID) -> bool:
    evento = await get_by_id(db, evento_id)
    if not evento:
        return False
    await db.delete(evento)
    await db.commit()
    return True
