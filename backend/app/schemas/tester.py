from pydantic import BaseModel, ConfigDict


class TesterBase(BaseModel):
    name: str


class TesterCreate(TesterBase):
    pass


class TesterUpdate(TesterBase):
    pass


class TesterRead(TesterBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
