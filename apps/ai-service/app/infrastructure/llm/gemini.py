import asyncio
import logging
import random
import time
from datetime import UTC, datetime

import httpx
from google import genai
from google.genai import errors, types
from pydantic import ValidationError

from app.config import Settings

from .base import (
    LLMError,
    LLMMetadata,
    LLMProviderError,
    LLMRateLimitError,
    LLMResult,
    LLMSchemaError,
    LLMTimeoutError,
    T,
)

logger = logging.getLogger(__name__)


class GeminiProvider:
    def __init__(self, settings: Settings):
        self._model = settings.gemini_model
        self._timeout = settings.llm_timeout_s
        self._max_retries = settings.llm_max_retries
        if settings.gemini_api_key is None:
            raise LLMProviderError("Gemini API key is not configured")
        self._client = genai.Client(api_key=settings.gemini_api_key.get_secret_value())

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
        start = time.monotonic()
        config = types.GenerateContentConfig(
            system_instruction=system,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
            response_mime_type="application/json",
            response_schema=response_model,
        )
        for attempt in range(1, self._max_retries + 2):
            try:
                response = await asyncio.wait_for(
                    self._client.aio.models.generate_content(
                        model=self._model, contents=user, config=config
                    ),
                    timeout=self._timeout,
                )
                raw_text = response.text or ""
                try:
                    value = response_model.model_validate_json(raw_text)
                except (ValidationError, ValueError):
                    raise LLMSchemaError("Gemini response failed schema validation") from None
                usage = response.usage_metadata
                finish = response.candidates[0].finish_reason if response.candidates else None
                metadata = LLMMetadata(
                    provider="gemini",
                    model=self._model,
                    temperature=temperature,
                    started_at=started_at,
                    latency_ms=(time.monotonic() - start) * 1000,
                    input_tokens=usage.prompt_token_count if usage else None,
                    output_tokens=usage.candidates_token_count if usage else None,
                    attempts=attempt,
                    finish_reason=(
                        getattr(finish, "value", str(finish)) if finish is not None else None
                    ),
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
                logger.warning(
                    "LLM call failed model=%s attempts=%s error=LLMSchemaError",
                    self._model,
                    attempt,
                )
                raise
            except (TimeoutError, errors.APIError, httpx.HTTPError) as exc:
                if isinstance(exc, TimeoutError):
                    error: LLMError = LLMTimeoutError("Gemini call timed out")
                    retryable = True
                elif isinstance(exc, httpx.HTTPError):
                    error = LLMProviderError("Gemini network call failed")
                    retryable = True
                elif exc.code == 429:
                    error = LLMRateLimitError("Gemini rate limit exceeded")
                    retryable = True
                else:
                    error = LLMProviderError("Gemini API call failed")
                    retryable = exc.code is not None and 500 <= exc.code < 600
                if not retryable or attempt > self._max_retries:
                    logger.warning(
                        "LLM call failed model=%s attempts=%s error=%s",
                        self._model,
                        attempt,
                        type(error).__name__,
                    )
                    raise error from None
                await asyncio.sleep(min(0.5 * 2 ** (attempt - 1), 8.0) * random.uniform(0.5, 1.0))
        raise AssertionError("unreachable")
