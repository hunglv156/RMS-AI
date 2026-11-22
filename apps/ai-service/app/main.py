from contextlib import asynccontextmanager
from importlib.metadata import PackageNotFoundError, version

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from app.api.internal.screening import APIError, get_settings, router

try:
    SERVICE_VERSION = version("rms-ai-service")
except PackageNotFoundError:
    SERVICE_VERSION = "0.0.0+unknown"


def create_app() -> FastAPI:
    @asynccontextmanager
    async def lifespan(app):
        factory = app.dependency_overrides.get(get_settings, get_settings)
        settings = factory()  # Validates explicit deadlines at startup.
        token = settings.ai_internal_token
        if (not token or not token.get_secret_value().strip()) and not settings.ai_test_mode:
            raise RuntimeError("AI_INTERNAL_TOKEN is required outside test mode")
        yield

    app = FastAPI(title="rms-ai-service", version=SERVICE_VERSION, lifespan=lifespan)
    app.include_router(router)

    @app.exception_handler(APIError)
    async def api_error_handler(request, exc: APIError):
        return JSONResponse(
            status_code=exc.status,
            content={"error": {"code": exc.code, "message": exc.message}},
        )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {
            "status": "ok",
            "service": "rms-ai-service",
            "version": SERVICE_VERSION,
        }

    return app


app = create_app()
