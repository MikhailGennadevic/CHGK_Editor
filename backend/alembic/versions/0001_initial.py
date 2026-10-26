"""Первая схема БД: packages, questions, alternative_answers, sources, testers, M2M.

Revision ID: 0001
Revises:
Create Date: 2026-09-13 00:00:00.000000

"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "packages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column("is_unsorted", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_packages_order"), "packages", ["order"], unique=False)

    op.create_table(
        "testers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    op.create_table(
        "questions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("package_id", sa.Integer(), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["package_id"], ["packages.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_questions_order"), "questions", ["order"], unique=False)
    op.create_index(op.f("ix_questions_package_id"), "questions", ["package_id"], unique=False)

    op.create_table(
        "alternative_answers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("text", sa.String(length=512), nullable=False),
        sa.ForeignKeyConstraint(["question_id"], ["questions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_alternative_answers_question_id"),
        "alternative_answers",
        ["question_id"],
        unique=False,
    )

    op.create_table(
        "sources",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=512), nullable=False),
        sa.Column("url", sa.String(length=1024), nullable=True),
        sa.ForeignKeyConstraint(["question_id"], ["questions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_sources_question_id"), "sources", ["question_id"], unique=False)

    op.create_table(
        "question_testers",
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("tester_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["question_id"], ["questions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tester_id"], ["testers.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("question_id", "tester_id"),
    )


def downgrade() -> None:
    op.drop_table("question_testers")
    op.drop_index(op.f("ix_sources_question_id"), table_name="sources")
    op.drop_table("sources")
    op.drop_index(op.f("ix_alternative_answers_question_id"), table_name="alternative_answers")
    op.drop_table("alternative_answers")
    op.drop_index(op.f("ix_questions_package_id"), table_name="questions")
    op.drop_index(op.f("ix_questions_order"), table_name="questions")
    op.drop_table("questions")
    op.drop_table("testers")
    op.drop_index(op.f("ix_packages_order"), table_name="packages")
    op.drop_table("packages")
