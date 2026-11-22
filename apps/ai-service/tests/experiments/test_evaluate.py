"""Hand-calculated metric examples and offline CLI contract fixtures."""

import json
from math import sqrt

import numpy as np
import pytest
import yaml

from app.experiments.evaluate import (
    LEVELS,
    Pair,
    annotator_comparison,
    bootstrap,
    classification,
    criterion_metrics,
    derive_fit,
    evaluate,
    kappa,
    load_labels,
    load_run,
    main,
    rank,
    spearman,
    summarize,
)


def test_hand_calculated_exact_collapsed_binary_and_weighted_kappa():
    # Exact agreement 2/4, expected agreement 1/4 => kappa 1/3.
    # Ordinal distance sum=2; independent expected distance sum=22/4 => 7/11.
    metrics = criterion_metrics(
        ["absent", "partial", "adequate", "strong"],
        ["absent", "adequate", "strong", "strong"],
    )
    exact = metrics["exact"]
    assert exact["accuracy"] == {"value": 0.5, "n": 4}
    assert exact["kappa"]["value"] == pytest.approx(1 / 3)
    assert exact["macro_f1"]["value"] == pytest.approx(5 / 12)
    assert exact["linear_weighted_kappa"]["value"] == pytest.approx(7 / 11)
    assert exact["linear_weighted_kappa"]["n"] == 4
    assert exact["confusion"]["classes"] == list(LEVELS)
    assert exact["confusion"]["matrix"] == [
        [1, 0, 0, 0, 0, 0],
        [1, 0, 0, 0, 0, 0],
        [0, 1, 0, 0, 0, 0],
        [0, 0, 0, 1, 0, 0],
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
    ]
    for key in ("accuracy", "macro_f1", "kappa"):
        assert metrics["collapsed"][key] == {"value": 1.0, "n": 4}
    for key in ("precision", "recall", "f1", "kappa"):
        assert metrics["evidence"][key] == {"value": 1.0, "n": 4}


def test_unknown_review_nominal_mapping_and_weighted_exclusion():
    metrics = criterion_metrics(
        ["unknown", "needs_review", "absent", "strong"],
        ["needs_review", "unknown", "absent", "adequate"],
    )
    # Unknown and review remain different exact classes but collapse together.
    assert metrics["exact"]["accuracy"]["value"] == 0.25
    assert metrics["exact"]["kappa"]["value"] == pytest.approx(1 / 13)
    assert metrics["collapsed"]["accuracy"]["value"] == 1
    assert metrics["exact"]["linear_weighted_kappa"]["n"] == 2
    assert metrics["exact"]["linear_weighted_kappa"]["value"] == pytest.approx(2 / 3)
    assert criterion_metrics(["unknown"], ["adequate"])["exact"]["linear_weighted_kappa"] == {
        "value": None,
        "n": 0,
    }


def test_binary_false_positive_and_false_negative():
    metrics = criterion_metrics(
        ["strong", "partial", "adequate", "absent", "unknown"],
        ["adequate", "unknown", "partial", "strong", "absent"],
    )["evidence"]
    assert metrics["precision"] == {"value": 2 / 3, "n": 5}
    assert metrics["recall"]["value"] == 2 / 3
    assert metrics["f1"]["value"] == 2 / 3
    assert metrics["kappa"]["value"] == pytest.approx(1 / 6)
    assert metrics["positive_support"] == metrics["predicted_positive"] == 3


def test_nonperfect_collapsed_and_fit_metrics():
    metrics = criterion_metrics(
        ["strong", "adequate", "absent", "unknown"],
        ["partial", "unknown", "absent", "strong"],
    )["collapsed"]
    assert metrics["accuracy"] == {"value": 0.5, "n": 4}
    assert metrics["macro_f1"]["value"] == 0.5
    assert metrics["kappa"]["value"] == pytest.approx(0.2)
    fit = classification(
        ["poor", "partial", "good", "good"],
        ["poor", "good", "partial", "good"],
        ("poor", "partial", "good"),
    )
    assert fit["accuracy"]["value"] == 0.5
    assert fit["macro_f1"]["value"] == 0.5
    assert fit["kappa"]["value"] == pytest.approx(0.2)
    assert fit["confusion"]["matrix"] == [[1, 0, 0], [0, 0, 1], [0, 1, 1]]


def test_empty_and_degenerate_metrics():
    result = criterion_metrics([], [])
    assert result["exact"]["accuracy"] == {"value": None, "n": 0}
    assert result["exact"]["macro_f1"]["value"] is None
    assert kappa(np.zeros((2, 2))) is None
    assert kappa([[4, 0], [0, 0]]) is None
    assert criterion_metrics(["unknown"], ["unknown"])["evidence"]["f1"]["value"] == 0
    with pytest.raises(ValueError, match="lengths"):
        classification(["strong"], [], LEVELS)


@pytest.mark.parametrize(
    ("levels", "expected"),
    [
        (["unknown", "absent", "strong"], "poor"),
        (["needs_review", "unknown", "adequate"], "poor"),
        (["strong", "adequate", "absent"], "good"),
        (["partial", "strong", "strong"], "partial"),
        (["adequate", "unknown", "strong"], "partial"),
    ],
)
def test_rule_five(levels, expected):
    assert derive_fit(levels, ["must_have", "must_have", "nice_to_have"]) == expected
    with pytest.raises(ValueError, match="must_have"):
        derive_fit(["strong"], ["nice_to_have"])


def test_spearman_ties_and_missing():
    assert rank([1, 1, 2, 3]).tolist() == [1.5, 1.5, 3, 4]
    # Centered ranks (-1,-1,.5,1.5), (-1.5,0,0,1.5): dot=3.75, squares=4.5,4.5.
    assert spearman([1, 1, 2, 3], ["poor", "partial", "partial", "good"]) == {
        "value": pytest.approx(5 / 6),
        "n": 4,
    }
    assert spearman([None, 2, 3], ["poor", "partial", "good"])["value"] == 1
    assert spearman([1, 1], ["poor", "good"]) == {"value": None, "n": 2}
    assert spearman([None], ["poor"]) == {"value": None, "n": 0}
    # One tied axis only gives sqrt(3)/2, not Pearson on the raw numbers.
    assert spearman([1, 2, 100], ["poor", "poor", "good"])["value"] == pytest.approx(sqrt(3) / 2)


def toy_pairs():
    return [
        Pair(
            "a",
            "jd",
            ["c1", "c2"],
            ["must_have", "nice_to_have"],
            ["absent", "strong"],
            ["absent", "strong"],
            "poor",
            "poor",
            1,
            50,
        ),
        Pair(
            "b",
            "jd",
            ["c1", "c2"],
            ["must_have", "nice_to_have"],
            ["absent", "strong"],
            ["strong", "absent"],
            "poor",
            "partial",
            1,
            50,
        ),
    ]


def test_bootstrap_cluster_sampling_and_seed():
    pairs = toy_pairs()
    first = bootstrap(pairs, seed=42)
    assert first == bootstrap(pairs, seed=42)
    # Seed 2 draws [error,perfect], [perfect,perfect], [perfect,error], [perfect,perfect].
    # Draw accuracy = [.5,1,.5,1]; linear percentile endpoints are .5 and 1.
    short = bootstrap(pairs, seed=2, resamples=4)
    assert short["accuracy"]["low"] == 0.5
    assert short["accuracy"]["high"] == 1
    assert short != bootstrap(pairs, seed=3, resamples=4)
    # Only entire perfect/error clusters can be drawn: accuracy/F1/fit endpoints 0,1.
    for name in ("accuracy", "evidence_f1", "fit_accuracy"):
        assert first[name]["low"] == 0
        assert first[name]["high"] == 1
        assert first[name]["defined_resamples"] == 2000
        assert first[name]["clusters"] == 2
    assert first["kappa"]["low"] == -1
    assert first["kappa"]["high"] == 1
    assert first["accuracy"]["n"] == 4
    assert first["fit_accuracy"]["n"] == 2
    scope = summarize(pairs, resamples=10)
    assert scope["exact"]["accuracy"]["value"] == 0.5
    assert scope["exact"]["kappa"]["value"] == 0
    assert scope["fit"]["accuracy"]["value"] == 0.5
    assert scope["fit"]["confusion"]["matrix"] == [[1, 1, 0], [0, 0, 0], [0, 0, 0]]
    # Priority selection retains cluster count and includes one criterion per pair.
    assert bootstrap(pairs, "must_have", resamples=10)["accuracy"]["n"] == 2
    degenerate = bootstrap([pairs[0]], "must_have", resamples=10)
    assert degenerate["kappa"]["defined_resamples"] == 0
    assert degenerate["kappa"]["undefined_resamples"] == 10
    assert degenerate["kappa"]["low"] is None
    with pytest.raises(ValueError):
        bootstrap([], resamples=10)


@pytest.fixture
def offline_fixture(tmp_path):
    jd = {
        "id": "jd",
        "criteria": [
            {"code": "a", "priority": "must_have", "weight": 3},
            {"code": "b", "priority": "nice_to_have", "weight": 1},
        ],
    }
    (tmp_path / "jds").mkdir()
    (tmp_path / "jds" / "jd.yaml").write_text(yaml.safe_dump(jd))
    root = tmp_path / "labels-silver"
    for name in ("final", "claude", "gpt"):
        (root / name).mkdir(parents=True)
        for cv, levels, fit in [
            ("cv1", ["adequate", "absent"], "good"),
            ("cv2", ["unknown", "adequate"], "poor"),
        ]:
            label = {
                "cv_sheet_id": cv,
                "jd_id": "jd",
                "overall_fit": fit,
                "criteria": {c: {"level": level} for c, level in zip(["a", "b"], levels)},
            }
            (root / name / f"{cv}__jd.yaml").write_text(yaml.safe_dump(label))
    run = tmp_path / "run"
    (run / "pairs").mkdir(parents=True)
    for cv, levels in [("cv1", ["partial", "unknown"]), ("cv2", ["unknown", "adequate"])]:
        record = {
            "sheet_id": cv,
            "jd_id": "jd",
            "status": "succeeded",
            "result": {
                "jd_id": "jd",
                "criteria": [
                    {
                        "assessment": {"criterion_id": c, "level": "strong"},
                        "validation": {"level": level},
                    }
                    for c, level in zip(["a", "b"], levels)
                ],
                "versions": {
                    "config": {
                        "rubric_values": {"strong": 1, "adequate": 0.7, "partial": 0.4, "absent": 0}
                    }
                },
            },
        }
        (run / "pairs" / f"{cv}__jd.json").write_text(json.dumps(record))
    return root / "final", run, tmp_path / "output", {"jd": jd}


def test_offline_evaluation_and_read_only_inputs(offline_fixture):
    labels, run, output, jds = offline_fixture
    before = {p: p.read_bytes() for p in labels.parent.parent.rglob("*") if p.is_file()}
    pairs, audit = load_run(run, load_labels(labels), jds)
    assert pairs[0].predicted == ["partial", "unknown"]  # not raw strong
    assert pairs[0].coverage == 0.75
    assert pairs[0].known_only_score == pytest.approx(40)
    assert pairs[1].known_only_score == 70
    assert len(audit) == 4
    result = evaluate(labels, [run], output, resamples=20)
    all_metrics = result["runs"][0]["scopes"]["all"]
    assert all_metrics["exact"]["accuracy"] == {"value": 0.5, "n": 4}
    assert all_metrics["fit"]["accuracy"] == {"value": 0.5, "n": 2}
    assert all_metrics["fit"]["coverage_spearman"]["value"] == 1
    assert all_metrics["fit"]["known_only_score_spearman"]["value"] == -1
    assert len(result["runs"][0]["scopes"]) == 4
    assert json.loads((output / "metrics.json").read_text()) == result
    report = (output / "report.md").read_text()
    for text in ("Limitations", "n=4", "n=2", "20261122", "validation.level", "shared gateway"):
        assert text in report
    for path, content in before.items():
        assert path.read_bytes() == content
    for agreement in result["inter_annotator"].values():
        for metric in agreement.values():
            assert metric["value"] == 1
    with pytest.raises(ValueError, match="new"):
        evaluate(labels, [run], output, resamples=1)
    with pytest.raises(ValueError, match="outside"):
        evaluate(labels, [run], run / "bad", resamples=1)


def test_cli(offline_fixture, monkeypatch, capsys):
    labels, run, output, _ = offline_fixture
    monkeypatch.setattr(
        "sys.argv",
        [
            "evaluate",
            "--labels",
            str(labels),
            "--runs",
            str(run),
            "--output-dir",
            str(output),
            "--resamples",
            "10",
            "--seed",
            "5",
        ],
    )
    main()
    assert "Evaluated 1 runs" in capsys.readouterr().out
    assert json.loads((output / "metrics.json").read_text())["seed"] == 5


def test_failed_or_mismatched_run_is_rejected(offline_fixture):
    labels, run, _, jds = offline_fixture
    path = run / "pairs" / "cv1__jd.json"
    record = json.loads(path.read_text())
    record["status"] = "failed"
    path.write_text(json.dumps(record))
    with pytest.raises(ValueError, match="failed pair"):
        load_run(run, load_labels(labels), jds)
    path.unlink()
    with pytest.raises(ValueError, match="pair sets"):
        load_run(run, load_labels(labels), jds)


def test_annotator_comparison_uses_recorded_fit(offline_fixture):
    labels_dir, _, _, jds = offline_fixture
    labels = load_labels(labels_dir)
    other = json.loads(json.dumps(labels))
    other["cv1__jd"]["overall_fit"] = "poor"
    # Identical criterion labels; recorded fits good/poor vs poor/poor => kappa=0.
    metrics = annotator_comparison(labels, other, jds)
    assert metrics["accuracy"] == {"value": 1, "n": 4}
    assert metrics["fit_kappa"] == {"value": 0, "n": 2}
