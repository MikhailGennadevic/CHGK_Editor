from datetime import datetime

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


class DeletedPackageRead(PackageBase):
    """Мягко удалённый пакет для панели восстановления."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    order: int
    deleted_at: datetime
    # Сколько вопросов вернётся вместе с пакетом (удалённых в момент удаления пакета).
    questions_count: int = 0
