import math
from typing import Any

import pytest
from hypothesis import given
from hypothesis import strategies as st

from app.scoring import (
    DEFAULT_RUBRIC_VALUES,
    KNOWN_STATUSES,
    LEVEL_TO_STATUS,
    resolve_level,
    score_criteria,
)

LEVELS = list(LEVEL_TO_STATUS)


def make(
    level: str, weight: float, cid: str, priority: str = "nice_to_have", validated: bool = True
) -> dict[str, Any]:
    r = resolve_level(level, DEFAULT_RUBRIC_VALUES)
    return {
        "criterion_id": cid,
        "weight": weight,
        "priority": priority,
        "validated": validated,
        **r,
    }


@st.composite
def criteria(draw: st.DrawFn) -> list[dict[str, Any]]:
    n = draw(st.integers(1, 12))
    out = []
    for i in range(n):
        out.append(
            make(
                draw(st.sampled_from(LEVELS)),
                draw(st.floats(0, 100, allow_nan=False, allow_infinity=False)),
                f"c{i}",
                draw(st.sampled_from(["must_have", "nice_to_have"])),
                draw(st.booleans()),
            )
        )
    # Ít nhất một tiêu chí trọng số dương (điều kiện của công thức).
    out[0]["weight"] = max(out[0]["weight"], 1.0)
    return out


def test_resolve_level_maps_status_and_value() -> None:
    assert resolve_level("strong", DEFAULT_RUBRIC_VALUES) == {
        "status": "supported",
        "match_value": 1.0,
    }
    assert resolve_level("partial", DEFAULT_RUBRIC_VALUES) == {
        "status": "partially_supported",
        "match_value": 0.4,
    }
    assert resolve_level("absent", DEFAULT_RUBRIC_VALUES) == {
        "status": "not_supported",
        "match_value": 0.0,
    }
    assert resolve_level("unknown", DEFAULT_RUBRIC_VALUES) == {
        "status": "unknown",
        "match_value": None,
    }
    assert resolve_level("needs_review", DEFAULT_RUBRIC_VALUES) == {
        "status": "needs_review",
        "match_value": None,
    }


def test_readme_style_example() -> None:
    res = score_criteria(
        [make("strong", 30, "a", "must_have"), make("partial", 20, "b"), make("unknown", 50, "c")],
        min_coverage=0.4,
    )
    assert res["coverage"] == 0.5
    assert res["observed_score"] == round(100 * (30 * 1.0 + 20 * 0.4) / 50, 2)  # 76.0
    assert res["lower_bound"] == 38.0 and res["upper_bound"] == 88.0
    assert res["score_state"] == "scored" and res["requires_manual_review"] is False


def test_insufficient_coverage_hides_score() -> None:
    res = score_criteria([make("strong", 10, "a"), make("unknown", 90, "b")], min_coverage=0.6)
    assert res["score_state"] == "insufficient_coverage" and res["observed_score"] is None
    assert res["coverage"] == 0.1


def test_unvalidated_known_result_is_not_counted() -> None:
    res = score_criteria([make("strong", 10, "a", validated=False), make("adequate", 10, "b")], 0.0)
    assert res["coverage"] == 0.5 and res["observed_score"] == 70.0


def test_must_have_without_verified_support_requires_review() -> None:
    res = score_criteria([make("absent", 10, "a", "must_have"), make("strong", 10, "b")], 0.0)
    assert res["requires_manual_review"] is True


@pytest.mark.parametrize("bad", [-1.0, math.inf, math.nan])
def test_rejects_invalid_weights(bad: float) -> None:
    with pytest.raises(ValueError):
        score_criteria([make("strong", bad, "a"), make("strong", 5, "b")], 0.5)


def test_rejects_zero_total_and_duplicates() -> None:
    with pytest.raises(ValueError):
        score_criteria([make("strong", 0, "a")], 0.5)
    with pytest.raises(ValueError):
        score_criteria([make("strong", 1, "a"), make("strong", 1, "a")], 0.5)


@given(criteria(), st.floats(0, 1))
def test_score_within_bounds_and_deterministic(
    results: list[dict[str, Any]], min_cov: float
) -> None:
    first = score_criteria(results, min_cov)
    assert first == score_criteria([dict(r) for r in results], min_cov)
    assert 0 <= first["coverage"] <= 1
    assert 0 <= first["lower_bound"] <= first["upper_bound"] <= 100
    if first["score_state"] == "scored":
        assert first["lower_bound"] - 0.01 <= first["observed_score"] <= first["upper_bound"] + 0.01
        assert 0 <= first["observed_score"] <= 100
    else:
        assert first["observed_score"] is None


@given(criteria())
def test_adding_unknown_never_raises_lower_bound(results: list[dict[str, Any]]) -> None:
    base = score_criteria(results, 0.0)
    more = score_criteria([*results, make("unknown", 7.0, "extra")], 0.0)
    assert more["lower_bound"] <= base["lower_bound"] + 0.01
    assert more["upper_bound"] >= base["upper_bound"] - 0.01


def test_known_statuses_constant() -> None:
    assert KNOWN_STATUSES == {"supported", "partially_supported", "not_supported"}
