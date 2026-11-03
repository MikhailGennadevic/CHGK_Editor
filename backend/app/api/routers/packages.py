from datetime import datetime, timezone
from urllib.parse import quote

from fastapi import APIRouter, HTTPException, Response, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import selectinload

from app.api.deps import SessionDep
from app.models import Package, Question
from app.schemas.package import DeletedPackageRead, PackageCreate, PackageRead, PackageUpdate
from app.services.docx_export import build_package_docx

router = APIRouter(prefix="/packages", tags=["packages"])


async def _get_package_or_404(session: SessionDep, package_id: int) -> Package:
    package = await session.scalar(
        select(Package)
        .where(Package.id == package_id, Package.deleted_at.is_(None))
        .options(selectinload(Package.questions))
    )
    if package is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found")
    return package


@router.get("", response_model=list[PackageRead])
async def list_packages(session: SessionDep) -> list[Package]:
    result = await session.scalars(
        select(Package)
        .where(Package.deleted_at.is_(None))
        .options(selectinload(Package.questions))
        .order_by(Package.order, Package.id)
    )
    return list(result.all())


# Важно: объявляется ДО /{package_id}, иначе «deleted» попадёт в {package_id} и уйдёт в 422.
@router.get("/deleted", response_model=list[DeletedPackageRead])
async def list_deleted_packages(session: SessionDep) -> list[DeletedPackageRead]:
    """Мягко удалённые пакеты — для панели восстановления."""
    rows = (
        await session.scalars(
            select(Package)
            .where(Package.deleted_at.is_not(None))
            .order_by(Package.deleted_at.desc(), Package.id)
        )
    ).all()

    out: list[DeletedPackageRead] = []
    for package in rows:
        # Вопросы, удалённые вместе с пакетом (тот же момент времени) — они и вернутся.
        count = await session.scalar(
            select(func.count(Question.id)).where(
                Question.package_id == package.id,
                Question.deleted_at == package.deleted_at,
            )
        )
        out.append(
            DeletedPackageRead(
                id=package.id,
                title=package.title,
                order=package.order,
                is_unsorted=package.is_unsorted,
                deleted_at=package.deleted_at,
                questions_count=count or 0,
            )
        )
    return out


@router.post("", response_model=PackageRead, status_code=status.HTTP_201_CREATED)
async def create_package(payload: PackageCreate, session: SessionDep) -> Package:
    if payload.order is None:
        max_order = await session.scalar(select(func.max(Package.order)).where(Package.deleted_at.is_(None)))
        order = (max_order + 1) if max_order is not None else 0
    else:
        order = payload.order

    package = Package(title=payload.title, order=order, is_unsorted=payload.is_unsorted)
    session.add(package)
    await session.flush()
    await session.refresh(package)
    return package


@router.get("/{package_id}", response_model=PackageRead)
async def get_package(package_id: int, session: SessionDep) -> Package:
    return await _get_package_or_404(session, package_id)


@router.get("/{package_id}/docx")
async def export_package_docx(package_id: int, session: SessionDep) -> Response:
    """Файл пакета в формате печатного тура (docx); см. app/services/docx_export.py."""
    package = await _get_package_or_404(session, package_id)
    buffer = build_package_docx(package)
    filename = f"{package.title}.docx"
    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            # Для имён с кириллицей нужен RFC 5987 (filename*), ASCII-вариант — заглушка.
            "Content-Disposition": f"attachment; filename=\"package.docx\"; filename*=UTF-8''{quote(filename)}",
        },
    )


@router.patch("/{package_id}", response_model=PackageRead)
async def update_package(package_id: int, payload: PackageUpdate, session: SessionDep) -> Package:
    package = await _get_package_or_404(session, package_id)
    data = payload.model_dump(exclude_unset=True)

    if "order" in data and data["order"] != package.order:
        # Сдвиг колонки на доске: вынимаем её и вставляем на новое место.
        others = (
            await session.scalars(
                select(Package)
                .where(Package.id != package_id, Package.deleted_at.is_(None))
                .order_by(Package.order, Package.id)
            )
        ).all()
        ordered = list(others)
        insert_at = min(max(0, data["order"]), len(ordered))
        ordered.insert(insert_at, package)
        for idx, row in enumerate(ordered):
            row.order = idx

    for field, value in data.items():
        if field != "order":
            setattr(package, field, value)

    await session.flush()
    await session.refresh(package)
    return package


@router.delete("/{package_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_package(package_id: int, session: SessionDep) -> None:
    package = await _get_package_or_404(session, package_id)

    if package.is_unsorted:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the 'unsorted' package",
        )

    # Мягкое удаление: пакет и все его вопросы получают один и тот же deleted_at.
    now = datetime.now(timezone.utc)
    package.deleted_at = now
    await session.execute(
        update(Question)
        .where(Question.package_id == package_id, Question.deleted_at.is_(None))
        .values(deleted_at=now)
    )
    await session.flush()

    # Колонки на доске — снова плотный порядок 0..n-1.
    remaining = (
        await session.scalars(
            select(Package).where(Package.deleted_at.is_(None)).order_by(Package.order, Package.id)
        )
    ).all()
    for idx, row in enumerate(remaining):
        row.order = idx


@router.post("/{package_id}/restore", response_model=PackageRead)
async def restore_package(package_id: int, session: SessionDep) -> Package:
    """Восстанавливает мягко удалённый пакет и вопросы, удалённые вместе с ним."""
    package = await session.scalar(
        select(Package).where(Package.id == package_id, Package.deleted_at.is_not(None))
    )
    if package is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Package not found")

    deleted_at = package.deleted_at
    # Возвращаем только вопросы, удалённые в момент удаления пакета;
    # более ранние самостоятельные удаления остаются скрытыми.
    await session.execute(
        update(Question)
        .where(Question.package_id == package_id, Question.deleted_at == deleted_at)
        .values(deleted_at=None)
    )
    # Порядок на доске был «сжат» при удалении — ставим пакет в конец.
    max_order = await session.scalar(
        select(func.max(Package.order)).where(Package.deleted_at.is_(None))
    )
    package.order = (max_order + 1) if max_order is not None else 0
    package.deleted_at = None
    await session.flush()
    # questions могли подтянуться пустыми до восстановления — перечитываем.
    await session.refresh(package, attribute_names=["questions"])
    return package
