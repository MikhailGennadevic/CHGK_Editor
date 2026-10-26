from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.association import question_testers


class Tester(Base):
    __tablename__ = "testers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)

    questions: Mapped[list["Question"]] = relationship(  # noqa: F821
        secondary=question_testers,
        back_populates="testers",
    )
