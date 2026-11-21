"""Pure scoring helpers for validated criterion assessments."""

from collections.abc import Collection
from math import isfinite
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

KNOWN_STATUSES = frozenset({"supported", "partially_supported", "not_supported"})
LEVEL_TO_STATUS = {
    "strong": "supported",
    "adequate": "supported",
    "partial": "partially_supported",
    "absent": "not_supported",
    "unknown": "unknown",
    "needs_review": "needs_review",
}
DEFAULT_RUBRIC = {"strong": 1.0, "adequate": 0.7, "partial": 0.4, "absent": 0.0}
"""Illustrative rubric values; callers must pass their configured rubric explicitly."""


class CriterionResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    criterion_id: str = Field(min_length=1)
    weight: float
    priority: Literal["must_have", "nice_to_have"]
    status: str
    match_value: float | None
    validated: bool

    @field_validator("weight")
    @classmethod
    def finite_nonnegative_weight(cls, value: float) -> float:
        if not isfinite(value) or value < 0:
            raise ValueError("weight must be finite and non-negative")
        return value


class ScoreOutput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    score_state: Literal["scored", "insufficient_coverage"]
    observed_score: float | None
    coverage: float
    lower_bound: float
    upper_bound: float
    requires_manual_review: bool


def resolve_level(level: str, rubric_values: dict[str, float]) -> dict[str, str | float | None]:
    """Map an LLM level to status and configured match value, without a hidden rubric."""
    try:
        status = LEVEL_TO_STATUS[level]
    except KeyError as exc:
        raise ValueError(f"Unknown assessment level: {level}") from exc
    return {
        "status": status,
        "match_value": rubric_values[level] if status in KNOWN_STATUSES else None,
    }


def score_criteria(
    results: list[CriterionResult | dict],
    min_coverage: float,
    *,
    expected_criterion_ids: Collection[str] | None = None,
) -> ScoreOutput:
    """Score validated criteria with README §11.5 rounding and coverage semantics.

    If ``expected_criterion_ids`` is supplied, a differing criterion set is rejected.
    Zero-weight criteria count in neither numerator nor denominator and cannot alone
    trigger manual review.
    """
    if not isfinite(min_coverage) or not 0 <= min_coverage <= 1:
        raise ValueError("min_coverage must be finite and in [0, 1]")
    criteria = [
        r if isinstance(r, CriterionResult) else CriterionResult.model_validate(r) for r in results
    ]
    ids = [r.criterion_id for r in criteria]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate criterion_id")
    if expected_criterion_ids is not None and set(ids) != set(expected_criterion_ids):
        raise ValueError("Criterion set differs from expected_criterion_ids")
    total = sum(r.weight for r in criteria)
    if total <= 0:
        raise ValueError("Criteria weights must sum to a positive number")
    validated_known = [r for r in criteria if r.status in KNOWN_STATUSES and r.validated]
    for r in validated_known:
        if r.match_value is None or not isfinite(r.match_value) or not 0 <= r.match_value <= 1:
            raise ValueError("match_value must be finite and in [0, 1] for known criteria")
    known = [r for r in validated_known if r.weight > 0]
    known_weight = sum(r.weight for r in known)
    weighted = sum(r.weight * r.match_value for r in known if r.match_value is not None)
    coverage = known_weight / total
    has_score = known_weight > 0 and coverage >= min_coverage
    verified = {r.criterion_id for r in known if r.status in {"supported", "partially_supported"}}
    return ScoreOutput(
        score_state="scored" if has_score else "insufficient_coverage",
        observed_score=round(100 * weighted / known_weight, 2) if has_score else None,
        coverage=round(coverage, 4),
        lower_bound=round(100 * weighted / total, 2),
        upper_bound=round(100 * (weighted + total - known_weight) / total, 2),
        requires_manual_review=any(
            r.weight > 0 and r.priority == "must_have" and r.criterion_id not in verified
            for r in criteria
        ),
    )
