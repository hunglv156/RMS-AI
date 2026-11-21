import asyncio
import json
import os
from unittest.mock import patch

import httpx
import pytest
from pydantic import BaseModel, SecretStr

from app.config import Settings
from app.infrastructure.llm import (
    LLMProviderError,
    LLMRateLimitError,
    LLMSchemaError,
    LLMTimeoutError,
    OpenAICompatProvider,
    get_llm_provider,
)


class Answer(BaseModel):
    name: str
    count: int


_AsyncClient = httpx.AsyncClient


def run(coro):
    return asyncio.run(coro)


def build(handler, **kwargs):
    settings = Settings(
        _env_file=None,
        llm_base_url="https://gateway.test/v1",
        llm_api_key=SecretStr("test-secret"),
        **kwargs,
    )
    provider = OpenAICompatProvider(settings)
    requests = []

    async def recording_handler(request):
        requests.append(request)
        return handler(request)

    return provider, recording_handler, requests


def install_client(monkeypatch, handler):
    monkeypatch.setattr(
        "app.infrastructure.llm.openai_compat.httpx.AsyncClient",
        lambda **kw: _AsyncClient(transport=httpx.MockTransport(handler), **kw),
    )


def generate(provider, *, model=Answer):
    return provider.generate_structured(
        system="instructions",
        user="input",
        response_model=model,
        temperature=0.2,
        max_output_tokens=80,
    )


def json_response(request):
    payload = {
        "model": "gemini-3.8-flash-n",
        "choices": [{"message": {"content": '{"name":"ok","count":2}'}, "finish_reason": "stop"}],
        "usage": {"prompt_tokens": 5, "completion_tokens": 7},
    }
    return httpx.Response(200, json=payload)


def test_json_body_metadata_and_request(monkeypatch):
    provider, handler, requests = build(json_response)
    install_client(monkeypatch, handler)
    result = run(generate(provider))
    assert result.value == Answer(name="ok", count=2)
    assert result.metadata.provider == "openai_compat"
    assert result.metadata.model == "ag/gemini-3.8-flash-high"
    assert result.metadata.response_model == "gemini-3.8-flash-n"
    assert (result.metadata.input_tokens, result.metadata.output_tokens) == (5, 7)
    request_body = json.loads(requests[0].content)
    assert request_body["stream"] is False
    assert request_body["temperature"] == 0.2
    assert request_body["max_tokens"] == 80
    assert request_body["response_format"] == {"type": "json_object"}
    assert '"required"' in request_body["messages"][0]["content"]
    assert requests[0].headers["authorization"] == "Bearer test-secret"


def test_sse_and_fenced_json(monkeypatch):
    def handler(request):
        data = [
            {
                "model": "actual",
                "choices": [{"delta": {"content": '```json\n{"name":'}, "finish_reason": None}],
            },
            {"choices": [{"delta": {"content": '"ok","count":2}\n```'}, "finish_reason": None}]},
            {
                "choices": [{"delta": {}, "finish_reason": "stop"}],
                "usage": {"prompt_tokens": 9, "completion_tokens": 3},
            },
        ]
        body = "".join(f"data: {json.dumps(item)}\n\n" for item in data) + "data: [DONE]\n\n"
        return httpx.Response(200, text=body, headers={"content-type": "text/event-stream"})

    provider, recording, _ = build(handler)
    install_client(monkeypatch, recording)
    result = run(generate(provider))
    assert result.value == Answer(name="ok", count=2)
    assert result.metadata.finish_reason == "stop"
    assert result.metadata.input_tokens == 9
    assert result.metadata.response_model == "actual"


def test_schema_failure_retries_then_errors(monkeypatch):
    provider, handler, requests = build(
        lambda request: httpx.Response(200, json={"choices": [{"message": {"content": "{}"}}]}),
        llm_max_retries=1,
    )
    install_client(monkeypatch, handler)
    with (
        patch("app.infrastructure.llm.openai_compat.asyncio.sleep", autospec=True),
        pytest.raises(LLMSchemaError),
    ):
        run(generate(provider))
    assert len(requests) == 2


@pytest.mark.parametrize(
    "status,exc,expected",
    [(429, None, LLMRateLimitError), (503, None, LLMProviderError), (400, None, LLMProviderError)],
)
def test_http_error_mappings_and_counts(monkeypatch, status, exc, expected):
    provider, handler, requests = build(
        lambda request: httpx.Response(status, text="failure"), llm_max_retries=1
    )
    install_client(monkeypatch, handler)
    with (
        patch("app.infrastructure.llm.openai_compat.asyncio.sleep", autospec=True),
        pytest.raises(expected) as caught,
    ):
        run(generate(provider))
    assert len(requests) == (1 if status == 400 else 2)
    assert "test-secret" not in str(caught.value)


def test_timeout_retries(monkeypatch):
    def handler(request):
        raise httpx.ReadTimeout("private timeout")

    provider, transport, _ = build(handler, llm_max_retries=1)
    install_client(monkeypatch, transport)
    with (
        patch("app.infrastructure.llm.openai_compat.asyncio.sleep", autospec=True),
        pytest.raises(LLMTimeoutError) as caught,
    ):
        run(generate(provider))
    assert "test-secret" not in str(caught.value)


def test_network_error_retries(monkeypatch):
    def handler(request):
        raise httpx.ConnectError("network failure", request=request)

    provider, transport, _ = build(handler, llm_max_retries=1)
    install_client(monkeypatch, transport)
    with (
        patch("app.infrastructure.llm.openai_compat.asyncio.sleep", autospec=True),
        pytest.raises(LLMProviderError),
    ):
        run(generate(provider))


def test_factory_selection():
    assert isinstance(
        get_llm_provider(Settings(_env_file=None, llm_base_url="https://x", llm_api_key="k")),
        OpenAICompatProvider,
    )
    assert (
        get_llm_provider(
            Settings(
                _env_file=None,
                llm_base_url=None,
                llm_api_key=None,
                gemini_api_key="k",
            )
        ).__class__.__name__
        == "GeminiProvider"
    )
    with pytest.raises(LLMProviderError):
        get_llm_provider(
            Settings(_env_file=None, llm_base_url=None, llm_api_key=None, gemini_api_key=None)
        )


@pytest.mark.live
@pytest.mark.skipif(
    not os.getenv("LLM_BASE_URL") or not os.getenv("LLM_API_KEY"),
    reason="LLM gateway settings not set",
)
def test_live_openai_compat():
    result = run(
        OpenAICompatProvider(Settings()).generate_structured(
            system="Return a concise structured answer.",
            user="Name one color and count it as one.",
            response_model=Answer,
        )
    )
    assert result.value.name and result.value.count == 1
