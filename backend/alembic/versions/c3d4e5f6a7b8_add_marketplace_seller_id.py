"""add marketplace_seller_id to sellers

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-07-01

NO-OP: esta migración quedó obsoleta.

Historial: se creó como fix pensando que `b2c3d4e5f6a7` no había aplicado el
campo `marketplace_seller_id` en prod. En realidad `b2c3` sí lo agregaba (línea 19).
En prod se marcó `c3d4` como aplicada manualmente para saltearla. Desde cero
(CI o instalación nueva), correr esta migración lanzaba `DuplicateColumnError`.

Se convierte en no-op para preservar la cadena de revisiones sin duplicar la columna.
Ver commit `b6d70f3` y RETRO.md → "migración modificada post-apply".
"""
from alembic import op  # noqa: F401
import sqlalchemy as sa  # noqa: F401

revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # No-op — columna ya agregada por b2c3d4e5f6a7.
    pass


def downgrade() -> None:
    # No-op — el downgrade real de esta columna vive en b2c3d4e5f6a7.
    pass
