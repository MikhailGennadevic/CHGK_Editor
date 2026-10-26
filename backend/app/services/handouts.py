"""Файлы-раздатки: проверка имени, путь на диске, удаление."""
import re
from pathlib import Path

from app.core.config import settings

# Имена генерируем сами (uuid4.hex + расширение), поэтому принимаем только такой шаблон —
# это же защита от path traversal в handout, пришедшем от клиента.
NAME_RE = re.compile(r"^[0-9a-f]{32}\.(png|jpg|gif|webp)$")


def uploads_path() -> Path:
    path = Path(settings.uploads_dir)
    path.mkdir(parents=True, exist_ok=True)
    return path


def is_valid_name(name: str) -> bool:
    return NAME_RE.match(name) is not None and (uploads_path() / name).is_file()


def delete_file(name: str | None) -> None:
    if name and NAME_RE.match(name):
        (uploads_path() / name).unlink(missing_ok=True)
