from importlib import metadata, reload
from importlib.metadata import PackageNotFoundError

from fastapi.testclient import TestClient

from app import main
from app.main import SERVICE_VERSION, app


def test_health() -> None:
    response = TestClient(app).get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "rms-ai-service",
        "version": SERVICE_VERSION,
    }


def test_health_is_the_only_route() -> None:
    paths = {route.path for route in app.routes}

    assert paths == {"/health", "/openapi.json", "/docs", "/docs/oauth2-redirect", "/redoc"}


def test_missing_package_metadata_uses_unknown_version(monkeypatch) -> None:
    def missing_version(_name: str) -> str:
        raise PackageNotFoundError("rms-ai-service")

    monkeypatch.setattr(metadata, "version", missing_version)
    try:
        reloaded = reload(main)
        assert reloaded.SERVICE_VERSION == "0.0.0+unknown"
    finally:
        monkeypatch.undo()
        reload(main)
