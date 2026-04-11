import logging

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.auth import get_current_user
from app.models.schemas import IngestRequest, IngestResponse, IngestSourceResult
from app.services.ingestion import ingest_all

logger = logging.getLogger(__name__)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)

ALLOWED_SOURCES = {"web", "film", "music"}

SOURCE_MAP = {
    "web": "brave_search",
    "film": "tmdb",
    "music": "spotify",
}


@router.post("/ingest/", response_model=IngestResponse, status_code=202)
@limiter.limit("5/minute")
async def ingest(
    request: Request,
    body: IngestRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user),
) -> IngestResponse:
    invalid = set(body.sources) - ALLOWED_SOURCES
    if invalid:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid sources: {sorted(invalid)}. Allowed: {sorted(ALLOWED_SOURCES)}",
        )

    internal_sources = [SOURCE_MAP[s] for s in body.sources]
    background_tasks.add_task(ingest_all, body.query, internal_sources)

    return IngestResponse(
        status="ok",
        results=[
            IngestSourceResult(source=s, indexed=0, failed=0)
            for s in body.sources
        ],
    )
