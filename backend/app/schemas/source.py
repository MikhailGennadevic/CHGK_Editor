from pydantic import BaseModel, ConfigDict


class SourceBase(BaseModel):
    text: str


class SourceCreate(SourceBase):
    pass


class SourceUpdate(SourceBase):
    pass


class SourceRead(SourceBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    question_id: int
