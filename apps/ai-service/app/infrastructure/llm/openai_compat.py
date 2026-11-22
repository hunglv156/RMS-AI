import asyncio
import json
import logging
import random
import re
import time
from datetime import UTC, datetime

import httpx
from pydantic import ValidationError

from app.config import Settings

from .base import (
    LLMMetadata,
    LLMProviderError,
    LLMRateLimitError,
    LLMResult,
    LLMSchemaError,
    LLMTimeoutError,
    T,
)

logger = logging.getLogger(__name__)
_FENCE = re.compile(r"^\s*```(?:json)?\s*([\s\S]*?)\s*```\s*$", re.IGNORECASE)


class OpenAICompatProvider:
    def __init__(self, settings: Settings):
        self._base_url = (settings.llm_base_url or "").rstrip("/")
        self._model = settings.llm_model
        self._timeout = settings.llm_timeout_s
        self._max_retries = settings.llm_max_retries
        self._hedge_after = settings.llm_hedge_after_s
        if not self._base_url or settings.llm_api_key is None:
            raise LLMProviderError("OpenAI-compatible gateway URL and API key are required")
        self._api_key = settings.llm_api_key.get_secret_value()

    async def generate_structured(
        self,
        *,
        system: str,
        user: str,
        response_model: type[T],
        temperature: float = 0.0,
        max_output_tokens: int | None = None,
    ) -> LLMResult[T]:
        started_at = datetime.now(UTC).isoformat()
        started = time.monotonic()
        schema = json.dumps(response_model.model_json_schema(), separators=(",", ":"))
        prompt = f"{system}\n\nRespond with JSON matching this schema:\n{schema}"
        body: dict = {
            "model": self._model,
            "messages": [{"role": "system", "content": prompt}, {"role": "user", "content": user}],
            "stream": False,
            "temperature": temperature,
            "response_format": {"type": "json_object"},
        }
        if max_output_tokens is not None:
            body["max_tokens"] = max_output_tokens

        reported_usage: list[dict] = []
        hedge_state = {"hedged": False, "winner": "primary"}
        for attempt in range(1, self._max_retries + 2):
            try:
                if self._hedge_after is None:
                    async with httpx.AsyncClient(timeout=self._timeout) as client:
                        response = await client.post(
                            f"{self._base_url}/chat/completions",
                            headers={"Authorization": f"Bearer {self._api_key}"},
                            json=body,
                        )
                    if response.status_code == 429:
                        raise LLMRateLimitError("LLM gateway rate limit exceeded")
                    if response.status_code >= 500:
                        raise _TransientProviderError
                    response.raise_for_status()
                    raw_text, finish_reason, usage, actual_model = _read_response(response)
                    match = _FENCE.match(raw_text)
                    validated_text = match.group(1) if match else raw_text
                    try:
                        value = response_model.model_validate_json(validated_text)
                    except (ValidationError, ValueError, TypeError):
                        if attempt <= self._max_retries:
                            await _backoff(attempt)
                            continue
                        raise LLMSchemaError("LLM response failed schema validation") from None
                else:
                    try:
                        value, raw_text, finish_reason, actual_model = await self._hedged_attempt(
                            body, response_model, reported_usage, hedge_state
                        )
                    except LLMSchemaError:
                        if attempt <= self._max_retries:
                            await _backoff(attempt)
                            continue
                        raise
                    usage = {
                        key: sum(values) if values else None
                        for key in ("prompt_tokens", "completion_tokens")
                        for values in [[u[key] for u in reported_usage if u.get(key) is not None]]
                    }
                metadata = LLMMetadata(
                    provider="openai_compat",
                    model=self._model,
                    response_model=actual_model,
                    temperature=temperature,
                    started_at=started_at,
                    latency_ms=(time.monotonic() - started) * 1000,
                    input_tokens=usage.get("prompt_tokens"),
                    output_tokens=usage.get("completion_tokens"),
                    attempts=attempt,
                    finish_reason=finish_reason,
                    hedged=hedge_state["hedged"] if self._hedge_after is not None else None,
                    winner=hedge_state["winner"] if self._hedge_after is not None else None,
                )
                logger.info(
                    "LLM call model=%s latency_ms=%.2f input_tokens=%s output_tokens=%s attempts=%s",
                    self._model,
                    metadata.latency_ms,
                    metadata.input_tokens,
                    metadata.output_tokens,
                    attempt,
                )
                return LLMResult(value=value, raw_text=raw_text, metadata=metadata)
            except LLMSchemaError:
                raise
            except (httpx.TimeoutException, TimeoutError):
                error = LLMTimeoutError("LLM gateway call timed out")
                retryable = True
            except LLMRateLimitError as exc:
                error, retryable = exc, True
            except _TransientProviderError:
                error, retryable = LLMProviderError("LLM gateway server error"), True
            except httpx.HTTPStatusError:
                error, retryable = LLMProviderError("LLM gateway HTTP error"), False
            except httpx.HTTPError:
                error, retryable = LLMProviderError("LLM gateway network error"), True
            if not retryable or attempt > self._max_retries:
                logger.warning(
                    "LLM call failed model=%s attempts=%s error=%s",
                    self._model,
                    attempt,
                    type(error).__name__,
                )
                raise error from None
            await _backoff(attempt)
        raise AssertionError("unreachable")

    async def _hedged_attempt(self, body, response_model, reported_usage, state):
        """Race valid responses; retain the primary error when both requests fail.

        Each request keeps the configured HTTP timeout. Hedging reduces tail
        latency probabilistically; it does not impose a total call deadline.
        """
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            successes = []

            async def request(name):
                response = await client.post(
                    f"{self._base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {self._api_key}"},
                    json=body,
                )
                if response.status_code == 429:
                    raise LLMRateLimitError("LLM gateway rate limit exceeded")
                if response.status_code >= 500:
                    raise _TransientProviderError
                response.raise_for_status()
                raw_text, finish_reason, usage, actual_model = _read_response(response)
                reported_usage.append(usage)
                match = _FENCE.match(raw_text)
                try:
                    value = response_model.model_validate_json(
                        match.group(1) if match else raw_text
                    )
                except (ValidationError, ValueError, TypeError):
                    raise LLMSchemaError("LLM response failed schema validation") from None
                successes.append(name)
                return value, raw_text, finish_reason, actual_model

            primary = asyncio.create_task(request("primary"))
            tasks = {primary: "primary"}
            try:
                done, _ = await asyncio.wait(tasks, timeout=self._hedge_after)
                if done:
                    state["winner"] = "primary"
                    return primary.result()
                state["hedged"] = True
                tasks[asyncio.create_task(request("hedge"))] = "hedge"
                pending = set(tasks)
                errors = {}
                while pending:
                    done, pending = await asyncio.wait(pending, return_when=asyncio.FIRST_COMPLETED)
                    if successes:
                        state["winner"] = successes[0]
                        winner = next(task for task, name in tasks.items() if name == successes[0])
                        return winner.result()
                    for task in tasks:
                        if task not in done:
                            continue
                        errors[task] = task.exception()
                raise errors[primary]
            finally:
                for task in tasks:
                    if not task.done():
                        task.cancel()
                await asyncio.gather(*tasks, return_exceptions=True)


class _TransientProviderError(Exception):
    pass


async def _backoff(attempt: int) -> None:
    await asyncio.sleep(min(0.5 * 2 ** (attempt - 1), 8.0) * random.uniform(0.5, 1.0))


def _read_response(response: httpx.Response) -> tuple[str, str | None, dict, str | None]:
    content_type = response.headers.get("content-type", "")
    if "text/event-stream" not in content_type and not response.text.lstrip().startswith("data:"):
        payload = response.json()
        choice = payload["choices"][0]
        return (
            choice.get("message", {}).get("content") or "",
            choice.get("finish_reason"),
            payload.get("usage") or {},
            payload.get("model"),
        )
    content: list[str] = []
    finish = None
    usage: dict = {}
    model = None
    for line in response.text.splitlines():
        if not line.startswith("data:"):
            continue
        chunk = line[5:].strip()
        if chunk == "[DONE]":
            continue
        payload = json.loads(chunk)
        model = payload.get("model", model)
        usage = payload.get("usage") or usage
        for choice in payload.get("choices", []):
            delta = choice.get("delta", {})
            if delta.get("content"):
                content.append(delta["content"])
            if choice.get("finish_reason") is not None:
                finish = choice["finish_reason"]
    return "".join(content), finish, usage, model
