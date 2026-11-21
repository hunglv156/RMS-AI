import math
import random

import pytest
from hypothesis import given
from hypothesis import strategies as st

from app.scoring import CriterionResult, resolve_level, score_criteria


def c(cid, weight, status, value=None, validated=True, priority="nice_to_have"):
    return CriterionResult(
        criterion_id=cid,
        weight=weight,
        priority=priority,
        status=status,
        match_value=value,
        validated=validated,
    )


def test_readme_worked_example():
    result = score_criteria(
        [
            c("rn", 40, "supported", 1),
            c("perf", 30, "partially_supported", 0.4),
            c("ci", 20, "unknown", None, False),
            c("collab", 10, "supported", 0.7),
        ],
        0.5,
    )
    assert result.model_dump() == {
        "score_state": "scored",
        "observed_score": 73.75,
        "coverage": 0.8,
        "lower_bound": 59.0,
        "upper_bound": 79.0,
        "requires_manual_review": False,
    }


def test_insufficient_coverage_and_zero_known_weight():
    unknown = c("x", 1, "unknown", None, False)
    assert score_criteria([unknown], 0.5).score_state == "insufficient_coverage"
    partial = score_criteria([c("a", 1, "supported", 1), c("b", 3, "unknown", None, False)], 0.5)
    assert partial.score_state == "insufficient_coverage" and partial.observed_score is None


@pytest.mark.parametrize(
    "items",
    [
        [c("x", 1, "unknown"), c("x", 1, "unknown")],
        [
            {
                "criterion_id": "x",
                "weight": -1,
                "priority": "nice_to_have",
                "status": "unknown",
                "match_value": None,
                "validated": False,
            }
        ],
        [
            {
                "criterion_id": "x",
                "weight": math.nan,
                "priority": "nice_to_have",
                "status": "unknown",
                "match_value": None,
                "validated": False,
            }
        ],
        [c("x", 0, "unknown")],
    ],
)
def test_reject_invalid_weights_and_duplicate_ids(items):
    with pytest.raises(ValueError):
        score_criteria(items, 0.5)


def test_expected_set_zero_weight_and_must_have_review():
    assert score_criteria(
        [c("must", 1, "unknown", None, False, "must_have")], 0
    ).requires_manual_review
    assert not score_criteria(
        [c("must", 0, "unknown", None, False, "must_have"), c("a", 1, "supported", 1)], 0
    ).requires_manual_review
    with pytest.raises(ValueError, match="expected_criterion_ids"):
        score_criteria([c("a", 1, "supported", 1)], 0, expected_criterion_ids={"a", "b"})
    assert score_criteria([c("a", 1, "supported", 1)], 0, expected_criterion_ids=("a",))


@pytest.mark.parametrize("value", [None, math.nan, math.inf, -0.1, 1.1])
def test_invalid_match_value_rejected_for_zero_weight_known_validated_criterion(value):
    with pytest.raises(ValueError, match="match_value"):
        score_criteria([c("zero", 0, "supported", value), c("positive", 1, "supported", 1)], 0)


def test_resolve_level():
    assert resolve_level("partial", {"partial": 0.4}) == {
        "status": "partially_supported",
        "match_value": 0.4,
    }
    assert resolve_level("unknown", {})["match_value"] is None


@given(
    st.lists(
        st.tuples(
            st.floats(min_value=0.01, max_value=100, allow_nan=False, allow_infinity=False),
            st.floats(min_value=0, max_value=1, allow_nan=False, allow_infinity=False),
            st.booleans(),
        ),
        min_size=1,
        max_size=8,
    )
)
def test_scoring_invariants_determinism_and_permutation(rows):
    criteria = [
        c(str(i), weight, "supported" if known else "unknown", value if known else None, known)
        for i, (weight, value, known) in enumerate(rows)
    ]
    result = score_criteria(criteria, 0)
    assert score_criteria(criteria, 0) == result
    for seed in range(10):
        permutation = criteria.copy()
        random.Random(seed).shuffle(permutation)
        assert score_criteria(permutation, 0) == result
    assert 0 <= result.coverage <= 1
    if result.score_state == "scored":
        assert result.lower_bound <= result.observed_score <= result.upper_bound
