import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.modules.auth.models import User

from . import service
from .schemas import EventoCreate, EventoOut, EventoUpdate, EventoVigenteOut

router = APIRouter(prefix="/eventos", tags=["eventos"])


async def _enrich(db: AsyncSession, evento) -> EventoOut:
    username = None
    if evento.creado_por:
        row = await db.execute(select(User.username).where(User.id == evento.creado_por))
        username = row.scalar_one_or_none()
    out = EventoOut.model_validate(evento)
    out.creado_por_username = username
    return out


@router.post("/", response_model=EventoOut)
async def create_evento(
    body: EventoCreate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(["admin"])),
):
    evento = await service.create_evento(db, current_user.id, body)
    return await _enrich(db, evento)


@router.get("/", response_model=list[EventoOut])
async def list_eventos(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role(["admin"])),
):
    eventos = await service.list_eventos(db)
    return [await _enrich(db, e) for e in eventos]


@router.get("/vigentes", response_model=list[EventoVigenteOut])
async def get_vigentes(
    db: AsyncSession = Depends(get_db),
    _=Depends(get_current_user),
):
    return await service.get_vigentes(db)


@router.put("/{evento_id}", response_model=EventoOut)
async def update_evento(
    evento_id: uuid.UUID,
    body: EventoUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require_role(["admin"])),
):
    evento = await service.update_evento(db, evento_id, body)
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    return await _enrich(db, evento)


@router.patch("/{evento_id}/toggle-active", response_model=EventoOut)
async def toggle_active(
    evento_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role(["admin"])),
):
    evento = await service.toggle_active(db, evento_id)
    if not evento:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    return await _enrich(db, evento)


@router.delete("/{evento_id}")
async def delete_evento(
    evento_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_role(["admin"])),
):
    ok = await service.delete_evento(db, evento_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    return {"ok": True}
