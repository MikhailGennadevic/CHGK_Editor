"""Источник: поля title и url объединены в одно поле text.

Revision ID: 0004
Revises: 0003
Create Date: 2026-10-05 00:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("sources", sa.Column("text", sa.Text(), nullable=True))
    # "Название ссылка" — ссылка дописывается через пробел, если она была.
    op.execute(
        "UPDATE sources SET text = CASE WHEN url IS NULL OR url = '' "
        "THEN title ELSE title || ' ' || url END"
    )
    op.alter_column("sources", "text", nullable=False)
    op.drop_column("sources", "title")
    op.drop_column("sources", "url")


def downgrade() -> None:
    op.add_column("sources", sa.Column("title", sa.String(length=512), nullable=True))
    op.add_column("sources", sa.Column("url", sa.String(length=1024), nullable=True))
    # Разделить обратно нельзя — весь текст уходит в title.
    op.execute("UPDATE sources SET title = left(text, 512)")
    op.alter_column("sources", "title", nullable=False)
    op.drop_column("sources", "text")
