from importlib.metadata import PackageNotFoundError, version

from fastapi import FastAPI

try:
    SERVICE_VERSION = version("rms-ai-service")
except PackageNotFoundError:
    SERVICE_VERSION = "0.0.0+unknown"


def create_app() -> FastAPI:
    app = FastAPI(title="rms-ai-service", version=SERVICE_VERSION)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {
            "status": "ok",
            "service": "rms-ai-service",
            "version": SERVICE_VERSION,
        }

    return app


app = create_app()
