"""create audit_log table

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-08-05

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = 'e5f6a7b8c9d0'
down_revision = 'd4e5f6a7b8c9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'audit_log',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('timestamp', sa.DateTime(timezone=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('username', sa.String(length=64), nullable=True),
        sa.Column('role', sa.String(length=32), nullable=True),
        sa.Column('action', sa.String(length=64), nullable=False),
        sa.Column('entity', sa.String(length=64), nullable=True),
        sa.Column('entity_id', sa.String(length=128), nullable=True),
        sa.Column('ip', postgresql.INET(), nullable=True),
        sa.Column('request_id', sa.String(length=64), nullable=True),
        sa.Column('payload', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_audit_log_timestamp', 'audit_log', ['timestamp'])
    op.create_index('ix_audit_log_user_id', 'audit_log', ['user_id'])
    op.create_index('ix_audit_log_action', 'audit_log', ['action'])
    op.create_index('ix_audit_log_entity', 'audit_log', ['entity'])
    op.create_index('ix_audit_log_entity_id', 'audit_log', ['entity_id'])


def downgrade() -> None:
    op.drop_index('ix_audit_log_entity_id', table_name='audit_log')
    op.drop_index('ix_audit_log_entity', table_name='audit_log')
    op.drop_index('ix_audit_log_action', table_name='audit_log')
    op.drop_index('ix_audit_log_user_id', table_name='audit_log')
    op.drop_index('ix_audit_log_timestamp', table_name='audit_log')
    op.drop_table('audit_log')
