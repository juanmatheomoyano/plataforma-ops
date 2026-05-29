import uuid
from datetime import datetime

from pydantic import BaseModel


class EventoCreate(BaseModel):
    nombre: str
    fecha_ini_art: str | None = None   # "2026-05-14T00:00:00" sin tz, se asume ART (UTC-3)
    fecha_fin_art: str | None = None
    cuotas_requeridas: list[int]
    max_cuota: int
    scope_seller_ids: list[str] = []


class EventoUpdate(BaseModel):
    nombre: str | None = None
    fecha_ini_art: str | None = None
    fecha_fin_art: str | None = None
    cuotas_requeridas: list[int] | None = None
    max_cuota: int | None = None
    scope_seller_ids: list[str] | None = None
    is_active: bool | None = None


class EventoOut(BaseModel):
    id: uuid.UUID
    nombre: str
    fecha_ini: datetime
    fecha_fin: datetime
    cuotas_requeridas: list[int]
    max_cuota: int
    scope_seller_ids: list[str]
    creado_por: uuid.UUID | None
    created_at: datetime
    is_active: bool
    creado_por_username: str | None = None

    model_config = {"from_attributes": True}


class EventoVigenteOut(BaseModel):
    id: uuid.UUID
    nombre: str
    cuotas_requeridas: list[int]
    max_cuota: int
    scope_seller_ids: list[str]
    fecha_ini: datetime
    fecha_fin: datetime

    model_config = {"from_attributes": True}
