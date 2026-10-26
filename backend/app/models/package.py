from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Package(Base):
    __tablename__ = "packages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    # Позиция колонки на доске (Kanban).
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, index=True)
    # Помечает спец-колонку "Неотсортированное" (её нельзя удалить, в неё сливаются вопросы).
    is_unsorted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Мягкое удаление: не NULL — пакет (и его вопросы) скрыты, но остаются в БД.
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )

    questions: Mapped[list["Question"]] = relationship(  # noqa: F821
        back_populates="package",
        # Мягко удалённые вопросы в пакет не попадают ни при каком способе загрузки.
        primaryjoin="and_(Package.id == Question.package_id, Question.deleted_at.is_(None))",
        cascade="all, delete-orphan",
        order_by="Question.order",
        lazy="selectin",
    )
