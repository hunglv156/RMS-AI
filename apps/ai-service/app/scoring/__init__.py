"""Scoring Engine (README 11): hàm thuần, cùng đầu vào luôn cho cùng đầu ra."""

from collections.abc import Mapping, Sequence
from math import isfinite
from typing import Any

KNOWN_STATUSES = {"supported", "partially_supported", "not_supported"}

LEVEL_TO_STATUS = {
    "strong": "supported",
    "adequate": "supported",
    "partial": "partially_supported",
    "absent": "not_supported",
    "unknown": "unknown",
    "needs_review": "needs_review",
}

DEFAULT_RUBRIC_VALUES = {"strong": 1.0, "adequate": 0.7, "partial": 0.4, "absent": 0.0}


def resolve_level(level: str, rubric_values: Mapping[str, float]) -> dict[str, Any]:
    """Đổi level do LLM chọn thành status và match_value theo config (ADR 0005)."""
    status = LEVEL_TO_STATUS[level]
    return {
        "status": status,
        "match_value": rubric_values[level] if status in KNOWN_STATUSES else None,
    }


def score_criteria(results: Sequence[Mapping[str, Any]], min_coverage: float) -> dict[str, Any]:
    ids = [r["criterion_id"] for r in results]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate criterion_id")

    for r in results:
        if not isfinite(r["weight"]) or r["weight"] < 0:
            raise ValueError("Weights must be finite and non-negative")

    total = sum(r["weight"] for r in results)
    if total <= 0:
        raise ValueError("Criteria weights must sum to a positive number")

    known = [r for r in results if r["status"] in KNOWN_STATUSES and r["validated"]]
    for r in known:
        if not 0 <= r["match_value"] <= 1:
            raise ValueError("match_value must be in [0, 1] for known criteria")

    known_weight = sum(r["weight"] for r in known)
    weighted = sum(r["weight"] * r["match_value"] for r in known)
    coverage = known_weight / total

    has_score = known_weight > 0 and coverage >= min_coverage
    verified = {
        r["criterion_id"] for r in known if r["status"] in {"supported", "partially_supported"}
    }

    return {
        "score_state": "scored" if has_score else "insufficient_coverage",
        "observed_score": round(100 * weighted / known_weight, 2) if has_score else None,
        "coverage": round(coverage, 4),
        "lower_bound": round(100 * weighted / total, 2),
        "upper_bound": round(100 * (weighted + total - known_weight) / total, 2),
        "requires_manual_review": any(
            r["priority"] == "must_have" and r["criterion_id"] not in verified for r in results
        ),
    }
