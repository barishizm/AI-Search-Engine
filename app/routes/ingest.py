import logging

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.models.schemas import IngestRequest, IngestResponse, IngestSourceResult
from app.services.ingestion import ingest_all

logger = logging.getLogger(__name__)

router = APIRouter()

ALLOWED_SOURCES = {"web", "film", "music"}

SOURCE_MAP = {
    "web": "brave_search",
    "film": "tmdb",
    "music": "spotify",
}


@router.post("/ingest/", response_model=IngestResponse, status_code=202)
async def ingest(
    request: IngestRequest,
    background_tasks: BackgroundTasks,
) -> IngestResponse:
    invalid = set(request.sources) - ALLOWED_SOURCES
    if invalid:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid sources: {sorted(invalid)}. Allowed: {sorted(ALLOWED_SOURCES)}",
        )

    internal_sources = [SOURCE_MAP[s] for s in request.sources]
    background_tasks.add_task(ingest_all, request.query, internal_sources)

    return IngestResponse(
        status="ok",
        results=[
            IngestSourceResult(source=s, indexed=0, failed=0)
            for s in request.sources
        ],
    )
