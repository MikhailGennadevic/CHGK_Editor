from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Question


async def next_order(session: AsyncSession, package_id: int) -> int:
    """Первый свободный порядок в конце пакета."""
    max_order = await session.scalar(
        select(func.max(Question.order)).where(
            Question.package_id == package_id, Question.deleted_at.is_(None)
        )
    )
    return (max_order + 1) if max_order is not None else 0


async def repack_order(
    session: AsyncSession, package_id: int, exclude_id: int | None = None
) -> None:
    """Сжимает порядок в пакете до плотного 0..n-1 (после удаления/ухода вопроса)."""
    stmt = (
        select(Question)
        .where(Question.package_id == package_id, Question.deleted_at.is_(None))
        .order_by(Question.order, Question.id)
    )
    if exclude_id is not None:
        stmt = stmt.where(Question.id != exclude_id)
    rows = (await session.scalars(stmt)).all()
    for idx, row in enumerate(rows):
        row.order = idx


async def move_question(
    session: AsyncSession, question: Question, new_package_id: int, new_order: int
) -> Question:
    """
    Перенос вопроса в пакет на позицию new_order.

    Алгоритм:
      1. Меняем пакет вопроса.
      2. Берём вопросы целевого пакета (без переносимого), вставляем переносимый
         на индекс new_order и заново нумеруем 0..n-1.
      3. Если пакет сменился — сжимаем порядок в старом пакете.
    """
    old_package_id = question.package_id
    if old_package_id == new_package_id:
        new_order = max(0, new_order)

    question.package_id = new_package_id
    await session.flush()

    # Целевой пакет: все вопросы кроме переносимого, в текущем порядке.
    target = (
        await session.scalars(
            select(Question)
            .where(
                Question.package_id == new_package_id,
                Question.id != question.id,
                Question.deleted_at.is_(None),
            )
            .order_by(Question.order, Question.id)
        )
    ).all()

    insert_at = min(max(0, new_order), len(target))
    ordered = list(target)
    ordered.insert(insert_at, question)
    for idx, row in enumerate(ordered):
        row.order = idx

    if old_package_id != new_package_id:
        await repack_order(session, old_package_id, exclude_id=question.id)

    await session.flush()
    return question
