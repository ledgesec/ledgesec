"""Access and certificate state.

Revision ID: 0001
Revises:
Create Date: 2026-10-21

"""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "sites",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("domain", sa.Text(), nullable=False),
        sa.Column("origin_url", sa.Text(), nullable=False),
        sa.Column("origin_host", sa.Text(), nullable=False),
        sa.Column("origin_tls", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("verify_origin_tls", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("dry_run", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("domain"),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.Text(), primary_key=True),
        sa.Column("email", sa.Text(), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("role", sa.Text(), nullable=False),
        sa.Column("site_id", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("email"),
    )
    op.create_table(
        "cert_state",
        sa.Column("site_id", sa.Text(), sa.ForeignKey("sites.id"), primary_key=True),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("not_after", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("cert_state")
    op.drop_table("users")
    op.drop_table("sites")
