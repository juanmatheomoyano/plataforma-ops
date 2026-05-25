import uuid
from datetime import datetime

from pydantic import BaseModel

from app.modules.auth.models import UserRole


class UserCreate(BaseModel):
    username: str
    email: str
    full_name: str | None = None
    password: str
    role: UserRole = UserRole.viewer


class UserUpdate(BaseModel):
    email: str | None = None
    full_name: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None


class UserOut(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    full_name: str | None
    role: UserRole
    is_active: bool
    created_at: datetime
    last_login: datetime | None

    model_config = {"from_attributes": True}


class ChangePassword(BaseModel):
    new_password: str


class SelfChangePassword(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str


class UserImportError(BaseModel):
    fila: int
    username: str | None
    motivo: str


class UserImportUpdateResult(BaseModel):
    total: int
    actualizados: int
    creados: int
    errores: int
    detalle_errores: list[UserImportError]
