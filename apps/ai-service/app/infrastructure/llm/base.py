from typing import Protocol, TypeVar, runtime_checkable

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class LLMMetadata(BaseModel):
    provider: str
    model: str
    temperature: float
    started_at: str
    latency_ms: float
    input_tokens: int | None = None
    output_tokens: int | None = None
    attempts: int
    finish_reason: str | None = None


class LLMResult[T: BaseModel](BaseModel):
    value: T
    raw_text: str
    metadata: LLMMetadata


@runtime_checkable
class LLMProvider(Protocol):
    async def generate_structured(
        self,
        *,
        system: str,
        user: str,
        response_model: type[T],
        temperature: float = 0.0,
        max_output_tokens: int | None = None,
    ) -> LLMResult[T]: ...


class LLMError(Exception):
    """A safe-to-log LLM failure."""


class LLMRateLimitError(LLMError):
    pass


class LLMTimeoutError(LLMError):
    pass


class LLMProviderError(LLMError):
    pass


class LLMSchemaError(LLMError):
    pass
