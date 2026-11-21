import asyncio
import logging
import os
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from google.genai import errors, types
from pydantic import BaseModel, SecretStr

from app.config import Settings
from app.infrastructure.llm import (
    FakeLLMProvider,
    GeminiProvider,
    LLMMetadata,
    LLMProvider,
    LLMProviderError,
    LLMRateLimitError,
    LLMResult,
    LLMSchemaError,
    LLMTimeoutError,
)


class Answer(BaseModel):
    name: str
    count: int


def run(coro):
    return asyncio.run(coro)


def provider(responses, **settings):
    call = AsyncMock(side_effect=responses)
    client = SimpleNamespace(aio=SimpleNamespace(models=SimpleNamespace(generate_content=call)))
    with patch("app.infrastructure.llm.gemini.genai.Client", return_value=client):
        instance = GeminiProvider(Settings(gemini_api_key=SecretStr("secret-key"), **settings))
    return instance, call


def response(text='{"name":"ok","count":2}'):
    return types.GenerateContentResponse(
        candidates=[
            types.Candidate(
                content=types.Content(parts=[types.Part(text=text)]), finish_reason="STOP"
            )
        ],
        usage_metadata=types.GenerateContentResponseUsageMetadata(
            prompt_token_count=4, candidates_token_count=6
        ),
    )


def generate(instance):
    return instance.generate_structured(
        system="private instructions", user="private CV", response_model=Answer
    )


def test_success_metadata_and_separation(caplog):
    instance, call = provider([response()])
    with caplog.at_level(logging.INFO):
        result = run(generate(instance))
    assert result.value == Answer(name="ok", count=2)
    assert result.raw_text == '{"name":"ok","count":2}'
    meta = result.metadata
    assert (meta.provider, meta.model, meta.temperature, meta.attempts) == (
        "gemini",
        "gemini-3.8-flash-high",
        0,
        1,
    )
    assert meta.started_at.endswith("+00:00") and meta.latency_ms >= 0
    assert (meta.input_tokens, meta.output_tokens, meta.finish_reason) == (4, 6, "STOP")
    args = call.call_args.kwargs
    assert args["contents"] == "private CV"
    assert args["config"].system_instruction == "private instructions"
    assert args["config"].response_mime_type == "application/json"
    assert args["config"].response_schema is Answer
    assert "secret-key" not in repr(instance) + caplog.text
    assert "private" not in caplog.text and result.raw_text not in caplog.text


def test_plain_string_finish_reason():
    instance, call = provider([response()])
    call.side_effect = None
    call.return_value = SimpleNamespace(
        text='{"name":"ok","count":2}',
        candidates=[SimpleNamespace(finish_reason="PLAIN_STOP")],
        usage_metadata=None,
    )
    result = run(generate(instance))
    assert result.metadata.finish_reason == "PLAIN_STOP"


def test_schema_failure_no_retry(caplog):
    instance, call = provider([response('{"name":"sensitive"}')])
    with pytest.raises(LLMSchemaError), caplog.at_level(logging.WARNING):
        run(generate(instance))
    assert call.await_count == 1
    assert "sensitive" not in caplog.text and "secret-key" not in caplog.text


@pytest.mark.parametrize("code", [429, 500, 503])
def test_retry_then_success(code):
    instance, call = provider([errors.APIError(code, {}), response()])
    with patch("app.infrastructure.llm.gemini.asyncio.sleep", new_callable=AsyncMock):
        result = run(generate(instance))
    assert result.metadata.attempts == 2 and call.await_count == 2


@pytest.mark.parametrize(
    "code,error", [(429, LLMRateLimitError), (500, LLMProviderError), (400, LLMProviderError)]
)
def test_exhaustion_and_nonretryable(code, error):
    instance, call = provider([errors.APIError(code, {})] * 3, llm_max_retries=1)
    with (
        patch("app.infrastructure.llm.gemini.asyncio.sleep", new_callable=AsyncMock),
        pytest.raises(error),
    ):
        run(generate(instance))
    assert call.await_count == (1 if code == 400 else 2)


def test_api_error_without_code_is_not_retryable():
    instance, call = provider([errors.APIError(None, {})] * 3, llm_max_retries=1)
    with pytest.raises(LLMProviderError):
        run(generate(instance))
    assert call.await_count == 1


def test_timeout():
    async def slow(**kwargs):
        await asyncio.sleep(1)

    instance, call = provider(slow, llm_timeout_s=0.001, llm_max_retries=0)
    with pytest.raises(LLMTimeoutError):
        run(generate(instance))
    assert call.await_count == 1


def test_fake():
    metadata = LLMMetadata(
        provider="fake", model="test", temperature=0, started_at="now", latency_ms=0, attempts=1
    )
    result = LLMResult(value=Answer(name="ok", count=2), raw_text="{}", metadata=metadata)
    fake = FakeLLMProvider([result, LLMRateLimitError("rate limited")])
    assert isinstance(fake, LLMProvider)
    assert run(generate(fake)).value == result.value
    with pytest.raises(LLMRateLimitError):
        run(generate(fake))


def test_gemini_satisfies_runtime_protocol():
    instance, _ = provider([response()])
    assert isinstance(instance, LLMProvider)


def test_programming_errors_are_not_hidden():
    instance, _ = provider([TypeError("programming mistake")])
    with pytest.raises(TypeError, match="programming mistake"):
        run(generate(instance))


@pytest.mark.live
@pytest.mark.skipif(not os.getenv("GEMINI_API_KEY"), reason="GEMINI_API_KEY not set")
def test_live_gemini():
    instance = GeminiProvider(Settings())
    result = run(
        instance.generate_structured(
            system="Return a concise structured answer.",
            user="Name one color and count it as one.",
            response_model=Answer,
        )
    )
    assert result.value.name and result.value.count == 1
