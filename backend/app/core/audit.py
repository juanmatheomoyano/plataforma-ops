"""Audit log — registro de acciones sensibles.

Estrategia: helper explícito `record_audit(...)` llamado desde services/routers.
Evitamos interceptores SQLAlchemy genéricos porque en modo async y con nuestro
patrón `expire_on_commit=False` son frágiles (eventos que no se disparan,
sesiones huérfanas). El approach explícito es más largo pero:
- Sabemos exactamente qué acciones se auditan.
- No captura reads triviales (spam).
- Filtramos campos sensibles (passwords, tokens) sin adivinar.
- Falla del audit NO rompe la operación de negocio (best-effort).
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import DateTime, String
from sqlalchemy.dialects.postgresql import INET, JSONB, UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.core.logging_config import get_request_id

logger = logging.getLogger(__name__)


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True
    )
    # Actor
    user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True, index=True)
    username: Mapped[str | None] = mapped_column(String(64), nullable=True)
    role: Mapped[str | None] = mapped_column(String(32), nullable=True)
    # Acción
    action: Mapped[str] = mapped_column(String(64), nullable=False, index=True)  # ej. "seller.create"
    entity: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)  # ej. "seller"
    entity_id: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    # Contexto
    ip: Mapped[str | None] = mapped_column(INET, nullable=True)
    request_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # Payload flexible — diff, campos afectados, metadata
    payload: Mapped[dict | None] = mapped_column(JSONB, nullable=True)


# Campos que nunca deben aparecer en el payload aunque el caller los pase.
_REDACT_KEYS = frozenset({
    "password", "hashed_password", "new_password", "current_password", "confirm_password",
    "app_key", "app_token", "app_key_enc", "app_token_enc",
    "refresh_token", "access_token", "token", "secret",
})


def _redact(value: Any) -> Any:
    """Devuelve una copia del value con los campos sensibles reemplazados por '***'."""
    if isinstance(value, dict):
        return {k: ("***" if k.lower() in _REDACT_KEYS else _redact(v)) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [_redact(v) for v in value]
    return value


async def record_audit(
    db: AsyncSession,
    *,
    action: str,
    user=None,
    entity: str | None = None,
    entity_id: str | None = None,
    payload: dict | None = None,
    ip: str | None = None,
) -> None:
    """Registra un evento de auditoría. Best-effort: si falla, loguea pero no re-raise.

    Args:
        db: sesión activa. Se hace commit implícito.
        action: verbo canónico (ej. "seller.create", "user.deactivate", "sellers.export").
        user: modelo User o None si no hay actor (ej. login anónimo).
        entity: tipo de entidad afectada.
        entity_id: string del identificador (uuid, seller_id, etc.).
        payload: dict con campos afectados o diff. Campos sensibles se redactan automáticamente.
        ip: IP del cliente si se conoce.
    """
    try:
        entry = AuditLog(
            action=action,
            user_id=getattr(user, "id", None),
            username=getattr(user, "username", None),
            role=(user.role.value if user and hasattr(user.role, "value") else None),
            entity=entity,
            entity_id=str(entity_id) if entity_id is not None else None,
            ip=ip,
            request_id=get_request_id(),
            payload=_redact(payload) if payload else None,
        )
        db.add(entry)
        await db.commit()
    except Exception as e:  # noqa: BLE001
        logger.warning("record_audit falló (no fatal): action=%s error=%s", action, e)
        try:
            await db.rollback()
        except Exception:
            pass


def client_ip(request) -> str | None:
    """Extrae la IP del cliente respetando X-Forwarded-For (Railway proxy)."""
    fwd = request.headers.get("X-Forwarded-For")
    if fwd:
        return fwd.split(",")[0].strip()
    return request.client.host if request.client else None
