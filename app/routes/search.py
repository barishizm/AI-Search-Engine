import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException, Query

from app.config import get_settings
from app.models.schemas import SearchRequest, SearchResponse, SearchResult
from app.services.embedder import Embedder, get_embedder
from app.services.gemma import GemmaService, get_gemma_service
from app.services.ingestion import ingest_source
from app.services.vector_store import VectorStore, get_vector_store

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/search/", response_model=SearchResponse)
async def search(
    request: SearchRequest,
    summary: bool = Query(default=True),
    embedder: Embedder = Depends(get_embedder),
    vector_store: VectorStore = Depends(get_vector_store),
    gemma_service: GemmaService = Depends(get_gemma_service),
) -> SearchResponse:
    try:
        await asyncio.gather(
            ingest_source("brave_search", request.query),
            ingest_source("tmdb", request.query),
            ingest_source("spotify", request.query),
        )
    except Exception:
        logger.exception("Ingestion failed for query=%s", request.query)

    try:
        query_embedding = embedder.embed(request.query)
        raw = vector_store.query(
            query_embedding=query_embedding,
            top_k=request.top_k,
        )
    except Exception:
        logger.exception("Search query failed for: %s", request.query)
        raise HTTPException(status_code=500, detail="Internal search error")

    try:
        ids = raw["ids"][0]
        documents = raw["documents"][0]
        metadatas = raw["metadatas"][0]
        distances = raw["distances"][0]
    except (KeyError, IndexError):
        return SearchResponse(query=request.query, results=[], total=0)

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
        ai_summary = await gemma_service.summarize(request.query, result_dicts, thinking=request.thinking)

    return SearchResponse(
        query=request.query,
        results=results,
        total=len(results),
        ai_summary=ai_summary,
    )
