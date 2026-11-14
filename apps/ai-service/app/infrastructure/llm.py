import asyncio
import time
from typing import Any, Protocol

import httpx
from pydantic import BaseModel

from app.config import LLM_NUM_CTX


class LLMResult(BaseModel):
    content: str
    model: str
    prompt_tokens: int | None = None
    prompt_seconds: float = 0.0
    output_tokens: int | None = None
    output_seconds: float = 0.0
    total_seconds: float = 0.0
    done_reason: str | None = None


class LLMProvider(Protocol):
    """Giao diện LLM (ADR 0002): đổi provider không đổi nghiệp vụ."""

    model: str

    async def chat(
        self, system: str, user: str, schema: dict[str, Any], *, max_tokens: int = 2000
    ) -> LLMResult: ...


class OllamaProvider:
    """Ollama native. Concurrency = 1: một Qwen3 14B trên máy 16GB không chạy song song được."""

    def __init__(self, base_url: str, model: str, keep_alive: str = "30m") -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.keep_alive = keep_alive
        self._lock = asyncio.Lock()

    async def chat(
        self, system: str, user: str, schema: dict[str, Any], *, max_tokens: int = 2000
    ) -> LLMResult:
        async with self._lock:
            start = time.perf_counter()
            async with httpx.AsyncClient(timeout=httpx.Timeout(600, connect=5)) as client:
                resp = await client.post(
                    f"{self.base_url}/api/chat",
                    json={
                        "model": self.model,
                        "stream": False,
                        "think": False,
                        "keep_alive": self.keep_alive,
                        "format": schema,
                        "options": {
                            "temperature": 0,
                            "seed": 42,
                            "num_ctx": LLM_NUM_CTX,
                            "num_predict": max_tokens,
                        },
                        "messages": [
                            {"role": "system", "content": system},
                            {"role": "user", "content": user},
                        ],
                    },
                )
            resp.raise_for_status()
            body = resp.json()
            return LLMResult(
                content=body["message"]["content"],
                model=self.model,
                prompt_tokens=body.get("prompt_eval_count"),
                prompt_seconds=round(body.get("prompt_eval_duration", 0) / 1e9, 2),
                output_tokens=body.get("eval_count"),
                output_seconds=round(body.get("eval_duration", 0) / 1e9, 2),
                total_seconds=round(time.perf_counter() - start, 2),
                done_reason=body.get("done_reason"),
            )
