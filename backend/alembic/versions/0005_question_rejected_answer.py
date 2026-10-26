"""Незачёт у вопроса (необязательное поле).

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-05 00:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("questions", sa.Column("rejected_answer", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("questions", "rejected_answer")
