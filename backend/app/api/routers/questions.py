from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.api.deps import SessionDep
from app.models import AlternativeAnswer, Package, Question, Source, Tester
from app.schemas.question import (
    QuestionCreate,
    QuestionMove,
    QuestionRead,
    QuestionsAddTesters,
    QuestionUpdate,
)
from app.services.handouts import delete_file, is_valid_name
from app.services.question_service import move_question, next_order, repack_order

router = APIRouter(prefix="/questions", tags=["questions"])


async def _get_question_or_404(session: SessionDep, question_id: int) -> Question:
    question = await session.scalar(
        select(Question)
        .where(Question.id == question_id, Question.deleted_at.is_(None))
        .options(
            selectinload(Question.alternative_answers),
            selectinload(Question.sources),
            selectinload(Question.testers),
        )
    )
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")
    return question


def _check_handout(name: str | None) -> None:
    if name is not None and not is_valid_name(name):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown handout file")


async def _resolve_testers(session: SessionDep, tester_ids: list[int]) -> list[Tester]:
    if not tester_ids:
        return []
    testers = (await session.scalars(select(Tester).where(Tester.id.in_(tester_ids)))).all()
    if len(testers) != len(set(tester_ids)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown tester id")
    return list(testers)


@router.get("", response_model=list[QuestionRead])
async def list_questions(session: SessionDep, package_id: int | None = None) -> list[Question]:
    stmt = (
        select(Question)
        .where(Question.deleted_at.is_(None))
        .order_by(Question.order, Question.id)
    )
    if package_id is not None:
        stmt = stmt.where(Question.package_id == package_id)
    return list((await session.scalars(stmt)).all())


@router.post("", response_model=QuestionRead, status_code=status.HTTP_201_CREATED)
async def create_question(payload: QuestionCreate, session: SessionDep) -> Question:
    package = await session.scalar(select(Package).where(Package.id == payload.package_id, Package.deleted_at.is_(None))
    )
    if package is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown package_id")

    _check_handout(payload.handout)

    order = (
        payload.order
        if payload.order is not None
        else await next_order(session, payload.package_id)
    )

    question = Question(
        package_id=payload.package_id,
        order=order,
        text=payload.text,
        answer=payload.answer,
        comment=payload.comment,
        rejected_answer=payload.rejected_answer,
        handout=payload.handout,
    )
    question.alternative_answers = [
        AlternativeAnswer(text=a.text) for a in payload.alternative_answers
    ]
    question.sources = [Source(text=s.text) for s in payload.sources]
    question.testers = await _resolve_testers(session, payload.tester_ids)

    session.add(question)
    await session.flush()
    await session.refresh(question)
    return question


@router.post("/bulk/testers", response_model=list[QuestionRead])
async def add_testers_to_questions(
    payload: QuestionsAddTesters, session: SessionDep
) -> list[Question]:
    """Массово добавляет тестеров ко всем перечисленным вопросам (уже назначенные не дублируются)."""
    question_ids = list(dict.fromkeys(payload.question_ids))
    testers = await _resolve_testers(session, list(dict.fromkeys(payload.tester_ids)))

    questions = list(
        (
            await session.scalars(
                select(Question)
                .where(Question.id.in_(question_ids), Question.deleted_at.is_(None))
                .options(selectinload(Question.testers))
                .order_by(Question.order, Question.id)
            )
        ).all()
    )
    if len(questions) != len(question_ids):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    for question in questions:
        have = {t.id for t in question.testers}
        question.testers.extend(t for t in testers if t.id not in have)

    await session.flush()
    return questions


@router.get("/{question_id}", response_model=QuestionRead)
async def get_question(question_id: int, session: SessionDep) -> Question:
    return await _get_question_or_404(session, question_id)


@router.patch("/{question_id}", response_model=QuestionRead)
async def update_question(
    question_id: int, payload: QuestionUpdate, session: SessionDep
) -> Question:
    question = await _get_question_or_404(session, question_id)
    data = payload.model_dump(exclude_unset=True)

    for field in ("text", "answer", "comment", "rejected_answer"):
        if field in data:
            setattr(question, field, data[field])

    old_handout = question.handout
    if "handout" in data:
        _check_handout(data["handout"])
        question.handout = data["handout"]

    if "alternative_answers" in data:
        question.alternative_answers = [
            AlternativeAnswer(text=a["text"]) for a in data["alternative_answers"]
        ]
    if "sources" in data:
        question.sources = [Source(text=s["text"]) for s in data["sources"]]
    if "tester_ids" in data:
        question.testers = await _resolve_testers(session, data["tester_ids"])

    await session.flush()
    await session.refresh(question)
    # Заменили или убрали раздатку — старый файл больше никому не нужен.
    if old_handout and old_handout != question.handout:
        delete_file(old_handout)
    return question


@router.patch("/{question_id}/move", response_model=QuestionRead)
async def move_question_endpoint(
    question_id: int, payload: QuestionMove, session: SessionDep
) -> Question:
    question = await _get_question_or_404(session, question_id)
    package = await session.scalar(select(Package).where(Package.id == payload.new_package_id, Package.deleted_at.is_(None))
    )
    if package is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Unknown new_package_id"
        )

    await move_question(session, question, payload.new_package_id, payload.new_order)
    await session.refresh(question)
    return question


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_question(question_id: int, session: SessionDep) -> None:
    """Мягкое удаление: вопрос скрывается, но остаётся в БД (картинка-раздатка тоже)."""
    question = await _get_question_or_404(session, question_id)
    question.deleted_at = datetime.now(timezone.utc)
    await session.flush()
    await repack_order(session, question.package_id)
