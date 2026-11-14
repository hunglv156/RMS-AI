from fastapi.testclient import TestClient

from app.config import Settings
from app.main import create_app
from tests.conftest import FakeProvider, FakeStore


def test_health(settings: Settings) -> None:
    client = TestClient(create_app(settings, FakeStore(), FakeProvider()))
    assert client.get("/health").json() == {"status": "ok"}
