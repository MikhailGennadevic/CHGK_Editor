"""Мягкое удаление: deleted_at у packages и questions.

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-05 00:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    for table in ("packages", "questions"):
        op.add_column(table, sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
        op.create_index(op.f(f"ix_{table}_deleted_at"), table, ["deleted_at"], unique=False)


def downgrade() -> None:
    for table in ("questions", "packages"):
        op.drop_index(op.f(f"ix_{table}_deleted_at"), table_name=table)
        op.drop_column(table, "deleted_at")
