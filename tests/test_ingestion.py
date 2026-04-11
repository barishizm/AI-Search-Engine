import time
from unittest.mock import AsyncMock, patch

import httpx
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.services.sources.brave_search import BraveSearchSource
from app.services.sources.spotify import SpotifySource
from app.services.sources.tmdb import TMDBSource

pytestmark = pytest.mark.anyio

pytest_plugins = ('anyio',)


@pytest.fixture(params=["asyncio"])
def anyio_backend(request):
    return request.param


def _make_response(status_code: int, json_data: dict) -> httpx.Response:
    """Build a fake httpx.Response that supports raise_for_status()."""
    request = httpx.Request("GET", "https://fake")
    return httpx.Response(status_code, json=json_data, request=request)


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


# ---------------------------------------------------------------------------
# 1. BraveSearchSource.fetch() returns correctly shaped dicts
# ---------------------------------------------------------------------------


async def test_brave_search_fetch_returns_correct_shape():
    fake_response = _make_response(
        200,
        {
            "web": {
                "results": [
                    {
                        "url": "https://example.com/article",
                        "title": "Example Article",
                        "description": "A test description",
                        "page_age": "2024-01-01",
                    },
                    {
                        "url": "https://example.com/other",
                        "title": "Other",
                        "description": "Another description",
                    },
                ]
            }
        },
    )

    with patch("app.services.sources.brave_search.httpx.AsyncClient") as mock_client:
        mock_instance = mock_client.return_value
        mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
        mock_instance.__aexit__ = AsyncMock(return_value=False)
        mock_instance.get = AsyncMock(return_value=fake_response)

        source = BraveSearchSource(api_key="fake-key", max_results=5)
        results = await source.fetch("test query")

    assert len(results) == 2
    for doc in results:
        assert set(doc.keys()) == {"id", "text", "source", "metadata"}
        assert isinstance(doc["id"], str) and len(doc["id"]) == 16
        assert doc["source"] == "web"
        assert "url" in doc["metadata"]
        assert "title" in doc["metadata"]
        assert "description" in doc["metadata"]
        assert "published" in doc["metadata"]

    assert results[0]["text"] == "A test description"
    assert results[0]["metadata"]["url"] == "https://example.com/article"
    assert results[0]["metadata"]["published"] == "2024-01-01"


# ---------------------------------------------------------------------------
# 2. TMDBSource.fetch() skips movies with empty overview
# ---------------------------------------------------------------------------


async def test_tmdb_fetch_skips_empty_overview():
    fake_response = _make_response(
        200,
        {
            "results": [
                {"id": 1, "title": "Good Movie", "overview": "A great film"},
                {"id": 2, "title": "No Overview", "overview": ""},
                {"id": 3, "title": "Also Empty", "overview": None},
                {"id": 4, "title": "Another Good", "overview": "Has a plot"},
            ]
        },
    )

    with patch("app.services.sources.tmdb.httpx.AsyncClient") as mock_client:
        mock_instance = mock_client.return_value
        mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
        mock_instance.__aexit__ = AsyncMock(return_value=False)
        mock_instance.get = AsyncMock(return_value=fake_response)

        source = TMDBSource(api_key="fake-key", max_results=10)
        results = await source.fetch("action")

    assert len(results) == 2
    titles = [r["metadata"]["title"] for r in results]
    assert "Good Movie" in titles
    assert "Another Good" in titles
    assert "No Overview" not in titles
    assert "Also Empty" not in titles


# ---------------------------------------------------------------------------
# 3. SpotifySource._get_token() caches token and doesn't re-fetch before expiry
# ---------------------------------------------------------------------------


async def test_spotify_get_token_caches_and_does_not_refetch():
    fake_token_response = _make_response(
        200,
        {"access_token": "tok-abc123", "expires_in": 3600},
    )

    with patch("app.services.sources.spotify.httpx.AsyncClient") as mock_client:
        mock_instance = mock_client.return_value
        mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
        mock_instance.__aexit__ = AsyncMock(return_value=False)
        mock_instance.post = AsyncMock(return_value=fake_token_response)

        source = SpotifySource(client_id="id", client_secret="secret", max_results=5)

        token1 = await source._get_token()
        token2 = await source._get_token()

    assert token1 == "tok-abc123"
    assert token2 == "tok-abc123"
    # HTTP post should only be called once — the second call uses the cache
    assert mock_instance.post.call_count == 1


async def test_spotify_get_token_refetches_after_expiry():
    fake_token_response = _make_response(
        200,
        {"access_token": "tok-first", "expires_in": 3600},
    )

    with patch("app.services.sources.spotify.httpx.AsyncClient") as mock_client:
        mock_instance = mock_client.return_value
        mock_instance.__aenter__ = AsyncMock(return_value=mock_instance)
        mock_instance.__aexit__ = AsyncMock(return_value=False)
        mock_instance.post = AsyncMock(return_value=fake_token_response)

        source = SpotifySource(client_id="id", client_secret="secret", max_results=5)

        await source._get_token()

        # Simulate expiry by setting the expiration to the past
        source._token_expires_at = time.time() - 1

        fake_token_response_2 = _make_response(
            200,
            {"access_token": "tok-second", "expires_in": 3600},
        )
        mock_instance.post = AsyncMock(return_value=fake_token_response_2)

        token = await source._get_token()

    assert token == "tok-second"


# ---------------------------------------------------------------------------
# 4. ingest_all() with one failing source still returns results for others
# ---------------------------------------------------------------------------


async def test_ingest_all_partial_failure():
    async def fake_ingest_source(source_name: str, query: str) -> dict:
        if source_name == "brave_search":
            return {"source": "brave_search", "indexed": 5, "failed": 0}
        raise RuntimeError("TMDB is down")

    with patch(
        "app.services.ingestion.ingest_source",
        side_effect=fake_ingest_source,
    ):
        from app.services.ingestion import ingest_all

        results = await ingest_all("test", ["brave_search", "tmdb"])

    assert len(results) == 2

    brave_result = next(r for r in results if r["source"] == "brave_search")
    assert brave_result["indexed"] == 5

    tmdb_result = next(r for r in results if r["source"] == "tmdb")
    assert "error" in tmdb_result
    assert tmdb_result["indexed"] == 0


# ---------------------------------------------------------------------------
# 5. POST /ingest/ returns HTTP 202 with background task accepted
# ---------------------------------------------------------------------------


async def test_post_ingest_returns_202(client: AsyncClient):
    response = await client.post(
        "/ingest/",
        json={"query": "space exploration", "sources": ["web"]},
    )
    assert response.status_code == 202
    data = response.json()
    assert data["status"] == "ok"
    assert len(data["results"]) == 1
    assert data["results"][0]["source"] == "web"


async def test_post_ingest_invalid_source_returns_422(client: AsyncClient):
    response = await client.post(
        "/ingest/",
        json={"query": "test", "sources": ["invalid_source"]},
    )
    assert response.status_code == 422
