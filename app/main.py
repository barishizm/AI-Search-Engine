import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.models.schemas import HealthResponse
from app.routes.ingest import router as ingest_router
from app.routes.search import router as search_router
from app.services.vector_store import get_vector_store

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    store = get_vector_store()
    count = store.count()
    logger.info(
        "Started %s v%s — %d documents in collection",
        settings.app_name,
        settings.app_version,
        count,
    )
    yield


settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search_router)
app.include_router(ingest_router)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    store = get_vector_store()
    try:
        connected = store.is_healthy()
        doc_count = store.count()
    except Exception:
        connected = False
        doc_count = 0
    return HealthResponse(
        status="healthy" if connected else "unhealthy",
        version=settings.app_version,
        chroma_connected=connected,
        doc_count=doc_count,
    )
