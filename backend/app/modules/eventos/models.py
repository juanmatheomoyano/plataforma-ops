import uuid

from sqlalchemy import ARRAY, UUID, Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

from app.core.database import Base


class Evento(Base):
    __tablename__ = "eventos"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    nombre = Column(String, nullable=False)
    fecha_ini = Column(DateTime(timezone=True), nullable=False)
    fecha_fin = Column(DateTime(timezone=True), nullable=False)
    cuotas_requeridas = Column(ARRAY(Integer), nullable=False)
    max_cuota = Column(Integer, nullable=False)
    scope_seller_ids = Column(ARRAY(String), nullable=False, server_default="{}")
    creado_por = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, nullable=False, default=True)
