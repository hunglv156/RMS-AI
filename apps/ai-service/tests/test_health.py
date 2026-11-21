from fastapi.testclient import TestClient

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
