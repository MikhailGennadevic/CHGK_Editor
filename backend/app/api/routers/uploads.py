import uuid

from fastapi import APIRouter, HTTPException, Request, status

from app.services.handouts import uploads_path

router = APIRouter(prefix="/uploads", tags=["uploads"])

MAX_SIZE = 10 * 1024 * 1024  # 10 МБ
EXTENSIONS = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
}


def _matches_signature(ext: str, data: bytes) -> bool:
    """Проверка содержимого по сигнатуре, чтобы не доверять одному Content-Type."""
    if ext == "png":
        return data.startswith(b"\x89PNG\r\n\x1a\n")
    if ext == "jpg":
        return data.startswith(b"\xff\xd8\xff")
    if ext == "gif":
        return data.startswith((b"GIF87a", b"GIF89a"))
    return data[:4] == b"RIFF" and data[8:12] == b"WEBP"  # webp


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_image(request: Request) -> dict[str, str]:
    """Загрузка картинки: тело запроса — сам файл, тип — в Content-Type (png/jpeg/gif/webp)."""
    content_type = request.headers.get("content-type", "").split(";")[0].strip().lower()
    ext = EXTENSIONS.get(content_type)
    if ext is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only png, jpeg, gif and webp images are allowed",
        )

    chunks: list[bytes] = []
    size = 0
    async for chunk in request.stream():
        size += len(chunk)
        if size > MAX_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Image is larger than 10 MB",
            )
        chunks.append(chunk)
    data = b"".join(chunks)

    if not _matches_signature(ext, data):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="File content is not a valid image"
        )

    filename = f"{uuid.uuid4().hex}.{ext}"
    (uploads_path() / filename).write_bytes(data)
    return {"filename": filename}
