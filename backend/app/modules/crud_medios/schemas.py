import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class FiltrosRequest(BaseModel):
    brands: list[str] = Field(default_factory=list)
    levels: list[int] = Field(default_factory=list)
    levels_mode: Literal["include", "exclude"] = "include"
    estado: Literal["todos", "activo", "inactivo"] = "todos"
    nombre: str | None = None
    connector: str | None = None
    cuotas: int | None = None
    cuotas_mode: Literal["exacta", "contiene"] = "exacta"
    fecha_mode: Literal["todos", "entre", "sin_fecha"] = "todos"
    fecha_ini_date: str | None = None   # YYYY-MM-DD
    fecha_fin_date: str | None = None   # YYYY-MM-DD
    fecha_ini: str | None = None        # ISO datetime string (begin_date of rule)
    fecha_fin: str | None = None        # ISO datetime string (end_date of rule)
    horario_ini: str | None = None      # HH:MM[:SS]
    horario_ini_mode: Literal["gte", "lte", "exact"] = "gte"
    horario_fin: str | None = None      # HH:MM[:SS]
    horario_fin_mode: Literal["gte", "lte", "exact"] = "lte"


class AcreateRequest(BaseModel):
    ps_name: str
    level: int
    cuotas: int
    begin_date: str | None = None
    end_date: str | None = None
    enabled: bool = True
    rule_name: str


class UpdateRequest(BaseModel):
    begin_date: str | None = None
    end_date: str | None = None
    cuotas: int | None = None
    enabled: bool | None = None
    level: int | None = None


class ScopeRequest(BaseModel):
    seller_ids: list[str] = Field(default_factory=list)  # vacío = todos los activos


class CrudRequest(BaseModel):
    operacion: Literal["R", "C", "U", "D"]
    scope: ScopeRequest = Field(default_factory=ScopeRequest)
    filtros: FiltrosRequest = Field(default_factory=FiltrosRequest)
    accion_create: AcreateRequest | None = None
    accion_update: UpdateRequest | None = None
    dry_run: bool = True


class CrudRowOut(BaseModel):
    seller_id: str
    rule_id: str | None
    rule_name: str | None
    brand: str | None
    level: str | None
    estado: str | None
    detalle: str | None


class CrudResponse(BaseModel):
    operation_id: uuid.UUID
    operacion: str
    dry_run: bool
    total_sellers: int
    total_matched: int
    total_success: int
    total_errors: int
    duration_secs: float
    rows: list[CrudRowOut]


class OperationSummary(BaseModel):
    id: uuid.UUID
    operacion: str
    dry_run: bool
    total_sellers: int = 0
    total_matched: int
    total_success: int
    total_errors: int
    duration_secs: float
    started_at: datetime
    finished_at: datetime | None
    username: str | None = None

    model_config = {"from_attributes": True}


class SellerScopeOut(BaseModel):
    id_ecommerce: str
    seller_name: str
    seller_id: str
    analista: str | None

    model_config = {"from_attributes": True}
