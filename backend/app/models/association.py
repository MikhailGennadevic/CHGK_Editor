from sqlalchemy import Column, ForeignKey, Table

from app.db.base import Base

question_testers = Table(
    "question_testers",
    Base.metadata,
    Column("question_id", ForeignKey("questions.id", ondelete="CASCADE"), primary_key=True),
    Column("tester_id", ForeignKey("testers.id", ondelete="CASCADE"), primary_key=True),
)
