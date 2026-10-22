"""A host belongs to the user who added it.

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-22

"""

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("hosts", sa.Column("owner_id", sa.Text(), sa.ForeignKey("users.id"), nullable=True))


def downgrade() -> None:
    op.drop_column("hosts", "owner_id")
