from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.mark.anyio
async def test_health_returns_200(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


@pytest.mark.anyio
@patch("app.routes.search.ingest_source", new_callable=AsyncMock)
async def test_search_valid_query(mock_ingest, client: AsyncClient):
    mock_ingest.return_value = {"source": "brave_search", "indexed": 0, "failed": 0}
    response = await client.post(
        "/search/",
        json={"query": "space exploration", "top_k": 3},
    )
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert isinstance(data["results"], list)
    assert data["query"] == "space exploration"
    assert mock_ingest.await_count == 3


@pytest.mark.anyio
async def test_search_empty_query_returns_422(client: AsyncClient):
    response = await client.post("/search/", json={})
    assert response.status_code == 422


@pytest.mark.anyio
@patch("app.routes.search.ingest_source", new_callable=AsyncMock)
async def test_search_returns_200_when_gemma_fails(mock_ingest, client: AsyncClient):
    mock_ingest.return_value = {"source": "brave_search", "indexed": 0, "failed": 0}
    from app.services.gemma import GemmaService, get_gemma_service

    mock_svc = GemmaService(api_key="", model="fake")
    mock_svc.summarize = AsyncMock(return_value=None)

    app.dependency_overrides[get_gemma_service] = lambda: mock_svc
    try:
        response = await client.post(
            "/search/",
            json={"query": "space exploration", "top_k": 3},
        )
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert data["ai_summary"] is None
        mock_svc.summarize.assert_called_once()
    finally:
        app.dependency_overrides.pop(get_gemma_service, None)
