from functools import lru_cache
from typing import Union

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
    allowed_origins: Union[str, list] = "http://localhost:3000,http://localhost:3001"
    brave_search_api_key: str = ""
    tmdb_api_key: str = ""
    spotify_client_id: str = ""
    spotify_client_secret: str = ""
    ingest_batch_size: int = 50
    max_results_per_source: int = 20

    # Supabase
    supabase_jwt_secret: str = ""

    # AI model (Google AI Studio)
    google_ai_api_key: str = ""
    ai_model: str = "gemini-3.1-flash-lite-preview"
    summary_max_tokens: int = 500
    summary_enabled: bool = True

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_origins(cls, v):
        if isinstance(v, list):
            return ",".join(v)
        v = str(v).strip().strip("[]").replace('"', '').replace("'", "")
        return v

    def get_origins_list(self) -> list:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
