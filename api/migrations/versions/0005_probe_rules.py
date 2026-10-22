"""Probe patterns live in Postgres and are matched when the journal is read.

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-22

"""

import sqlalchemy as sa
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "probe_rules",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("label", sa.Text(), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("pattern", sa.Text(), nullable=False),
        sa.Column("custom", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("kind", "pattern"),
    )
    from app.observation.rules import seed_rows

    table = sa.table(
        "probe_rules",
        sa.column("id", sa.Text()),
        sa.column("code", sa.Text()),
        sa.column("label", sa.Text()),
        sa.column("kind", sa.Text()),
        sa.column("pattern", sa.Text()),
        sa.column("custom", sa.Boolean()),
    )
    op.bulk_insert(table, seed_rows())


def downgrade() -> None:
    op.drop_table("probe_rules")
