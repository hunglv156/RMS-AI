"""Explicit offline demo provider; always reports missing evidence, never invents it."""

import json

from app.infrastructure.llm import LLMMetadata, LLMResult


class DeterministicProvider:
    async def generate_structured(self, *, user, response_model, **kwargs):
        payload = json.loads(user)
        value = response_model.model_validate(
            {
                "criteria": [
                    {
                        "criterion_id": c["code"],
                        "level": "unknown",
                        "confidence": 0,
                        "reason": "DETERMINISTIC DEMO PROVIDER: evidence requires human review.",
                        "evidence": [],
                        "missing_information": ["Deterministic demo assessment"],
                    }
                    for c in payload["jd"]["criteria"]
                ]
            }
        )
        return LLMResult(
            value=value,
            raw_text="deterministic demo",
            metadata=LLMMetadata(
                provider="deterministic",
                model="deterministic-v1",
                temperature=0,
                started_at="2000-01-01T00:00:00Z",
                latency_ms=0,
                attempts=1,
            ),
        )
