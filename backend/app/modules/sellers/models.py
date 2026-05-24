import uuid
from datetime import datetime, timezone
from enum import Enum as PyEnum

from sqlalchemy import Boolean, DateTime, Enum, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class EstadoKeys(str, PyEnum):
    activo = "activo"
    inactivo = "inactivo"
    vencido = "vencido"


class Seller(Base):
    __tablename__ = "sellers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    id_ecommerce: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    seller_name: Mapped[str] = mapped_column(String(255), nullable=False)
    seller_id: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)

    # Credenciales — NUNCA se exponen al frontend
    app_key_enc: Mapped[str | None] = mapped_column(Text, nullable=True)
    app_token_enc: Mapped[str | None] = mapped_column(Text, nullable=True)

    creado_por: Mapped[str | None] = mapped_column(String(255), nullable=True)
    fecha_creacion: Mapped[str | None] = mapped_column(String(64), nullable=True)
    estado_keys: Mapped[EstadoKeys] = mapped_column(
        Enum(EstadoKeys, name="estadokeys"), nullable=False, default=EstadoKeys.activo
    )
    integracion: Mapped[str | None] = mapped_column(String(255), nullable=True)
    vendiendo: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    analista: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notas: Mapped[str | None] = mapped_column(Text, nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
