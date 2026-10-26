from pydantic import BaseModel, ConfigDict

from app.schemas.question import QuestionRead


class PackageBase(BaseModel):
    title: str
    is_unsorted: bool = False


class PackageCreate(PackageBase):
    # Если не передан — встанет в конец доски.
    order: int | None = None


class PackageUpdate(BaseModel):
    title: str | None = None
    order: int | None = None
    is_unsorted: bool | None = None


class PackageRead(PackageBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order: int
    questions: list[QuestionRead] = []
