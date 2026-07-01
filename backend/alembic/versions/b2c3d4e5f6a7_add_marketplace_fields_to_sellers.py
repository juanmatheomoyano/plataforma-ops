"""add marketplace fields to sellers

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-07-01

"""
from alembic import op
import sqlalchemy as sa

revision = 'b2c3d4e5f6a7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('sellers', sa.Column('marketplace_activo', sa.Boolean(), nullable=True))
    op.add_column('sellers', sa.Column('marketplace_seller_id', sa.String(length=128), nullable=True))
    op.add_column('sellers', sa.Column('marketplace_sync_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('sellers', 'marketplace_sync_at')
    op.drop_column('sellers', 'marketplace_seller_id')
    op.drop_column('sellers', 'marketplace_activo')
