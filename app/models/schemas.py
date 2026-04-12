from pydantic import BaseModel, Field, field_validator


class MessageHistory(BaseModel):
    query: str
    summary: str


class SearchRequest(BaseModel):
    query: str = Field(max_length=1000)
    top_k: int = Field(default=5, ge=1, le=50)
    thinking: bool = False
    search: bool = False
    history: list[MessageHistory] = []

    @field_validator("query")
    @classmethod
    def query_must_not_be_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("query must not be blank")
        return v


class SearchResult(BaseModel):
    id: str
    content: str
    source: str
    score: float
    metadata: dict | None = None


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResult]
    total: int
    ai_summary: str | None = None
    searched: bool = False


class IngestRequest(BaseModel):
    query: str = Field(max_length=1000)
    sources: list[str]

    @field_validator("query")
    @classmethod
    def query_must_not_be_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("query must not be blank")
        return v


class IngestSourceResult(BaseModel):
    source: str
    indexed: int
    failed: int


class IngestResponse(BaseModel):
    status: str
    results: list[IngestSourceResult]


class HealthResponse(BaseModel):
    status: str
    version: str
    chroma_connected: bool
    doc_count: int
    ai_configured: bool
    ai_model: str
