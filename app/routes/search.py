import logging

from fastapi import APIRouter, Depends, HTTPException

from app.models.schemas import SearchRequest, SearchResponse, SearchResult
from app.services.embedder import Embedder, get_embedder
from app.services.vector_store import VectorStore, get_vector_store

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/search/", response_model=SearchResponse)
def search(
    request: SearchRequest,
    embedder: Embedder = Depends(get_embedder),
    vector_store: VectorStore = Depends(get_vector_store),
) -> SearchResponse:
    where = None
    if request.source_filter:
        where = {"source": request.source_filter}

    try:
        query_embedding = embedder.embed(request.query)
        raw = vector_store.query(
            query_embedding=query_embedding,
            top_k=request.top_k,
            where=where,
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

    return SearchResponse(
        query=request.query,
        results=results,
        total=len(results),
    )
