import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.auth import get_current_user
from app.config import get_settings
from app.models.schemas import SearchRequest, SearchResponse, SearchResult
from app.services.embedder import Embedder, get_embedder
from app.services.gemini import GeminiService, get_gemini_service
from app.services.ingestion import ingest_source
from app.services.vector_store import VectorStore, get_vector_store
from app.utils.sanitize import sanitize_query

logger = logging.getLogger(__name__)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/search/", response_model=SearchResponse)
@limiter.limit("20/minute")
async def search(
    request: Request,
    body: SearchRequest,
    summary: bool = Query(default=True),
    user_id: str = Depends(get_current_user),
    embedder: Embedder = Depends(get_embedder),
    vector_store: VectorStore = Depends(get_vector_store),
    gemini_service: GeminiService = Depends(get_gemini_service),
) -> SearchResponse:
    body.query = sanitize_query(body.query)
    history = [{"query": m.query, "summary": m.summary} for m in body.history]

    if not body.search:
        ai_summary = await gemini_service.summarize(
            body.query, [], thinking=body.thinking, search_performed=False, history=history,
        )
        if ai_summary is None:
            logger.warning("AI summary missing for conversational query=%r, retrying in 2s", body.query)
            await asyncio.sleep(2)
            ai_summary = await gemini_service.summarize(
                body.query, [], thinking=body.thinking, search_performed=False, history=history,
            )
        if not ai_summary:
            logger.warning("AI summary still missing after retry for query=%r", body.query)
            ai_summary = gemini_service.fallback_chat_response(body.query)
        return SearchResponse(
            query=body.query,
            results=[],
            total=0,
            ai_summary=ai_summary,
            searched=False,
        )

    selected = await gemini_service.select_sources(body.query)

    SOURCE_MAP = {
        "web": "brave_search",
        "film": "tmdb",
        "music": "spotify",
    }

    try:
        logger.info("Selected sources for query=%r: %s", body.query, selected)
        ingest_tasks = [
            ingest_source(SOURCE_MAP[s], body.query)
            for s in selected if s in SOURCE_MAP
        ]
        if ingest_tasks:
            await asyncio.gather(*ingest_tasks)
    except Exception:
        logger.exception("Ingestion failed for query=%s", body.query)

    try:
        query_embedding = embedder.embed(body.query)
        raw = vector_store.query(
            query_embedding=query_embedding,
            top_k=body.top_k,
        )
    except Exception:
        logger.exception("Search query failed for: %s", body.query)
        raise HTTPException(status_code=500, detail="Internal search error")

    try:
        ids = raw["ids"][0]
        documents = raw["documents"][0]
        metadatas = raw["metadatas"][0]
        distances = raw["distances"][0]
    except (KeyError, IndexError):
        return SearchResponse(query=body.query, results=[], total=0, searched=True)

    results: list[SearchResult] = []
    for doc_id, content, metadata, distance in zip(
        ids, documents, metadatas, distances
    ):
        results.append(
            SearchResult(
                id=doc_id,
                content=content,
                source=metadata.get("source", "unknown"),
                score=round(1 - distance, 4),
                metadata=metadata,
            )
        )

    ai_summary = None
    settings = get_settings()
    if results and summary and settings.summary_enabled:
        result_dicts = [r.model_dump() for r in results[:5]]
        ai_summary = await gemini_service.summarize(
            body.query, result_dicts, thinking=body.thinking, history=history,
        )
        if ai_summary is None:
            logger.warning("AI summary failed for query=%r, retrying in 2s", body.query)
            await asyncio.sleep(2)
            ai_summary = await gemini_service.summarize(
                body.query, result_dicts, thinking=body.thinking, history=history,
            )
            if ai_summary is None:
                logger.warning("AI summary still failing after retry for query=%r", body.query)
                ai_summary = ""

    return SearchResponse(
        query=body.query,
        results=results,
        total=len(results),
        ai_summary=ai_summary,
        searched=True,
    )
