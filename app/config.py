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
    allowed_origins: list[str] = ["http://localhost:3000", "http://localhost:3001"]
    brave_search_api_key: str = ""
    tmdb_api_key: str = ""
    spotify_client_id: str = ""
    spotify_client_secret: str = ""
    ingest_batch_size: int = 50
    max_results_per_source: int = 20

    # Week 4: Gemma integration
    google_ai_api_key: str = ""
    gemma_model: str = "gemma-4-26b-a4b-it"
    summary_max_tokens: int = 500
    summary_enabled: bool = True

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_origins(cls, v: object) -> object:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()
