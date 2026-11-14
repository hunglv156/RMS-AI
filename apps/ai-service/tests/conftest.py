import json
import time
from typing import Any

import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.infrastructure.llm import LLMResult
from app.main import create_app
from app.security import sign

SECRET = "test-secret-test-secret-test-secret"
ORG = "11111111-1111-4111-8111-111111111111"
RESUME = "22222222-2222-4222-8222-222222222222"


class FakeStore:
    def __init__(self) -> None:
        self.objects: dict[str, bytes] = {}

    def get(self, key: str) -> bytes:
        return self.objects[key]

    def put(self, key: str, data: bytes, content_type: str) -> None:
        self.objects[key] = data


class FakeProvider:
    """LLM giả: ghi lại các lượt gọi và trả nội dung đã dựng sẵn."""

    model = "fake-model"

    def __init__(self, content: str | None = None) -> None:
        self.calls: list[tuple[str, str, dict[str, Any]]] = []
        self.content = content or json.dumps(
            {
                "headline": "Backend Engineer",
                "years_of_experience": 3.0,
                "skills": ["Python", "PostgreSQL"],
                "experience": [{"company": "Acme", "title": "Dev", "period": "2021-2024"}],
                "education": ["BSc CS"],
                "languages": ["English"],
            }
        )

    async def chat(
        self, system: str, user: str, schema: dict[str, Any], *, max_tokens: int = 2000
    ) -> LLMResult:
        self.calls.append((system, user, schema))
        return LLMResult(
            content=self.content, model=self.model, done_reason="stop", total_seconds=0.1
        )


@pytest.fixture
def settings() -> Settings:
    return Settings(
        ai_hmac_secret=SECRET,
        s3_endpoint="http://127.0.0.1:1",
        s3_bucket="b",
        s3_access_key="k",
        s3_secret_key="s",
        _env_file=None,
    )


@pytest.fixture
def store() -> FakeStore:
    return FakeStore()


@pytest.fixture
def provider() -> FakeProvider:
    return FakeProvider()


@pytest.fixture
def client(settings: Settings, store: FakeStore, provider: FakeProvider) -> TestClient:
    return TestClient(create_app(settings, store, provider))


def signed_headers(
    method: str,
    path: str,
    body: bytes,
    *,
    secret: str = SECRET,
    service_id: str = "api",
    timestamp: int | None = None,
) -> dict[str, str]:
    ts = int(time.time()) if timestamp is None else timestamp
    return {
        "x-service-id": service_id,
        "x-timestamp": str(ts),
        "x-signature": sign(secret, service_id, ts, method, path, body),
        "content-type": "application/json",
    }


def signed_post(client: TestClient, path: str, payload: dict[str, Any], **kw: Any) -> Any:
    body = json.dumps(payload).encode()
    return client.post(path, content=body, headers=signed_headers("POST", path, body, **kw))
