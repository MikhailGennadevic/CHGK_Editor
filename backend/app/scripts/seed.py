"""Сид начальных данных: спец-пакет "Неотсортированное".

Идемпотентен: если пакет с is_unsorted=True уже есть — ничего не делает.

Запуск:  python -m app.scripts.seed
"""
import asyncio

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models import Package


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        existing = await session.scalar(select(Package).where(Package.is_unsorted.is_(True)))
        if existing is not None:
            print(f"Unsorted package already exists (id={existing.id}). Nothing to do.")
            return

        package = Package(title="Неотсортированное", order=0, is_unsorted=True)
        session.add(package)
        await session.commit()
        print(f"Created unsorted package (id={package.id}).")


if __name__ == "__main__":
    asyncio.run(seed())
