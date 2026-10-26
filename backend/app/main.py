from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.routers import packages, questions, testers, uploads
from app.services.handouts import uploads_path

app = FastAPI(title="CHGK Editor API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(packages.router)
app.include_router(questions.router)
app.include_router(testers.router)
app.include_router(uploads.router)
# Раздача загруженных картинок (в dev фронт ходит через /api/uploads/...).
app.mount("/uploads", StaticFiles(directory=uploads_path()), name="uploads")


@app.get("/health", tags=["meta"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
