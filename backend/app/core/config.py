from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = (
        "postgresql+asyncpg://postgres:postgres@localhost:5432/chgkeditor"
    )
    # Куда складываются загруженные картинки-раздатки (относительно рабочей папки backend).
    uploads_dir: str = "uploads"


settings = Settings()
