from collections import deque

from .base import LLMResult, LLMSchemaError, T


class FakeLLMProvider:
    """Return scripted results or raise scripted exceptions in order."""

    def __init__(self, responses: list[LLMResult | Exception]):
        self._responses = deque(responses)

    async def generate_structured(
        self,
        *,
        system: str,
        user: str,
        response_model: type[T],
        temperature: float = 0.0,
        max_output_tokens: int | None = None,
    ) -> LLMResult[T]:
        response = self._responses.popleft()
        if isinstance(response, Exception):
            raise response
        try:
            value = response_model.model_validate(response.value)
        except ValueError as exc:
            raise LLMSchemaError("Fake response failed schema validation") from exc
        return LLMResult(value=value, raw_text=response.raw_text, metadata=response.metadata)
