import uuid
from datetime import datetime

from pydantic import BaseModel

from .models import EstadoKeys


class SellerCreate(BaseModel):
    id_ecommerce: str
    seller_name: str
    seller_id: str
    app_key: str
    app_token: str
    creado_por: str | None = None
    fecha_creacion: str | None = None
    estado_keys: EstadoKeys = EstadoKeys.activo
    integracion: str | None = None
    integracion_spec: str | None = None
    vendiendo: bool = False
    analista: str | None = None
    notas: str | None = None


class SellerUpdate(BaseModel):
    id_ecommerce: str | None = None
    seller_name: str | None = None
    seller_id: str | None = None
    app_key: str | None = None
    app_token: str | None = None
    creado_por: str | None = None
    fecha_creacion: str | None = None
    estado_keys: EstadoKeys | None = None
    integracion: str | None = None
    integracion_spec: str | None = None
    vendiendo: bool | None = None
    analista: str | None = None
    notas: str | None = None
    is_active: bool | None = None


class SellerOut(BaseModel):
    id: uuid.UUID
    id_ecommerce: str
    seller_name: str
    seller_id: str
    creado_por: str | None
    fecha_creacion: str | None
    estado_keys: EstadoKeys
    integracion: str | None
    integracion_spec: str | None
    vendiendo: bool
    analista: str | None
    notas: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class IntegracionSpecCreate(BaseModel):
    integracion: str
    spec: str


class IntegracionSpecOut(BaseModel):
    id: uuid.UUID
    integracion: str
    spec: str

    model_config = {"from_attributes": True}


class AnalistaOut(BaseModel):
    username: str
    full_name: str | None

    model_config = {"from_attributes": True}


# SellerImportRow matches SellerCreate for bulk import
SellerImportRow = SellerCreate


class ImportError(BaseModel):
    fila: int
    seller_id: str | None
    motivo: str


class SellerImportResult(BaseModel):
    total: int
    exitosos: int
    errores: int
    detalle_errores: list[ImportError]


class SellerImportUpdateResult(BaseModel):
    total: int
    actualizados: int
    creados: int
    errores: int
    detalle_errores: list[ImportError]
