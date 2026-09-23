"""user.roles v2 multi-rol

Revision ID: b1c2d3e4f5a6
Revises: f7a8b9c0d1e2
Create Date: 2026-09-23 13:15:00.000000

Agrega `users.roles` como ARRAY(String(32)) para el sistema multi-rol v2 (HU-38).
Backfill inicial desde `role` legacy vía LEGACY_ROLE_MAPPING:
  admin      → [owner, admin]
  supervisor → [admin]
  analista   → [categorias]
  viewer     → [categorias]

La columna `role` se preserva porque los guards legacy la siguen usando durante
la transición (v2.0 → v2.1 mueve los guards al chequeo any-match sobre `roles`).
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY


revision = 'b1c2d3e4f5a6'
down_revision = 'f7a8b9c0d1e2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('roles', ARRAY(sa.String(32)), nullable=True),
    )

    # Backfill: mapea rol único legacy a lista v2 según LEGACY_ROLE_MAPPING.
    op.execute("""
        UPDATE users SET roles = ARRAY['owner','admin']::varchar[]
        WHERE role = 'admin' AND roles IS NULL
    """)
    op.execute("""
        UPDATE users SET roles = ARRAY['admin']::varchar[]
        WHERE role = 'supervisor' AND roles IS NULL
    """)
    op.execute("""
        UPDATE users SET roles = ARRAY['categorias']::varchar[]
        WHERE role IN ('analista','viewer') AND roles IS NULL
    """)


def downgrade() -> None:
    op.drop_column('users', 'roles')
