import asyncio
import json
from pathlib import Path

import pymupdf
import pytest
from pydantic import ValidationError

from app.embeddings import FakeEmbedder
from app.infrastructure.llm.base import LLMMetadata, LLMResult, LLMSchemaError
from app.infrastructure.llm.fake import FakeLLMProvider
from app.pipelines.screening import ScreeningConfig, load_jd, screen
from app.pipelines.screening.models import ScreeningResponse, ScreeningResult

ROOT = Path(__file__).resolve().parents[4]
CV = "Built Python backends with FastAPI.\nBuilt REST APIs for 100 clients."
JD = ROOT / "data/eval/jds/jd-a.yaml"


class RecordingProvider(FakeLLMProvider):
    def __init__(self, responses):
        super().__init__(responses)
        self.calls = []

    async def generate_structured(self, **kwargs):
        self.calls.append(kwargs)
        return await super().generate_structured(**kwargs)


def payload():
    return [
        {
            "criterion_id": criterion.code,
            "level": "strong" if i < 2 else "unknown",
            "confidence": 0.9,
            "reason": "Evidence from CV" if i < 2 else "Not mentioned",
            "evidence": [{"quote": CV.splitlines()[i]}] if i < 2 else [],
            "missing_information": [],
        }
        for i, criterion in enumerate(load_jd(JD).criteria)
    ]


def provider(criteria=None):
    return RecordingProvider(
        [
            LLMResult.model_construct(
                value={"criteria": payload() if criteria is None else criteria},
                raw_text="scripted",
                metadata=LLMMetadata(
                    provider="fake",
                    model="fake-model-v1",
                    temperature=0,
                    started_at="2026-11-21T00:00:00Z",
                    latency_ms=0,
                    attempts=1,
                ),
            )
        ]
    )


@pytest.mark.parametrize("mode", ["full", "lexical", "dense", "hybrid"])
def test_screen_once_and_serialize(mode):
    llm = provider()
    config = ScreeningConfig(
        context_mode="full" if mode == "full" else "retrieved",
        retrieval_mode="hybrid" if mode == "full" else mode,
        retrieval_k=1,
        min_coverage=0.5,
    )
    result = asyncio.run(screen(CV, JD, provider=llm, config=config, embedder=FakeEmbedder()))
    assert len(llm.calls) == 1
    assert llm.calls[0]["response_model"] is ScreeningResponse
    assert llm.calls[0]["temperature"] == 0
    assert json.loads(llm.calls[0]["user"])["cv_context"] == CV
    assert result.total.observed_score == 100
    assert result.total.coverage == 0.5
    assert result.total.lower_bound == 50
    assert result.total.upper_bound == 100
    assert result.criteria[0].score == 100
    assert result.criteria[0].weighted_points == 25
    assert result.criteria[0].evidence[0].verification.valid
    assert result.versions.model == "fake-model-v1"
    assert ScreeningResult.model_validate_json(result.model_dump_json()) == result
    if mode != "full":
        assert result.versions.retrieval["retrieval"]["mode"] == mode
        assert result.versions.retrieval["chunker"] == "chunk-v1"
        assert len(result.versions.retrieval["hits"]) == len(load_jd(JD).criteria)


def test_hallucinated_quote_does_not_score():
    criteria = payload()
    criteria[0]["evidence"] = [{"quote": "Python expert at Imaginary Company"}]
    result = asyncio.run(screen(CV, JD, provider=provider(criteria)))
    item = result.criteria[0]
    assert item.evidence[0].verification.reason == "quote_not_found"
    assert item.validation.raw_level == "strong"
    assert item.validation.level == "needs_review"
    assert item.score is None
    assert result.total.coverage == 0.25
    assert result.total.lower_bound == 25
    assert result.total.observed_score is None
    assert result.total.requires_manual_review


@pytest.mark.parametrize(
    "quote,reason",
    [
        ({"quote": "Built...FastAPI."}, "ellipsis_shortening"),
        ({"quote": CV.splitlines()[0], "start_offset": 0}, "both_offsets_required"),
        ({"quote": CV.splitlines()[0], "start_offset": 1, "end_offset": 34}, "quote_mismatch"),
    ],
)
def test_rejected_offsets_and_quotes(quote, reason):
    criteria = payload()
    criteria[0]["evidence"] = [quote]
    result = asyncio.run(screen(CV, JD, provider=provider(criteria)))
    assert result.criteria[0].evidence[0].verification.reason == reason
    assert result.criteria[0].scoring.match_value is None


@pytest.mark.parametrize("failure", ["missing", "duplicate", "extra", "level", "confidence"])
def test_malformed_output(failure):
    criteria = payload()
    if failure == "missing":
        criteria.pop()
    elif failure == "duplicate":
        criteria.append(criteria[0])
    elif failure == "extra":
        criteria[0]["criterion_id"] = "invented"
    elif failure == "level":
        criteria[0]["level"] = "perfect"
    else:
        criteria[0]["confidence"] = 2
    llm = provider(criteria)
    with pytest.raises(LLMSchemaError):
        asyncio.run(screen(CV, JD, provider=llm))
    assert len(llm.calls) == 1


def test_provider_schema_error_propagates():
    llm = FakeLLMProvider([LLMSchemaError("malformed JSON")])
    with pytest.raises(LLMSchemaError, match="malformed JSON"):
        asyncio.run(screen(CV, JD, provider=llm))


def test_retrieval_selects_passages_and_checks_original_offsets():
    text = "Irrelevant biography. " * 100 + "\n\nSKILLS\n" + CV
    criteria = payload()
    quote = CV.splitlines()[0]
    start = text.index(quote)
    criteria[0]["evidence"] = [
        {"quote": quote, "start_offset": start, "end_offset": start + len(quote)}
    ]
    llm = provider(criteria)
    result = asyncio.run(
        screen(
            text,
            JD,
            provider=llm,
            config=ScreeningConfig(
                context_mode="retrieved", retrieval_mode="lexical", retrieval_k=1
            ),
        )
    )
    context = json.loads(llm.calls[0]["user"])["cv_context"]
    assert len(context) < len(text)
    assert quote in context
    assert result.criteria[0].evidence[0].verification.start_offset == start
    assert result.criteria[0].score == 100


def test_dense_requires_injection():
    llm = provider()
    with pytest.raises(ValueError, match="injected embedder"):
        asyncio.run(screen(CV, JD, provider=llm, config=ScreeningConfig(context_mode="retrieved")))
    assert not llm.calls


def test_pdf_input(tmp_path):
    path = tmp_path / "cv.pdf"
    with pymupdf.open() as document:
        page = document.new_page()
        page.insert_text((72, 72), CV)
        document.save(path)
    result = asyncio.run(screen(path, JD, provider=provider()))
    assert result.criteria[0].score == 100
    assert result.versions.extraction["extractor_version"] == "extract-v1"
    assert result.versions.extraction["normalization_version"] == "norm-v1"
    json.loads(result.model_dump_json())


def test_jd_b_and_invalid_jd_and_config():
    assert load_jd(ROOT / "data/eval/jds/jd-b.yaml").id == "jd-b"
    jd = load_jd(JD).model_dump()
    jd["criteria"].append(jd["criteria"][0])
    with pytest.raises(ValidationError, match="unique"):
        type(load_jd(JD)).model_validate(jd)
    with pytest.raises(ValidationError):
        ScreeningConfig(rubric_values={"strong": float("nan")})
    with pytest.raises(ValidationError):
        ScreeningConfig(retrieval_k=0)
    with pytest.raises(ValueError, match="nonempty"):
        asyncio.run(screen(" ", JD, provider=provider()))


def test_retrieved_quote_must_appear_in_supplied_context():
    hidden = "A private introductory statement."
    text = hidden + "\n" + "Irrelevant biography. " * 100 + "\n\nSKILLS\n" + CV
    criteria = payload()
    criteria[0]["evidence"] = [{"quote": hidden}]
    llm = provider(criteria)
    result = asyncio.run(
        screen(
            text,
            JD,
            provider=llm,
            config=ScreeningConfig(
                context_mode="retrieved", retrieval_mode="lexical", retrieval_k=1
            ),
        )
    )
    assert hidden not in json.loads(llm.calls[0]["user"])["cv_context"]
    assert result.criteria[0].evidence[0].verification.reason == "quote_not_in_context"
    assert result.criteria[0].score is None


def test_mixed_evidence_keeps_valid_quote_and_uses_configured_rubric():
    criteria = payload()
    criteria[0]["evidence"].append({"quote": "Invented achievement"})
    criteria[0]["confidence"] = 0.5
    result = asyncio.run(
        screen(
            CV,
            JD,
            provider=provider(criteria),
            config=ScreeningConfig(
                min_coverage=0.5,
                rubric_values={"strong": 0.8, "adequate": 0.6, "partial": 0.2, "absent": 0},
            ),
        )
    )
    assert [quote.verification.valid for quote in result.criteria[0].evidence] == [True, False]
    assert result.total.observed_score == 80
    assert result.total.coverage == 0.5
    assert result.criteria[0].score == 80
