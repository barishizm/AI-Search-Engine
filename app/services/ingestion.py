import asyncio
import logging

from app.config import get_settings
from app.services.embedder import get_embedder
from app.services.sources.brave_search import BraveSearchSource
from app.services.sources.spotify import SpotifySource
from app.services.sources.tmdb import TMDBSource
from app.services.vector_store import get_vector_store

logger = logging.getLogger(__name__)

SOURCE_FACTORIES = {
    "brave_search": lambda s: BraveSearchSource(
        api_key=s.brave_search_api_key,
        max_results=s.max_results_per_source,
    ),
    "tmdb": lambda s: TMDBSource(
        api_key=s.tmdb_api_key,
        max_results=s.max_results_per_source,
    ),
    "spotify": lambda s: SpotifySource(
        client_id=s.spotify_client_id,
        client_secret=s.spotify_client_secret,
        max_results=s.max_results_per_source,
    ),
}


async def ingest_web(query: str) -> dict:
    """Fast path: ingest only Brave Search results for a query."""
    return await ingest_source("brave_search", query)


async def ingest_source(source_name: str, query: str) -> dict:
    settings = get_settings()

    factory = SOURCE_FACTORIES.get(source_name)
    if factory is None:
        raise ValueError(f"Unknown source: {source_name}")

    source = factory(settings)
    logger.info("Fetching documents from %s for query=%r", source_name, query)
    documents = await source.fetch(query)

    if not documents:
        logger.warning("No documents returned from %s", source_name)
        return {"source": source_name, "indexed": 0, "failed": 0}

    logger.info("Fetched %d documents from %s", len(documents), source_name)

    embedder = get_embedder()
    vector_store = get_vector_store()
    batch_size = settings.ingest_batch_size

    indexed = 0
    failed = 0

    for i in range(0, len(documents), batch_size):
        batch = documents[i : i + batch_size]
        try:
            texts = [doc["text"] for doc in batch]
            ids = [doc["id"] for doc in batch]
            metadatas = [
                {**doc["metadata"], "source": doc["source"]} for doc in batch
            ]

            logger.info(
                "Embedding batch %d–%d (%d docs)",
                i,
                i + len(batch) - 1,
                len(batch),
            )
            embeddings = embedder.embed_batch(texts)

            logger.info("Upserting batch into ChromaDB")
            vector_store.upsert_documents(
                ids=ids,
                embeddings=embeddings,
                documents=texts,
                metadatas=metadatas,
            )
            indexed += len(batch)
        except Exception:
            logger.exception("Failed to process batch %d–%d", i, i + len(batch) - 1)
            failed += len(batch)

    logger.info(
        "Ingestion complete for %s: indexed=%d, failed=%d",
        source_name,
        indexed,
        failed,
    )
    return {"source": source_name, "indexed": indexed, "failed": failed}


async def ingest_all(query: str, sources: list[str]) -> list[dict]:
    tasks = [ingest_source(source, query) for source in sources]
    outcomes = await asyncio.gather(*tasks, return_exceptions=True)

    results = []
    for source, outcome in zip(sources, outcomes):
        if isinstance(outcome, Exception):
            logger.error("Ingestion failed for %s: %s", source, outcome)
            results.append({"source": source, "indexed": 0, "failed": 0, "error": str(outcome)})
        else:
            results.append(outcome)

    return results
