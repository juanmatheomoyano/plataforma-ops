"""create scheduler_locks

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-07-02

"""
from alembic import op
import sqlalchemy as sa

revision = 'd4e5f6a7b8c9'
down_revision = 'c3d4e5f6a7b8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'scheduler_locks',
        sa.Column('job_name', sa.String(length=64), primary_key=True),
        sa.Column('locked_until', sa.DateTime(timezone=True), nullable=False),
        sa.Column('locked_by', sa.String(length=128), nullable=False),
    )


def downgrade() -> None:
    op.drop_table('scheduler_locks')
