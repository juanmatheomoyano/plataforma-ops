import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class UserRole(str, PyEnum):
    """Roles legacy (v1.x) — mantenidos por compatibilidad de guards mientras
    se migran los endpoints al sistema multi-rol (v2.0). NO agregar nuevos acá."""
    admin = "admin"
    supervisor = "supervisor"
    analista = "analista"
    viewer = "viewer"


# Roles v2 — sistema multi-rol nuevo (HU-38).
# Un usuario puede tener múltiples roles simultáneos. Los permisos se resuelven
# como unión (any-match). Los guards nuevos deben chequear contra `user.roles`.
ROLES_V2 = {
    "owner",           # acceso máximo, incluye user management
    "admin",           # todo menos user management
    "categorias",      # CRUD (read) + Sellers + Eventos (read)
    "catalogo",        # Eventos (read); módulos propios cuando existan
    "activacion",      # Alta de Sellers (futuro) + Sellers + Eventos (read)
    "administrativo", # Payway automation + Eventos (read)
}

# Mapping desde el rol único legacy hacia la lista multi-rol v2.
# Se aplica en la migración inicial y como fallback en runtime si el user
# no tiene `roles` cargado (registros pre-migración o borde de deploy).
LEGACY_ROLE_MAPPING: dict[str, list[str]] = {
    "admin": ["owner", "admin"],
    "supervisor": ["admin"],
    "analista": ["categorias"],
    "viewer": ["categorias"],
}


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    # Rol legacy — mantenido como "rol primario" y para guards no migrados aún.
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="userrole"), nullable=False, default=UserRole.viewer
    )
    # v2.0 · lista de roles activos. Vacío → derivar de `role` vía LEGACY_ROLE_MAPPING.
    roles: Mapped[list[str] | None] = mapped_column(
        ARRAY(String(32)), nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    last_login: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        "RefreshToken", back_populates="user", cascade="all, delete-orphan"
    )


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    revoked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    user: Mapped["User"] = relationship("User", back_populates="refresh_tokens")
