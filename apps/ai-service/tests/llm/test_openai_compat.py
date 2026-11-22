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


def test_hedging_fast_response(monkeypatch):
    provider, handler, requests = build(json_response, llm_hedge_after_s=0.02)
    install_client(monkeypatch, handler)
    result = run(generate(provider))
    assert len(requests) == 1
    assert result.metadata.hedged is False
    assert result.metadata.winner == "primary"


@pytest.mark.parametrize("winner", ["primary", "hedge"])
def test_hedging_race_and_loser_cancellation(monkeypatch, winner):
    async def scenario():
        release_primary = asyncio.Event()
        cancelled = []
        requests = []

        async def handler(request):
            name = "primary" if not requests else "hedge"
            requests.append(request)
            try:
                if name == "primary":
                    await release_primary.wait()
                elif winner == "primary":
                    release_primary.set()
                    await asyncio.Event().wait()
                return json_response(request)
            except asyncio.CancelledError:
                cancelled.append(name)
                raise

        provider, _, _ = build(json_response, llm_hedge_after_s=0.001)
        install_client(monkeypatch, handler)
        result = await asyncio.wait_for(generate(provider), timeout=0.5)
        assert len(requests) == 2
        assert requests[0].content == requests[1].content
        assert requests[0].headers == requests[1].headers
        assert result.metadata.hedged is True
        assert result.metadata.winner == winner
        assert result.metadata.latency_ms >= 1
        assert (result.metadata.input_tokens, result.metadata.output_tokens) == (5, 7)
        assert cancelled == (["hedge"] if winner == "primary" else ["primary"])

    run(scenario())


@pytest.mark.parametrize("failed", ["primary", "hedge"])
@pytest.mark.parametrize("failure", ["http", "schema", "timeout"])
def test_hedging_waits_for_valid_success(monkeypatch, failed, failure):
    async def scenario():
        hedge_started = asyncio.Event()
        failure_returned = asyncio.Event()
        requests = []

        async def handler(request):
            name = "primary" if not requests else "hedge"
            requests.append(request)
            if name == "primary":
                await hedge_started.wait()
            else:
                hedge_started.set()
            if name == failed:
                failure_returned.set()
                if failure == "timeout":
                    raise httpx.ReadTimeout("private timeout")
                if failure == "http":
                    return httpx.Response(400)
                return httpx.Response(
                    200,
                    json={
                        "choices": [{"message": {"content": "{}"}}],
                        "usage": {"prompt_tokens": 2},
                    },
                )
            await failure_returned.wait()
            return json_response(request)

        provider, _, _ = build(json_response, llm_hedge_after_s=0.001, llm_max_retries=0)
        install_client(monkeypatch, handler)
        result = await asyncio.wait_for(generate(provider), timeout=0.5)
        assert result.value == Answer(name="ok", count=2)
        assert result.metadata.winner == ("hedge" if failed == "primary" else "primary")
        assert result.metadata.attempts == 1
        assert result.metadata.input_tokens == (7 if failure == "schema" else 5)
        assert result.metadata.output_tokens == 7
        assert len(requests) == 2

    run(scenario())


def test_hedging_counts_both_reported_responses(monkeypatch):
    async def scenario():
        release = asyncio.Event()
        count = 0

        async def handler(request):
            nonlocal count
            count += 1
            if count == 2:
                release.set()
            await release.wait()
            return json_response(request)

        provider, _, _ = build(json_response, llm_hedge_after_s=0.001)
        install_client(monkeypatch, handler)
        result = await asyncio.wait_for(generate(provider), timeout=0.5)
        assert result.metadata.input_tokens == 10
        assert result.metadata.output_tokens == 14

    run(scenario())


def test_hedging_caller_cancellation_cleans_up_both(monkeypatch):
    async def scenario():
        both_started = asyncio.Event()
        started = []
        cancelled = []

        async def handler(request):
            name = len(started)
            started.append(name)
            if len(started) == 2:
                both_started.set()
            try:
                await asyncio.Event().wait()
            except asyncio.CancelledError:
                cancelled.append(name)
                raise

        provider, _, _ = build(json_response, llm_hedge_after_s=0.001)
        install_client(monkeypatch, handler)
        task = asyncio.create_task(generate(provider))
        await asyncio.wait_for(both_started.wait(), timeout=0.5)
        task.cancel()
        with pytest.raises(asyncio.CancelledError):
            await task
        assert sorted(cancelled) == [0, 1]

    run(scenario())


def test_default_path_never_schedules_hedge(monkeypatch):
    provider, handler, requests = build(json_response, llm_hedge_after_s=None)
    install_client(monkeypatch, handler)
    with patch.object(provider, "_hedged_attempt", side_effect=AssertionError("hedging disabled")):
        result = run(generate(provider))
    assert len(requests) == 1
    assert result.metadata.hedged is None
    assert result.metadata.winner is None


@pytest.mark.parametrize("delay", [0, -1])
def test_hedging_rejects_nonpositive_delay(delay):
    with pytest.raises(ValueError):
        Settings(_env_file=None, llm_hedge_after_s=delay)


def test_hedging_setting_from_environment(monkeypatch):
    monkeypatch.setenv("LLM_HEDGE_AFTER_S", "12.5")
    assert Settings(_env_file=None).llm_hedge_after_s == 12.5


@pytest.mark.parametrize(
    "status,expected", [(503, LLMProviderError), (429, LLMRateLimitError), (400, LLMProviderError)]
)
def test_hedging_both_fail_preserves_retry_policy(monkeypatch, status, expected):
    async def scenario():
        releases = [asyncio.Event(), asyncio.Event()]
        requests = []

        async def handler(request):
            index = len(requests)
            requests.append(request)
            release = releases[index // 2]
            if index % 2:
                release.set()
            await release.wait()
            return httpx.Response(status)

        provider, _, _ = build(json_response, llm_hedge_after_s=0.001, llm_max_retries=1)
        install_client(monkeypatch, handler)
        with (
            patch("app.infrastructure.llm.openai_compat._backoff", autospec=True),
            pytest.raises(expected),
        ):
            await asyncio.wait_for(generate(provider), timeout=0.5)
        assert len(requests) == (2 if status == 400 else 4)

    run(scenario())


def test_hedging_schema_retry_retains_reported_usage(monkeypatch):
    async def scenario():
        release = asyncio.Event()
        requests = []

        async def handler(request):
            index = len(requests)
            requests.append(request)
            if index >= 2:
                return json_response(request)
            if index == 1:
                release.set()
            await release.wait()
            return httpx.Response(
                200,
                json={"choices": [{"message": {"content": "{}"}}], "usage": {"prompt_tokens": 2}},
            )

        provider, _, _ = build(json_response, llm_hedge_after_s=0.001, llm_max_retries=1)
        install_client(monkeypatch, handler)
        with patch("app.infrastructure.llm.openai_compat._backoff", autospec=True):
            result = await asyncio.wait_for(generate(provider), timeout=0.5)
        assert len(requests) == 3
        assert result.metadata.attempts == 2
        assert result.metadata.hedged is True
        assert result.metadata.winner == "primary"
        assert result.metadata.input_tokens == 9
        assert result.metadata.output_tokens == 7

    run(scenario())


def test_hedging_reports_unknown_usage_as_none(monkeypatch):
    provider, handler, _ = build(
        lambda request: httpx.Response(
            200, json={"choices": [{"message": {"content": '{"name":"ok","count":2}'}}]}
        ),
        llm_hedge_after_s=0.01,
    )
    install_client(monkeypatch, handler)
    result = run(generate(provider))
    assert result.metadata.input_tokens is None
    assert result.metadata.output_tokens is None
