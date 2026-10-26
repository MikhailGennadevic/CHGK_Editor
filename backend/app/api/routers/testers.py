from fastapi import APIRouter, Response, status
from sqlalchemy import func, select

from app.api.deps import SessionDep
from app.models import Tester
from app.schemas.tester import TesterCreate, TesterRead

router = APIRouter(prefix="/testers", tags=["testers"])


@router.get("", response_model=list[TesterRead])
async def list_testers(session: SessionDep) -> list[Tester]:
    return list((await session.scalars(select(Tester).order_by(Tester.name, Tester.id))).all())


@router.post("", response_model=TesterRead, status_code=status.HTTP_201_CREATED)
async def create_tester(payload: TesterCreate, session: SessionDep, response: Response) -> Tester:
    name = " ".join(payload.name.split())
    # Тестер с таким именем (без учёта регистра) уже есть — возвращаем его, а не плодим дубль.
    existing = await session.scalar(select(Tester).where(func.lower(Tester.name) == name.lower()))
    if existing is not None:
        response.status_code = status.HTTP_200_OK
        return existing

    tester = Tester(name=name)
    session.add(tester)
    await session.flush()
    await session.refresh(tester)
    return tester
