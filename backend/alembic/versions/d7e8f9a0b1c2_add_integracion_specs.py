"""add integracion_specs table and integracion_spec column to sellers

Revision ID: d7e8f9a0b1c2
Revises: aebf175eabcb
Create Date: 2026-05-25
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID

revision: str = "d7e8f9a0b1c2"
down_revision: Union[str, Sequence[str], None] = "aebf175eabcb"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "integracion_specs",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("integracion", sa.String(100), nullable=False),
        sa.Column("spec", sa.String(150), nullable=False),
        sa.Column("created_by", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("integracion", "spec", name="uq_integracion_spec"),
    )

    op.add_column("sellers", sa.Column("integracion_spec", sa.String(255), nullable=True))

    # Seed initial data
    op.execute("""
        INSERT INTO integracion_specs (integracion, spec) VALUES
        ('Manual', 'Seller Center'),
        ('Manual', 'Grow2On'),
        ('Manual', 'IDUO'),
        ('Manual', 'Zeus'),
        ('Propia', 'IDUO'),
        ('Propia', 'Zeus')
        ON CONFLICT DO NOTHING
    """)


def downgrade() -> None:
    op.drop_column("sellers", "integracion_spec")
    op.drop_table("integracion_specs")
