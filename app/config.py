from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )

    app_name: str = "AI Search Engine"
    app_version: str = "0.1.0"
    debug: bool = False
    chroma_persist_dir: str = "./chroma_data"
    chroma_collection_name: str = "documents"
    allowed_origins: list[str] = ["http://localhost:3000"]

    # Week 4: Gemma integration fields go here

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_origins(cls, v: object) -> object:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()
