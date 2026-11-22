from importlib.metadata import PackageNotFoundError, version

from fastapi import FastAPI
from fastapi.responses import JSONResponse

from app.api.internal.screening import APIError, router

try:
    SERVICE_VERSION = version("rms-ai-service")
except PackageNotFoundError:
    SERVICE_VERSION = "0.0.0+unknown"


def create_app() -> FastAPI:
    app = FastAPI(title="rms-ai-service", version=SERVICE_VERSION)
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
