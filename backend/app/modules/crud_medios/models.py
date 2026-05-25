import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class CrudOperation(Base):
    __tablename__ = "crud_operations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    operacion: Mapped[str] = mapped_column(String(1), nullable=False)  # R/C/U/D
    dry_run: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    sellers_scope: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, default=list
    )
    filtros_usados: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    total_matched: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_success: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_errors: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    duration_secs: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    rows: Mapped[list["CrudOperationRow"]] = relationship(
        "CrudOperationRow", back_populates="operation", cascade="all, delete-orphan"
    )


class CrudOperationRow(Base):
    __tablename__ = "crud_operation_rows"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    operation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("crud_operations.id"), nullable=False
    )
    seller_id: Mapped[str] = mapped_column(String(128), nullable=False)
    rule_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    rule_name: Mapped[str | None] = mapped_column(String(512), nullable=True)
    brand: Mapped[str | None] = mapped_column(String(255), nullable=True)
    level: Mapped[str | None] = mapped_column(String(64), nullable=True)
    estado: Mapped[str | None] = mapped_column(String(32), nullable=True)
    detalle: Mapped[str | None] = mapped_column(Text, nullable=True)

    operation: Mapped["CrudOperation"] = relationship(
        "CrudOperation", back_populates="rows"
    )
