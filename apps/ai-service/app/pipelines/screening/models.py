"""Contracts for offline screening; default rubric values are illustrative."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.assessment.evidence import AssessmentValidation, QuoteVerification
from app.infrastructure.llm.base import LLMMetadata
from app.scoring.engine import DEFAULT_RUBRIC, CriterionResult, ScoreOutput

Level = Literal["strong", "adequate", "partial", "absent", "unknown", "needs_review"]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class ScreeningConfig(StrictModel):
    context_mode: Literal["full", "retrieved"] = "full"
    retrieval_mode: Literal["lexical", "dense", "hybrid"] = "hybrid"
    retrieval_k: int = Field(default=5, ge=1, strict=True)
    prompt_version: Literal["screening-v1", "screening-v2"] = "screening-v1"
    min_coverage: float = Field(default=0.8, ge=0, le=1)
    rubric_values: dict[str, float] = Field(default_factory=lambda: dict(DEFAULT_RUBRIC))

    @model_validator(mode="after")
    def validate_rubric(self):
        if set(self.rubric_values) != set(DEFAULT_RUBRIC) or any(
            not 0 <= value <= 1 for value in self.rubric_values.values()
        ):
            raise ValueError("Rubric must define strong, adequate, partial, absent in [0, 1]")
        return self


class JDCriterion(StrictModel):
    code: str = Field(min_length=1)
    label: str = Field(min_length=1)
    description: str = Field(min_length=1)
    priority: Literal["must_have", "nice_to_have"]
    weight: float = Field(ge=0)
    keywords: list[str] = Field(default_factory=list)


class JobDescription(StrictModel):
    id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    summary: str
    criteria: list[JDCriterion] = Field(min_length=1, max_length=8)

    @model_validator(mode="after")
    def validate_criteria(self):
        codes = [criterion.code for criterion in self.criteria]
        if len(codes) != len(set(codes)):
            raise ValueError("Criterion codes must be unique")
        if sum(criterion.weight for criterion in self.criteria) <= 0:
            raise ValueError("Criteria weights must sum to a positive number")
        return self


class EvidenceQuote(StrictModel):
    quote: str
    start_offset: int | None = Field(default=None, strict=True)
    end_offset: int | None = Field(default=None, strict=True)


class CriterionAssessment(StrictModel):
    criterion_id: str
    level: Level
    confidence: float = Field(ge=0, le=1)
    reason: str
    evidence: list[EvidenceQuote]
    missing_information: list[str]


class ScreeningResponse(StrictModel):
    criteria: list[CriterionAssessment]


class CheckedEvidence(StrictModel):
    evidence: EvidenceQuote
    verification: QuoteVerification


class ScreenedCriterion(StrictModel):
    assessment: CriterionAssessment
    validation: AssessmentValidation
    evidence: list[CheckedEvidence]
    scoring: CriterionResult
    score: float | None
    weighted_points: float | None


class ScreeningVersions(StrictModel):
    pipeline: str = "screening-pipeline-v1"
    prompt: str
    model: str
    config: ScreeningConfig
    retrieval: dict
    extraction: dict | None = None
    cv_sha256: str
    jd_sha256: str


class ScreeningResult(StrictModel):
    jd_id: str
    criteria: list[ScreenedCriterion]
    total: ScoreOutput
    llm: LLMMetadata
    versions: ScreeningVersions


class EscalationRule(StrictModel):
    coverage_low: float = Field(default=0.7, ge=0, le=1)
    coverage_high: float = Field(default=0.9, ge=0, le=1)
    triggers: frozenset[Literal["needs_review", "coverage_band"]] = Field(
        default=frozenset({"needs_review", "coverage_band"}), min_length=1
    )

    @model_validator(mode="after")
    def validate_band(self):
        if self.coverage_low >= self.coverage_high:
            raise ValueError("Escalation coverage band requires LOW < HIGH")
        return self


class EscalationMetadata(StrictModel):
    triggered: bool
    reasons: list[Literal["needs_review", "coverage_band"]]
    primary_result_summary: dict
    primary_latency_s: float
    escalation_latency_s: float = 0.0
    total_latency_s: float
    escalation_model: str
    error: dict[str, str] | None = None


class EscalationScreeningResult(ScreeningResult):
    # Separate result type preserves legacy screen() serialization byte-for-byte.
    escalation: EscalationMetadata
