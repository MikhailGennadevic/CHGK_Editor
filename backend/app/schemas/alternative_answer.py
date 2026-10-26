from pydantic import BaseModel, ConfigDict


class AlternativeAnswerBase(BaseModel):
    text: str


class AlternativeAnswerCreate(AlternativeAnswerBase):
    pass


class AlternativeAnswerUpdate(AlternativeAnswerBase):
    pass


class AlternativeAnswerRead(AlternativeAnswerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question_id: int
