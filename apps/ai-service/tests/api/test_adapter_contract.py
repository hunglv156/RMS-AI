import asyncio
import hashlib
import json
import time
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.api.internal import screening as api
from app.api.manifest import canonical_json, screening_manifest
from app.config import Settings
from app.extraction.document import ExtractedDocument, ExtractedPage
from app.infrastructure.llm import FakeLLMProvider
from app.main import create_app
from tests.api import test_screening_api as fixtures
from tests.api.test_screening_api import JD, pdf, post, response


@pytest.fixture
def client():
    yield from fixtures.client.__wrapped__()


@pytest.mark.parametrize(
    "path,method",
    [
        ("screening-manifest", "get"),
        ("screening-config", "get"),
        ("sample-jds", "get"),
        ("screenings", "post"),
    ],
)
@pytest.mark.parametrize("token", [None, "Bearer wrong", "Basic test-service-token", "Bearer café"])
def test_all_internal_routes_require_token(client, path, method, token):
    headers = {} if token is None else {"Authorization": token.encode("utf-8")}
    with TestClient(client.app) as anonymous:
        result = getattr(anonymous, method)(f"/internal/v1/{path}", headers=headers)
        assert result.status_code == 401
        assert result.json()["error"]["code"] == "unauthenticated"
        assert anonymous.get("/health").status_code == 200


def test_startup_missing_token_and_explicit_test_mode():
    app = create_app()
    app.dependency_overrides[api.get_settings] = lambda: Settings(_env_file=None)
    with pytest.raises(RuntimeError, match="AI_INTERNAL_TOKEN"), TestClient(app):
        pass
    app.dependency_overrides[api.get_settings] = lambda: Settings(_env_file=None, ai_test_mode=True)
    with TestClient(app) as client:
        assert client.get("/health").status_code == 200
        # Test mode permits boot, never unauthenticated internal requests.
        assert client.get("/internal/v1/screening-manifest").status_code == 401


@pytest.mark.parametrize(
    "updates",
    [
        {"extraction_timeout_ms": 150_000},
        {"ai_request_timeout_ms": 0},
        {"extraction_timeout_ms": float("nan")},
        {"ai_request_timeout_ms": float("inf")},
        {"llm_timeout_s": float("inf")},
    ],
)
def test_deadlines_validated(updates):
    with pytest.raises(ValidationError):
        Settings(_env_file=None, **updates)


def test_manifest_contract_canonicalization_and_secrets(client):
    settings = Settings(
        _env_file=None,
        ai_internal_token="test-service-token",
        llm_base_url="https://user:password@gateway.test/v1?api_key=secret#secret",
        llm_api_key="private-key",
        ai_build_revision="test-build",
    )
    client.app.dependency_overrides[api.get_settings] = lambda: settings
    manifest = client.get("/internal/v1/screening-manifest").json()
    fingerprint = manifest.pop("fingerprint")
    assert fingerprint == hashlib.sha256(canonical_json(manifest).encode()).hexdigest()
    assert manifest["provider_settings"]["base_url"] == "https://gateway.test/v1"
    assert not any(
        s in json.dumps(manifest)
        for s in ("password", "secret", "private-key", "test-service-token")
    )
    contract = json.loads(
        (Path(__file__).resolve().parents[4] / "packages/contracts/openapi.json").read_text()
    )
    schema = contract["components"]["schemas"]["Manifest"]
    assert set(manifest) | {"fingerprint"} == set(schema["required"])
    assert canonical_json({"é": [1.0, {"b": 2, "a": 1}]}) == '{"é":[1,{"a":1,"b":2}]}'
    assert screening_manifest(settings)["fingerprint"] == fingerprint
    for field, value in {
        "screening_model": "changed",
        "ai_build_revision": "changed",
        "screening_retrieval_k": 8,
        "llm_max_retries": 0,
        "ai_provider_mode": "deterministic",
        "ai_request_timeout_ms": 149_000,
    }.items():
        assert (
            screening_manifest(settings.model_copy(update={field: value}))["fingerprint"]
            != fingerprint
        )


def test_drift_rejected_before_extraction_or_provider_factory(client):
    def forbidden():
        pytest.fail("Expensive dependency executed before fingerprint check")

    client.app.dependency_overrides[api.get_screening_providers] = forbidden
    client.app.dependency_overrides[api.get_screening_embedder] = forbidden
    client.app.dependency_overrides[api.get_extractor] = forbidden
    result = client.post(
        "/internal/v1/screenings",
        files={"cv": ("cv.pdf", pdf())},
        data={"jd": json.dumps(JD)},
        headers={
            "X-Expected-Config-Fingerprint": "0" * 64,
            "X-Request-ID": "test",
            "X-Run-ID": "run",
        },
    )
    assert result.status_code == 409
    assert result.json()["error"]["code"] == "config_changed"


def test_required_worker_headers(client):
    result = client.post(
        "/internal/v1/screenings", files={"cv": ("cv.pdf", pdf())}, data={"jd": json.dumps(JD)}
    )
    assert result.status_code == 422


def test_exact_source_unicode_pages_and_binary_identity(client):
    text = "😀 Tiếng Việt\nBuilt Python APIs.\n\nSecond page"
    end = text.index("\n\n")
    document = ExtractedDocument(
        text,
        (
            ExtractedPage(1, 0, end, "text_layer", None, ()),
            ExtractedPage(2, end + 2, len(text), "ocr", 95, ()),
        ),
        (),
        "extract-v1",
        "norm-v1",
        {},
    )

    async def extract(*args, **kwargs):
        return document

    client.app.dependency_overrides[api.get_extractor] = lambda: extract
    raw_pdf = pdf()
    body = post(client, data=raw_pdf).json()
    source = body["source"]
    assert source["text"] == text
    assert source["offset_unit"] == "unicode_code_points"
    digest = hashlib.sha256(text.encode()).hexdigest()
    assert source["normalized_text_sha256"] == digest
    assert body["screening"]["versions"]["cv_sha256"] == digest
    assert digest != hashlib.sha256(raw_pdf).hexdigest()
    evidence = body["screening"]["criteria"][0]["evidence"][0]["verification"]
    assert evidence["valid"]
    start, stop = evidence["start_offset"], evidence["end_offset"]
    assert text[start:stop] == "Built Python APIs."
    assert start != len(text[:start].encode("utf-16-le")) // 2
    assert source["pages"][0]["start_offset"] <= start < stop <= source["pages"][0]["end_offset"]
    assert body["fingerprint"] == body["manifest"]["fingerprint"]
    assert text[source["pages"][1]["start_offset"] :] == "Second page"


def test_real_subprocess_source_matches_result(client):
    body = post(client, data=pdf(pages=2)).json()
    assert len(body["source"]["pages"]) == 2
    assert body["source"]["normalized_text_sha256"] == body["screening"]["versions"]["cv_sha256"]
    assert body["source"]["tool_versions"]["pymupdf"]


def test_deterministic_mode_uses_same_endpoint_without_live_credentials(client):
    settings = Settings(
        _env_file=None, ai_internal_token="test-service-token", ai_provider_mode="deterministic"
    )
    client.app.dependency_overrides[api.get_settings] = lambda: settings
    del client.app.dependency_overrides[api.get_screening_providers]
    first = post(client).json()
    second = post(client).json()
    assert first["manifest"]["mode"] == "deterministic"
    assert first["manifest"]["provider"] == "deterministic"
    assert first["screening"] == second["screening"]
    assert first["screening"]["llm"]["model"] == first["manifest"]["models"]["primary"]
    assert "DETERMINISTIC DEMO" in first["screening"]["criteria"][0]["assessment"]["reason"]
    assert first["screening"]["total"]["score_state"] == "insufficient_coverage"
    assert first["source"]["text"]
    assert not first["config"]["escalation"]["enabled"]


def test_extraction_timeout_is_safe(client):
    from app.extraction.bounded import ExtractionTimeoutError

    async def extract(*args, **kwargs):
        raise ExtractionTimeoutError("private source")

    client.app.dependency_overrides[api.get_extractor] = lambda: extract
    result = post(client)
    assert result.status_code == 504
    assert result.json()["error"]["code"] == "extraction_timeout"
    assert "private" not in result.text


def test_aggregate_budget_shared_by_primary_and_escalation(client):
    settings = Settings(
        _env_file=None,
        ai_internal_token="test-service-token",
        ai_request_timeout_ms=150,
        extraction_timeout_ms=50,
    )
    client.app.dependency_overrides[api.get_settings] = lambda: settings
    stopped = []

    class SlowProvider:
        async def generate_structured(self, **kwargs):
            try:
                await asyncio.sleep(0.09)
                return response("needs_review")
            finally:
                stopped.append(True)

    async def extract(*args, **kwargs):
        return ExtractedDocument("Built Python APIs.", (), (), "extract-v1", "norm-v1", {})

    client.app.dependency_overrides[api.get_extractor] = lambda: extract
    client.app.dependency_overrides[api.get_screening_providers] = lambda: api.ScreeningProviders(
        SlowProvider(), SlowProvider()
    )
    started = time.monotonic()
    result = post(client)
    assert result.status_code == 504
    assert result.json()["error"]["code"] == "request_timeout"
    assert time.monotonic() - started < 1
    assert len(stopped) == 2


def test_live_mode_failure_never_replaced_with_deterministic(client):
    from app.infrastructure.llm import LLMProviderError

    client.app.dependency_overrides[api.get_screening_providers] = lambda: api.ScreeningProviders(
        FakeLLMProvider([LLMProviderError("failed")])
    )
    result = post(client)
    assert result.status_code == 502
    assert "screening" not in result.json()


def test_client_disconnect_cancels_extraction():
    import httpx

    app = create_app()
    settings = Settings(
        _env_file=None, ai_internal_token="test-service-token", ai_provider_mode="deterministic"
    )
    app.dependency_overrides[api.get_settings] = lambda: settings
    cancelled = []

    async def run():
        started = asyncio.Event()

        async def slow_extract(*args, **kwargs):
            started.set()
            try:
                await asyncio.sleep(30)
            finally:
                cancelled.append(True)

        app.dependency_overrides[api.get_extractor] = lambda: slow_extract
        request = httpx.Request(
            "POST",
            "http://test/internal/v1/screenings",
            files={"cv": ("cv.pdf", pdf(), "application/pdf")},
            data={"jd": json.dumps(JD)},
            headers={
                "Authorization": "Bearer test-service-token",
                "X-Expected-Config-Fingerprint": screening_manifest(settings)["fingerprint"],
                "X-Request-ID": "test",
                "X-Run-ID": "run",
            },
        )
        body = request.read()
        delivered = False
        messages = []

        async def receive():
            nonlocal delivered
            if not delivered:
                delivered = True
                return {"type": "http.request", "body": body, "more_body": False}
            await started.wait()
            return {"type": "http.disconnect"}

        async def send(message):
            messages.append(message)

        scope = {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": "POST",
            "scheme": "http",
            "path": "/internal/v1/screenings",
            "raw_path": b"/internal/v1/screenings",
            "query_string": b"",
            "headers": [(key.lower(), value) for key, value in request.headers.raw],
            "client": ("127.0.0.1", 1),
            "server": ("test", 80),
            "root_path": "",
        }
        async with asyncio.timeout(2):
            await app(scope, receive, send)
        assert cancelled == [True]
        assert next(m for m in messages if m["type"] == "http.response.start")["status"] == 499

    asyncio.run(run())


def test_shared_foundation_deadline_environment(monkeypatch):
    monkeypatch.setenv("AI_REQUEST_TIMEOUT_MS", "120000")
    monkeypatch.setenv("EXTRACTION_TIMEOUT_MS", "40000")
    settings = Settings(_env_file=None)
    assert settings.ai_request_deadline_s == 120
    assert settings.ai_extraction_deadline_s == 40
    assert screening_manifest(settings)["deadlines"] == {"aggregate_s": 120, "extraction_s": 40}


@pytest.mark.parametrize("hedged", [False, True])
def test_aggregate_cancels_real_provider_retry_and_hedge_work(client, monkeypatch, hedged):
    import httpx

    from app.infrastructure.llm import OpenAICompatProvider, openai_compat

    settings = Settings(
        _env_file=None,
        ai_internal_token="test-service-token",
        ai_request_timeout_ms=200,
        extraction_timeout_ms=50,
        llm_base_url="https://test.invalid/v1",
        llm_api_key="test-placeholder",
        screening_hedge_after_s=0.02 if hedged else None,
        llm_max_retries=10,
    )
    active, stopped = [], []

    class Client:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def post(self, url, **kwargs):
            active.append(True)
            try:
                if hedged:
                    await asyncio.sleep(30)
                else:
                    await asyncio.sleep(0.01)
                    return httpx.Response(503, request=httpx.Request("POST", url))
            finally:
                stopped.append(True)

    monkeypatch.setattr(openai_compat.httpx, "AsyncClient", Client)
    client.app.dependency_overrides[api.get_settings] = lambda: settings
    # Use the real provider retry/hedge implementation with fake HTTP only.
    provider_settings = settings.model_copy(
        update={"llm_hedge_after_s": settings.screening_hedge_after_s}
    )
    provider = OpenAICompatProvider(provider_settings)
    client.app.dependency_overrides[api.get_screening_providers] = lambda: api.ScreeningProviders(
        provider
    )

    async def extract(*args, **kwargs):
        return ExtractedDocument("Built Python APIs.", (), (), "extract-v1", "norm-v1", {})

    client.app.dependency_overrides[api.get_extractor] = lambda: extract
    started = time.monotonic()
    result = post(client)
    assert result.status_code == 504
    assert result.json()["error"]["code"] == "request_timeout"
    assert time.monotonic() - started < 1
    assert len(active) == len(stopped) == (2 if hedged else 1)
