import asyncio
import hashlib

import pytest

from app.embeddings import FakeEmbedder
from app.infrastructure.llm import FakeLLMProvider, LLMMetadata, LLMProviderError, LLMResult
from app.pipelines.screening import (
    EscalationRule,
    JobDescription,
    ScreeningConfig,
    screen,
    screen_with_escalation,
)
from app.pipelines.screening.models import EscalationScreeningResult

CV = "Built APIs."


def jd(coverage):
    return JobDescription.model_validate(
        {
            "id": "jd-a",
            "title": "Backend",
            "summary": "Build APIs",
            "criteria": [
                {
                    "code": code,
                    "label": code,
                    "description": "Build APIs",
                    "priority": "must_have",
                    "weight": weight,
                    "keywords": ["APIs"],
                }
                for code, weight in [("api", coverage), ("other", 1 - coverage)]
            ],
        }
    )


def response(level="strong", model="primary", quote=CV):
    return LLMResult.model_construct(
        value={
            "criteria": [
                {
                    "criterion_id": code,
                    "level": level if code == "api" else "unknown",
                    "confidence": 1,
                    "reason": "fixture",
                    "evidence": [{"quote": quote}] if code == "api" else [],
                    "missing_information": [],
                }
                for code in ["api", "other"]
            ]
        },
        raw_text="fixture",
        metadata=LLMMetadata(
            provider="fake",
            model=model,
            temperature=0,
            started_at="2026-11-22T00:00:00Z",
            latency_ms=10,
            attempts=1,
        ),
    )


class RecordingProvider(FakeLLMProvider):
    def __init__(self, responses):
        super().__init__(responses)
        self.calls = []

    async def generate_structured(self, **kwargs):
        self.calls.append(kwargs)
        return await super().generate_structured(**kwargs)


@pytest.mark.parametrize(
    "coverage,triggered", [(0.69, False), (0.7, True), (0.8, True), (0.9, False), (1, False)]
)
def test_band_edges_and_serialization(coverage, triggered):
    primary = RecordingProvider([response()])
    stronger = RecordingProvider([response(model="stronger")])
    result = asyncio.run(
        screen_with_escalation(
            CV,
            jd(coverage),
            provider=primary,
            escalation_provider=stronger,
            escalation_model="stronger",
        )
    )
    assert result.escalation.triggered is triggered
    assert result.escalation.reasons == (["coverage_band"] if triggered else [])
    assert len(stronger.calls) == int(triggered)
    assert result.llm.model == ("stronger" if triggered else "primary")
    assert result.versions.model == result.llm.model
    assert result.escalation.primary_result_summary["total"]["coverage"] == coverage
    assert result.escalation.primary_result_summary["llm"]["model"] == "primary"
    assert result.escalation.total_latency_s == (
        result.escalation.primary_latency_s + result.escalation.escalation_latency_s
    )
    assert EscalationScreeningResult.model_validate_json(result.model_dump_json()) == result


@pytest.mark.parametrize("level,quote", [("needs_review", CV), ("strong", "invented quote")])
def test_final_needs_review_trigger(level, quote):
    result = asyncio.run(
        screen_with_escalation(
            CV,
            jd(1),
            provider=FakeLLMProvider([response(level=level, quote=quote)]),
            escalation_provider=FakeLLMProvider([response(model="stronger")]),
            escalation_model="stronger",
        )
    )
    assert result.escalation.reasons == ["needs_review"]
    assert result.escalation.primary_result_summary["levels"]["api"] == "needs_review"
    assert result.total.coverage == 1


@pytest.mark.parametrize(
    "failure",
    [LLMProviderError("unavailable"), ValueError("bad response"), response(level="invalid")],
)
def test_failure_preserves_primary(failure):
    baseline = asyncio.run(screen(CV, jd(0.8), provider=FakeLLMProvider([response()])))
    result = asyncio.run(
        screen_with_escalation(
            CV,
            jd(0.8),
            provider=FakeLLMProvider([response()]),
            escalation_provider=FakeLLMProvider([failure]),
            escalation_model="stronger",
        )
    )
    saved = result.model_dump()
    metadata = saved.pop("escalation")
    assert saved == baseline.model_dump()
    assert metadata["triggered"]
    assert metadata["error"]["class"] in {"LLMProviderError", "ValueError", "LLMSchemaError"}
    assert metadata["escalation_latency_s"] > 0


@pytest.mark.parametrize("mode", ["full", "lexical", "dense", "hybrid"])
def test_identical_prompts_config_and_inputs(mode):
    primary = RecordingProvider([response()])
    stronger = RecordingProvider([response(model="stronger")])
    config = ScreeningConfig(
        context_mode="full" if mode == "full" else "retrieved",
        retrieval_mode="lexical" if mode == "full" else mode,
        prompt_version="screening-v2",
        retrieval_k=1,
    )
    result = asyncio.run(
        screen_with_escalation(
            CV,
            jd(0.8),
            provider=primary,
            escalation_provider=stronger,
            escalation_model="stronger",
            config=config,
            embedder=FakeEmbedder(),
        )
    )
    assert primary.calls == stronger.calls
    assert result.versions.config == config


@pytest.mark.parametrize(
    "low,high", [(0.9, 0.7), (0.7, 0.7), (-0.1, 0.9), (0.7, 1.1), (float("nan"), 0.9)]
)
def test_invalid_band(low, high):
    with pytest.raises(ValueError):
        EscalationRule(coverage_low=low, coverage_high=high)


def test_primary_failure_propagates():
    stronger = RecordingProvider([])
    with pytest.raises(LLMProviderError):
        asyncio.run(
            screen_with_escalation(
                CV,
                jd(1),
                provider=FakeLLMProvider([LLMProviderError("failed")]),
                escalation_provider=stronger,
                escalation_model="stronger",
            )
        )
    assert not stronger.calls


def test_cancellation_propagates():
    class CancelledProvider:
        async def generate_structured(self, **kwargs):
            raise asyncio.CancelledError

    with pytest.raises(asyncio.CancelledError):
        asyncio.run(
            screen_with_escalation(
                CV,
                jd(0.8),
                provider=FakeLLMProvider([response()]),
                escalation_provider=CancelledProvider(),
                escalation_model="stronger",
            )
        )


def test_default_screen_serialization_matches_pre_escalation_baseline():
    result = asyncio.run(screen(CV, jd(0.8), provider=FakeLLMProvider([response()])))
    # Captured from the original screen() with these deterministic fake inputs.
    assert hashlib.sha256(result.model_dump_json().encode()).hexdigest() == (
        "7192dfdcfdcf3ccb9911462343675eb48b5a9a6c3420cfe4e0d201afd5aa8d41"
    )


def test_both_reasons_trigger_only_one_second_opinion(monkeypatch):
    from app.pipelines import screening

    original = screening._prepare_screen
    prepared = []

    def prepare(*args):
        prepared.append(True)
        return original(*args)

    monkeypatch.setattr(screening, "_prepare_screen", prepare)
    stronger = RecordingProvider([response(model="stronger")])
    primary_response = response()
    primary_response.value["criteria"][1]["level"] = "needs_review"
    result = asyncio.run(
        screen_with_escalation(
            CV,
            jd(0.8),
            provider=FakeLLMProvider([primary_response]),
            escalation_provider=stronger,
            escalation_model="stronger",
        )
    )
    assert result.escalation.reasons == ["needs_review", "coverage_band"]
    assert len(stronger.calls) == 1
    assert prepared == [True]
