"""crud_operation async status columns

Revision ID: f7a8b9c0d1e2
Revises: e5f6a7b8c9d0
Create Date: 2026-08-13 15:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = 'f7a8b9c0d1e2'
down_revision = 'e5f6a7b8c9d0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'crud_operations',
        sa.Column('status', sa.String(16), nullable=False, server_default='done'),
    )
    op.add_column(
        'crud_operations',
        sa.Column('total_units', sa.Integer(), nullable=False, server_default='0'),
    )
    op.add_column(
        'crud_operations',
        sa.Column('processed_units', sa.Integer(), nullable=False, server_default='0'),
    )
    op.add_column(
        'crud_operations',
        sa.Column('error_message', sa.Text(), nullable=True),
    )
    op.create_index(
        'ix_crud_operations_status', 'crud_operations', ['status']
    )


def downgrade() -> None:
    op.drop_index('ix_crud_operations_status', table_name='crud_operations')
    op.drop_column('crud_operations', 'error_message')
    op.drop_column('crud_operations', 'processed_units')
    op.drop_column('crud_operations', 'total_units')
    op.drop_column('crud_operations', 'status')
