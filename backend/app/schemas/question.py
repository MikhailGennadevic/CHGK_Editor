from pydantic import BaseModel, ConfigDict

from app.schemas.alternative_answer import AlternativeAnswerCreate, AlternativeAnswerRead
from app.schemas.source import SourceCreate, SourceRead
from app.schemas.tester import TesterRead


class QuestionBase(BaseModel):
    text: str
    answer: str
    comment: str | None = None
    rejected_answer: str | None = None
    handout: str | None = None


class QuestionCreate(QuestionBase):
    package_id: int
    # Если не передан — встанет в конец пакета.
    order: int | None = None
    alternative_answers: list[AlternativeAnswerCreate] = []
    sources: list[SourceCreate] = []
    tester_ids: list[int] = []


class QuestionUpdate(BaseModel):
    # Только изменяемые поля. Смена пакета/порядка — через PATCH /questions/{id}/move.
    text: str | None = None
    answer: str | None = None
    comment: str | None = None
    rejected_answer: str | None = None
    # Имя файла из POST /uploads; null — убрать раздатку.
    handout: str | None = None
    # Если ключ присутствует в запросе — список заменяется целиком (включая []).
    alternative_answers: list[AlternativeAnswerCreate] | None = None
    sources: list[SourceCreate] | None = None
    tester_ids: list[int] | None = None


class QuestionRead(QuestionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    package_id: int
    order: int
    alternative_answers: list[AlternativeAnswerRead] = []
    sources: list[SourceRead] = []
    testers: list[TesterRead] = []


class QuestionMove(BaseModel):
    new_package_id: int
    new_order: int


class QuestionsAddTesters(BaseModel):
    question_ids: list[int]
    tester_ids: list[int]
