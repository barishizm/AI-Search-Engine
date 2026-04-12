from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.auth import get_current_user
from app.main import app

pytestmark = pytest.mark.anyio


async def mock_current_user():
    return "test-user-id"


@pytest.fixture(params=["asyncio"])
def anyio_backend(request):
    return request.param


@pytest.fixture(autouse=True)
def override_auth():
    app.dependency_overrides[get_current_user] = mock_current_user
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.fixture
def client():
    transport = ASGITransport(app=app)
    return AsyncClient(transport=transport, base_url="http://test")


async def test_health_returns_200(client: AsyncClient):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "ai_configured" in data
    assert "ai_model" in data


@patch("app.routes.search.ingest_source", new_callable=AsyncMock)
async def test_search_valid_query(mock_ingest, client: AsyncClient):
    mock_ingest.return_value = {"source": "brave_search", "indexed": 0, "failed": 0}

    mock_svc = AsyncMock()
    mock_svc.needs_search = AsyncMock(return_value=True)
    mock_svc.select_sources = AsyncMock(return_value=["web", "film", "music"])
    mock_svc.summarize = AsyncMock(return_value=None)

    from app.services.gemini import get_gemini_service

    app.dependency_overrides[get_gemini_service] = lambda: mock_svc
    try:
        response = await client.post(
            "/search/",
            json={"query": "space exploration", "top_k": 3, "search": True},
        )
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert isinstance(data["results"], list)
        assert data["query"] == "space exploration"
        assert mock_ingest.await_count == 3
    finally:
        app.dependency_overrides.pop(get_gemini_service, None)


async def test_search_empty_query_returns_422(client: AsyncClient):
    response = await client.post("/search/", json={})
    assert response.status_code == 422


@patch("app.routes.search.ingest_source", new_callable=AsyncMock)
async def test_search_returns_local_chat_fallback_when_gemini_fails(mock_ingest, client: AsyncClient):
    mock_ingest.return_value = {"source": "brave_search", "indexed": 0, "failed": 0}
    from app.services.gemini import GeminiService, get_gemini_service

    mock_svc = GeminiService(api_key="", model="fake")
    mock_svc.summarize = AsyncMock(return_value=None)

    app.dependency_overrides[get_gemini_service] = lambda: mock_svc
    try:
        response = await client.post(
            "/search/",
            json={"query": "merhaba", "top_k": 3},
        )
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert data["ai_summary"] == "Merhaba! Sana nasil yardimci olabilirim?"
        mock_svc.summarize.assert_called_once()
    finally:
        app.dependency_overrides.pop(get_gemini_service, None)


@patch("app.routes.search.ingest_source", new_callable=AsyncMock)
async def test_search_returns_local_model_identity_fallback_in_turkish(mock_ingest, client: AsyncClient):
    mock_ingest.return_value = {"source": "brave_search", "indexed": 0, "failed": 0}
    from app.services.gemini import GeminiService, get_gemini_service

    mock_svc = GeminiService(api_key="", model="gemini-3.1-flash-lite-preview")
    mock_svc.summarize = AsyncMock(return_value=None)

    app.dependency_overrides[get_gemini_service] = lambda: mock_svc
    try:
        response = await client.post(
            "/search/",
            json={"query": "hangi modelsin", "top_k": 3},
        )
        assert response.status_code == 200
        data = response.json()
        assert "results" in data
        assert data["ai_summary"] == (
            "Su anda AI servisine ulasamiyorum ama bu uygulama normalde "
            "gemini-3.1-flash-lite-preview modeliyle calisiyor."
        )
        mock_svc.summarize.assert_called_once()
    finally:
        app.dependency_overrides.pop(get_gemini_service, None)
