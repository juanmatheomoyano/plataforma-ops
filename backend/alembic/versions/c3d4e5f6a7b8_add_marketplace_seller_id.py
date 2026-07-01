"""add marketplace_seller_id to sellers

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-07-01

"""
from alembic import op
import sqlalchemy as sa

revision = 'c3d4e5f6a7b8'
down_revision = 'b2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('sellers', sa.Column('marketplace_seller_id', sa.String(length=128), nullable=True))


def downgrade() -> None:
    op.drop_column('sellers', 'marketplace_seller_id')
