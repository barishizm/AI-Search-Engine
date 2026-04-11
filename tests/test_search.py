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
async def test_search_valid_query(client: AsyncClient):
    response = await client.post(
        "/search/",
        json={"query": "space exploration", "top_k": 3},
    )
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert isinstance(data["results"], list)
    assert data["query"] == "space exploration"


@pytest.mark.anyio
async def test_search_empty_query_returns_422(client: AsyncClient):
    response = await client.post("/search/", json={})
    assert response.status_code == 422
