"""Provider-independent structured LLM calls."""

from app.config import Settings

from .base import (
    LLMError,
    LLMMetadata,
    LLMProvider,
    LLMProviderError,
    LLMRateLimitError,
    LLMResult,
    LLMSchemaError,
    LLMTimeoutError,
)
from .fake import FakeLLMProvider
from .gemini import GeminiProvider
from .openai_compat import OpenAICompatProvider

__all__ = [
    "FakeLLMProvider",
    "GeminiProvider",
    "LLMError",
    "LLMMetadata",
    "LLMProvider",
    "LLMProviderError",
    "LLMRateLimitError",
    "LLMResult",
    "LLMSchemaError",
    "LLMTimeoutError",
    "OpenAICompatProvider",
    "get_llm_provider",
]


def get_llm_provider(settings: Settings):
    if settings.llm_base_url and settings.llm_api_key is not None:
        return OpenAICompatProvider(settings)
    if settings.gemini_api_key is not None:
        return GeminiProvider(settings)
    raise LLMProviderError("Configure an OpenAI-compatible gateway or GEMINI_API_KEY")
