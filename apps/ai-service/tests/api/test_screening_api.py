import asyncio
import json
import threading
from dataclasses import replace

import pymupdf
import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr

from app.api.internal import screening as api
from app.config import Settings
from app.extraction.document import ExtractionLimits, OCRError
from app.infrastructure.llm import (
    FakeLLMProvider,
    LLMMetadata,
    LLMProviderError,
    LLMRateLimitError,
    LLMResult,
    LLMSchemaError,
    LLMTimeoutError,
)
from app.main import create_app
from app.pipelines.screening import JobDescription

TEXT = "Built Python APIs."
JD = {
    "id": "python-api",
    "title": "Python developer",
    "summary": "Build Python APIs",
    "criteria": [
        {
            "code": "python",
            "label": "Python",
            "description": "Build Python APIs",
            "priority": "must_have",
            "weight": 1,
            "keywords": ["Python"],
        }
    ],
}


def pdf(*, text=TEXT, pages=1, encrypted=False):
    with pymupdf.open() as doc:
        for _ in range(pages):
            page = doc.new_page()
            if text:
                page.insert_text((72, 72), text)
        return doc.tobytes(
            encryption=pymupdf.PDF_ENCRYPT_AES_256 if encrypted else pymupdf.PDF_ENCRYPT_NONE,
            owner_pw="owner" if encrypted else None,
            user_pw="password" if encrypted else None,
        )


def response(level="strong", model="primary"):
    return LLMResult.model_construct(
        value={
            "criteria": [
                {
                    "criterion_id": "python",
                    "level": level,
                    "confidence": 1,
                    "reason": "Fixture",
                    "evidence": [{"quote": TEXT}] if level == "strong" else [],
                    "missing_information": [],
                }
            ]
        },
        raw_text="fixture",
        metadata=LLMMetadata(
            provider="fake",
            model=model,
            temperature=0,
            started_at="2026-11-23T00:00:00Z",
            latency_ms=1,
            attempts=1,
        ),
    )


@pytest.fixture
def client():
    app = create_app()
    app.dependency_overrides[api.get_settings] = lambda: Settings(
        _env_file=None, ai_internal_token="test-service-token"
    )
    app.dependency_overrides[api.get_screening_providers] = lambda: api.ScreeningProviders(
        FakeLLMProvider([response()]), FakeLLMProvider([])
    )
    with TestClient(app, headers={"Authorization": "Bearer test-service-token"}) as client:
        yield client


def post(client, *, data=None, jd=None, content_type="application/pdf"):
    return client.post(
        "/internal/v1/screenings",
        files={"cv": ("cv.pdf", pdf() if data is None else data, content_type)},
        data={"jd": json.dumps(JD) if jd is None else jd},
        headers={
            "X-Expected-Config-Fingerprint": client.get("/internal/v1/screening-manifest").json()[
                "fingerprint"
            ],
            "X-Request-ID": "test-request",
            "X-Run-ID": "test-run",
        },
    )


@pytest.mark.parametrize("escalated", [False, True])
def test_happy_path(client, escalated):
    primary = FakeLLMProvider([response("needs_review" if escalated else "strong")])
    stronger = FakeLLMProvider([response(model="stronger")] if escalated else [])
    client.app.dependency_overrides[api.get_screening_providers] = lambda: api.ScreeningProviders(
        primary, stronger
    )
    result = post(client)
    assert result.status_code == 200, result.text
    body = result.json()
    assert set(body) == {
        "screening",
        "extraction",
        "latency_s",
        "config",
        "source",
        "manifest",
        "fingerprint",
    }
    assert body["extraction"] == {"pages": 1, "ocr_pages": 0, "chars": len(TEXT)}
    assert body["latency_s"] > 0
    assert body["config"] == client.get("/internal/v1/screening-config").json()
    screening = body["screening"]
    assert screening["escalation"]["triggered"] is escalated
    assert screening["escalation"]["reasons"] == (["needs_review"] if escalated else [])
    assert screening["llm"]["model"] == ("stronger" if escalated else "primary")
    assert screening["versions"]["config"]["context_mode"] == "retrieved"
    assert screening["versions"]["config"]["retrieval_mode"] == "lexical"
    assert screening["versions"]["prompt"] == "screening-v2"
    assert screening["total"]["coverage"] == 1


def test_no_coverage_band_escalation(client):
    # An unknown criterion has zero coverage but must not request a second opinion.
    client.app.dependency_overrides[api.get_screening_providers] = lambda: api.ScreeningProviders(
        FakeLLMProvider([response("unknown")]), FakeLLMProvider([])
    )
    body = post(client).json()["screening"]
    assert body["total"]["coverage"] == 0
    assert not body["escalation"]["triggered"]


@pytest.mark.parametrize(
    "kwargs,status,code",
    [
        ({"jd": "{"}, 400, "invalid_jd"),
        ({"jd": "{}"}, 400, "invalid_jd"),
        ({"jd": json.dumps(JD | {"extra": "invalid"})}, 400, "invalid_jd"),
        ({"data": b"not a PDF"}, 400, "invalid_pdf"),
        ({"data": b"%PDF-corrupt"}, 400, "invalid_pdf"),
        ({"data": b""}, 400, "invalid_pdf"),
        ({"data": pdf(encrypted=True)}, 400, "encrypted_pdf"),
        ({"content_type": "application/msword"}, 415, "unsupported_type"),
    ],
)
def test_input_errors(client, kwargs, status, code):
    result = post(client, **kwargs)
    assert result.status_code == status
    assert result.json()["error"]["code"] == code
    assert set(result.json()) == {"error"}
    assert isinstance(result.json()["error"]["message"], str)


@pytest.mark.parametrize("kind", ["bytes", "pages", "pixels"])
def test_document_limits(client, kind):
    limits = ExtractionLimits()
    limits = replace(
        limits,
        **{"bytes": {"max_bytes": 10}, "pages": {"max_pages": 1}, "pixels": {"max_page_pixels": 1}}[
            kind
        ],
    )
    client.app.dependency_overrides[api.get_extraction_limits] = lambda: limits
    result = post(
        client,
        data=pdf(pages=2) if kind == "pages" else pdf(text="") if kind == "pixels" else pdf(),
    )
    assert result.status_code == 413
    assert result.json()["error"]["code"] == "file_too_large"


def inject_local_extraction(client):
    # Only for legacy monkeypatch cases; production always uses the subprocess.
    from app.extraction import document

    async def extract(data, *, limits, timeout_s):
        return await asyncio.to_thread(document.extract_document, data, limits=limits)

    client.app.dependency_overrides[api.get_extractor] = lambda: extract


def test_empty_text(client, monkeypatch):
    inject_local_extraction(client)
    from app.extraction import document

    monkeypatch.setattr(document, "_ocr", lambda *args: ("", None))
    result = post(client, data=pdf(text=""))
    assert result.status_code == 400
    assert result.json()["error"]["code"] == "empty_text"


def test_ocr_and_off_event_loop(client, monkeypatch):
    inject_local_extraction(client)
    from app.extraction import document

    threads = []

    def ocr(*args):
        threads.append(threading.get_ident())
        return TEXT, 95

    class Provider(FakeLLMProvider):
        async def generate_structured(self, **kwargs):
            assert threading.get_ident() != threads[0]
            return await super().generate_structured(**kwargs)

    monkeypatch.setattr(document, "_ocr", ocr)
    client.app.dependency_overrides[api.get_screening_providers] = lambda: api.ScreeningProviders(
        Provider([response()]), FakeLLMProvider([])
    )
    result = post(client, data=pdf(text=""))
    assert result.status_code == 200
    assert result.json()["extraction"] == {"pages": 1, "ocr_pages": 1, "chars": len(TEXT)}


def test_ocr_failure(client, monkeypatch):
    inject_local_extraction(client)
    from app.extraction import document

    def fail(*args, **kwargs):
        raise OCRError("private extraction failure")

    monkeypatch.setattr(document, "extract_document", fail)
    result = post(client)
    assert result.status_code == 400
    assert result.json()["error"]["code"] == "invalid_pdf"
    assert "private" not in result.text


@pytest.mark.parametrize(
    "error,status,code",
    [
        (LLMProviderError, 502, "llm_error"),
        (LLMSchemaError, 502, "llm_schema_error"),
        (LLMRateLimitError, 429, "llm_rate_limited"),
        (ValueError, 502, "llm_error"),
        (LLMTimeoutError, 504, "llm_timeout"),
        (TimeoutError, 504, "llm_timeout"),
    ],
)
def test_llm_errors(client, error, status, code):
    client.app.dependency_overrides[api.get_screening_providers] = lambda: api.ScreeningProviders(
        FakeLLMProvider([error("secret-key https://private-gateway")])
    )
    result = post(client)
    assert result.status_code == status
    assert result.json()["error"]["code"] == code
    assert "secret-key" not in result.text
    assert "private-gateway" not in result.text


def test_failed_escalation_preserves_primary_without_leaking_details(client):
    client.app.dependency_overrides[api.get_screening_providers] = lambda: api.ScreeningProviders(
        FakeLLMProvider([response("needs_review")]),
        FakeLLMProvider([LLMProviderError("secret-key https://private-gateway")]),
    )
    result = post(client)
    assert result.status_code == 200
    assert result.json()["screening"]["escalation"]["error"]
    assert "secret-key" not in result.text
    assert "private-gateway" not in result.text


def test_unconfigured_health_and_config(client):
    del client.app.dependency_overrides[api.get_screening_providers]
    assert client.get("/health").status_code == 200
    assert client.get("/internal/v1/screening-config").status_code == 200
    result = post(client)
    assert result.status_code == 503
    assert result.json()["error"]["code"] == "llm_not_configured"


def test_config_is_allowlisted(client):
    settings = Settings(
        _env_file=None,
        ai_internal_token="test-service-token",
        llm_api_key=SecretStr("private-key"),
        llm_base_url="https://private-gateway",
    )
    client.app.dependency_overrides[api.get_settings] = lambda: settings
    result = client.get("/internal/v1/screening-config")
    assert result.status_code == 200
    assert result.json() == {
        "model": "ag/gemini-3.8-flash-low",
        "prompt_version": "screening-v2",
        "context_mode": "retrieved",
        "retrieval_mode": "lexical",
        "retrieval_k": 5,
        "hedge_after_s": 20.0,
        "escalation": {
            "enabled": True,
            "model": "ag/gemini-4-argon-medium",
            "triggers": ["needs_review"],
        },
        "min_coverage": 0.8,
    }
    assert "private" not in result.text


def test_samples_and_configurable_directory(client, tmp_path):
    import yaml

    result = client.get("/internal/v1/sample-jds")
    assert result.status_code == 200
    assert {item["id"] for item in result.json()["items"]} == {"jd-py-real", "jd-hr-real"}
    for item in result.json()["items"]:
        jd = JobDescription.model_validate(item["jd"])
        assert (item["id"], item["title"], item["summary"]) == (jd.id, jd.title, jd.summary)
    for name in ("jd-py-real", "jd-hr-real"):
        (tmp_path / f"{name}.yaml").write_text(yaml.safe_dump(JD | {"id": name}))
    client.app.dependency_overrides[api.get_settings] = lambda: Settings(
        _env_file=None, ai_internal_token="test-service-token", screening_sample_jds_dir=tmp_path
    )
    assert client.get("/internal/v1/sample-jds").json()["items"][0]["title"] == JD["title"]


def test_env_overrides_preserve_runner_defaults(monkeypatch):
    monkeypatch.setenv("SCREENING_MODEL", "api-primary")
    monkeypatch.setenv("SCREENING_ESCALATE_MODEL", "api-escalation")
    monkeypatch.setenv("SCREENING_ESCALATE_ON", '["needs_review", "coverage_band"]')
    monkeypatch.setenv("SCREENING_RETRIEVAL_K", "3")
    settings = Settings(_env_file=None, ai_internal_token="test-service-token")
    assert settings.screening_model == "api-primary"
    assert settings.screening_escalate_model == "api-escalation"
    assert settings.screening_escalate_on == {"needs_review", "coverage_band"}
    assert settings.screening_retrieval_k == 3
    assert settings.llm_model == "ag/gemini-3.8-flash-high"
    assert settings.llm_hedge_after_s is None


def test_provider_model_and_hedge_wiring(monkeypatch):
    recorded = []

    def factory(settings):
        recorded.append(settings)
        return FakeLLMProvider([])

    monkeypatch.setattr(api, "get_llm_provider", factory)
    settings = Settings(
        _env_file=None,
        ai_internal_token="test-service-token",
        llm_api_key="private",
        llm_base_url="https://private",
    )
    api.get_screening_providers(settings)
    assert [s.llm_model for s in recorded] == [
        settings.screening_model,
        settings.screening_escalate_model,
    ]
    assert [s.gemini_model for s in recorded] == [s.llm_model for s in recorded]
    assert all(s.llm_hedge_after_s == 20 for s in recorded)
    assert settings.llm_hedge_after_s is None


def test_disabled_escalation(client):
    client.app.dependency_overrides[api.get_settings] = lambda: Settings(
        _env_file=None, ai_internal_token="test-service-token", screening_escalate_model=None
    )
    client.app.dependency_overrides[api.get_screening_providers] = lambda: api.ScreeningProviders(
        FakeLLMProvider([response()])
    )
    body = post(client).json()
    assert not body["config"]["escalation"]["enabled"]
    assert "escalation" not in body["screening"]
