"""rename analista_senior to supervisor

Revision ID: a1b2c3d4e5f6
Revises: f1a2b3c4d5e6
Create Date: 2026-06-05

"""
from alembic import op

revision = 'a1b2c3d4e5f6'
down_revision = 'f1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE userrole RENAME VALUE 'analista_senior' TO 'supervisor'")


def downgrade() -> None:
    op.execute("ALTER TYPE userrole RENAME VALUE 'supervisor' TO 'analista_senior'")
