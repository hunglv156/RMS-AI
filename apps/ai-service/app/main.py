from fastapi import FastAPI

from app.config import Settings, get_settings
from app.infrastructure.llm import LLMProvider, OllamaProvider
from app.infrastructure.storage import ObjectStore, S3Store
from app.routers import documents


def create_app(
    settings: Settings | None = None,
    store: ObjectStore | None = None,
    llm: LLMProvider | None = None,
) -> FastAPI:
    """Factory: test truyền store/LLM giả; chạy thật thì lấy từ cấu hình (uvicorn --factory)."""
    app = FastAPI(title="RMS AI service")
    if settings is not None:
        app.dependency_overrides[get_settings] = lambda: settings
    resolved = settings or get_settings()
    app.state.store = store or S3Store(resolved)
    app.state.llm = llm or OllamaProvider(resolved.ollama_url, resolved.llm_model)
    app.include_router(documents.router)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app
