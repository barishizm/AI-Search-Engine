"""Seed ChromaDB with sample documents and run a test query."""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.embedder import get_embedder
from app.services.vector_store import get_vector_store

DOCUMENTS = [
    # News
    {
        "id": "news-1",
        "content": "NASA's Artemis III mission plans to land astronauts on the Moon's south pole by 2026, marking humanity's return to lunar exploration.",
        "source": "news",
    },
    {
        "id": "news-2",
        "content": "Global leaders gathered at the UN Climate Summit to discuss carbon reduction targets and renewable energy investments.",
        "source": "news",
    },
    # Music
    {
        "id": "music-1",
        "content": "The new album blends jazz fusion with electronic beats, featuring collaborations with Grammy-winning producers.",
        "source": "music",
    },
    {
        "id": "music-2",
        "content": "Classical orchestras are experimenting with AI-composed symphonies, sparking debate about creativity and authorship.",
        "source": "music",
    },
    # Film
    {
        "id": "film-1",
        "content": "The sci-fi epic set in deep space explores first contact with an alien civilization through the eyes of a linguist.",
        "source": "film",
    },
    {
        "id": "film-2",
        "content": "A documentary chronicles the rise and fall of a legendary Hollywood studio during the golden age of cinema.",
        "source": "film",
    },
    # Product
    {
        "id": "product-1",
        "content": "The latest smartwatch features blood oxygen monitoring, GPS tracking, and a 7-day battery life in a titanium body.",
        "source": "product",
    },
    {
        "id": "product-2",
        "content": "This noise-cancelling headphone uses adaptive EQ to adjust sound profiles based on the listener's ear shape.",
        "source": "product",
    },
]


def main() -> None:
    embedder = get_embedder()
    vector_store = get_vector_store()

    ids = [doc["id"] for doc in DOCUMENTS]
    texts = [doc["content"] for doc in DOCUMENTS]
    metadatas = [{"source": doc["source"]} for doc in DOCUMENTS]

    print(f"Generating embeddings for {len(texts)} documents...")
    embeddings = embedder.embed_batch(texts)

    print("Inserting into ChromaDB...")
    vector_store.upsert_documents(
        ids=ids,
        embeddings=embeddings,
        documents=texts,
        metadatas=metadatas,
    )
    print(f"Done. Collection now has {vector_store.count()} documents.\n")

    # Test query
    test_query = "space exploration"
    print(f'Test query: "{test_query}"')
    print("-" * 50)

    query_embedding = embedder.embed(test_query)
    results = vector_store.query(query_embedding=query_embedding, top_k=5)

    for rank, (doc_id, content, metadata, distance) in enumerate(
        zip(
            results["ids"][0],
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ),
        start=1,
    ):
        score = round(1 - distance, 4)
        print(f"  #{rank} [{metadata['source']}] (score: {score}) {doc_id}")
        print(f"      {content[:80]}...")
        print()


if __name__ == "__main__":
    main()
