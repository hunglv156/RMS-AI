from importlib.metadata import version

from fastapi import FastAPI

SERVICE_VERSION = version("rms-ai-service")


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
