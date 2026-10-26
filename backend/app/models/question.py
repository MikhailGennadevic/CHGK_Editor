from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.association import question_testers


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    package_id: Mapped[int] = mapped_column(
        ForeignKey("packages.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    # Позиция вопроса внутри пакета.
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, index=True)

    text: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Незачёт: ответы, которые не засчитываются (необязательно).
    rejected_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Раздатка: имя файла картинки в uploads_dir (см. app/services/handouts.py).
    handout: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Ставится вместе с Package.deleted_at (тот же момент времени) при удалении пакета.
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )

    package: Mapped["Package"] = relationship(back_populates="questions")  # noqa: F821
    alternative_answers: Mapped[list["AlternativeAnswer"]] = relationship(  # noqa: F821
        back_populates="question",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    sources: Mapped[list["Source"]] = relationship(  # noqa: F821
        back_populates="question",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    testers: Mapped[list["Tester"]] = relationship(  # noqa: F821
        secondary=question_testers,
        back_populates="questions",
        lazy="selectin",
    )
