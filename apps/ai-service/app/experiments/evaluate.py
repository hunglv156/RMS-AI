"""Offline screening accuracy against silver labels; no LLM calls."""

import argparse
import json
from collections import Counter
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

import numpy as np
import yaml

LEVELS = ("strong", "adequate", "partial", "absent", "unknown", "needs_review")
ORDINAL = ("absent", "partial", "adequate", "strong")
COLLAPSED = ("evidence", "absent", "unknown")
FITS = ("poor", "partial", "good")
EVIDENCE = frozenset(("strong", "adequate", "partial"))
SEED = 20261122
RESAMPLES = 2000
LIMITATIONS = [
    "Silver (LLM) labels are not human ground truth.",
    "The adjudicator was Claude, the same model family as one annotator; agreement is not independent validation.",
    "GUIDELINES v1.1 codifies that annotator's absent/poor conventions, potentially favoring its decisions.",
    "Small n: 10 CVs × 2 JDs (20 pairs, 140 criteria); criteria within a pair are dependent, and the same CV occurs under both JDs.",
    "expected_group is sampling metadata, not ground truth; it is never used in evaluation.",
    "Latency was measured on a shared gateway and is not an accuracy measure or a controlled speed comparison.",
    "Bootstrap resamples CV×JD pairs, as specified, not CVs; cross-JD dependence for the same CV is not preserved. Intervals are descriptive percentile intervals, not a test of run differences.",
    "Illustrative JD weights and configured rubric values are not calibrated. Fit is a deterministic rule-5 proxy, not a hiring recommendation.",
]


@dataclass
class Pair:
    key: str
    jd: str
    codes: list[str]
    priorities: list[str]
    truth: list[str]
    predicted: list[str]
    fit_truth: str
    fit_predicted: str
    coverage: float | None = None
    known_only_score: float | None = None


def measure(value, n):
    return {"value": value, "n": n}


def confusion(truth, predicted, classes):
    if len(truth) != len(predicted):
        raise ValueError("Truth and prediction lengths differ")
    index = {name: i for i, name in enumerate(classes)}
    matrix = np.zeros((len(classes), len(classes)), dtype=int)
    for actual, system in zip(truth, predicted, strict=True):
        matrix[index[actual], index[system]] += 1
    return matrix


def kappa(matrix, *, linear=False):
    """Cohen's agreement, or linear distance agreement on a fixed ordinal scale."""
    matrix = np.asarray(matrix, dtype=float)
    n = matrix.sum()
    if not n:
        return None
    expected = np.outer(matrix.sum(axis=1), matrix.sum(axis=0)) / n
    distance = (
        np.abs(np.arange(len(matrix))[:, None] - np.arange(len(matrix))[None, :])
        if linear
        else 1 - np.eye(len(matrix))
    )
    denominator = (expected * distance).sum()
    return float(1 - (matrix * distance).sum() / denominator) if denominator else None


def classification(truth, predicted, classes):
    matrix = confusion(truth, predicted, classes)
    n = len(truth)
    denominators = matrix.sum(axis=0) + matrix.sum(axis=1)
    present = denominators > 0
    f1 = 2 * matrix.diagonal()[present] / denominators[present]
    return {
        "accuracy": measure(float(matrix.trace() / n) if n else None, n),
        "macro_f1": measure(float(f1.mean()) if len(f1) else None, n),
        "kappa": measure(kappa(matrix), n),
        "macro_f1_levels": [c for c, p in zip(classes, present, strict=True) if p],
        "confusion": {
            "classes": list(classes),
            "rows": "labels",
            "columns": "system",
            "n": n,
            "matrix": matrix.tolist(),
        },
    }


def collapse(level):
    return "evidence" if level in EVIDENCE else "absent" if level == "absent" else "unknown"


def criterion_metrics(truth, predicted):
    exact = classification(truth, predicted, LEVELS)
    ordinal = [
        (a, b) for a, b in zip(truth, predicted, strict=True) if a in ORDINAL and b in ORDINAL
    ]
    matrix = confusion([a for a, _ in ordinal], [b for _, b in ordinal], ORDINAL)
    exact["linear_weighted_kappa"] = measure(kappa(matrix, linear=True), len(ordinal))
    collapsed = classification(
        [collapse(a) for a in truth], [collapse(b) for b in predicted], COLLAPSED
    )
    binary = classification(
        ["evidence" if a in EVIDENCE else "not" for a in truth],
        ["evidence" if b in EVIDENCE else "not" for b in predicted],
        ("evidence", "not"),
    )
    tp, fn = binary["confusion"]["matrix"][0]
    fp = binary["confusion"]["matrix"][1][0]
    n = len(truth)
    binary.update(
        {
            "precision": measure(tp / (tp + fp) if tp + fp else 0.0, n),
            "recall": measure(tp / (tp + fn) if tp + fn else 0.0, n),
            "f1": measure(2 * tp / (2 * tp + fp + fn) if 2 * tp + fp + fn else 0.0, n),
            "positive_support": tp + fn,
            "predicted_positive": tp + fp,
        }
    )
    return {"exact": exact, "collapsed": collapsed, "evidence": binary}


def derive_fit(levels, priorities):
    must = [
        level for level, priority in zip(levels, priorities, strict=True) if priority == "must_have"
    ]
    if not must:
        raise ValueError("Rule 5 requires at least one must_have criterion")
    if not any(level in EVIDENCE for level in must):
        return "poor"
    return "good" if all(level in {"adequate", "strong"} for level in must) else "partial"


def rank(values):
    """Average ranks (1-based), including ties."""
    values = np.asarray(values)
    return np.array([1 + np.sum(values < v) + (np.sum(values == v) - 1) / 2 for v in values])


def spearman(values, fits):
    valid = [(v, FITS.index(f)) for v, f in zip(values, fits, strict=True) if v is not None]
    n = len(valid)
    if n < 2:
        return measure(None, n)
    a, b = rank([v for v, _ in valid]), rank([f for _, f in valid])
    a, b = a - a.mean(), b - b.mean()
    denominator = float(np.sqrt((a @ a) * (b @ b)))
    return measure(float(a @ b / denominator) if denominator else None, n)


def flatten(pairs, priority=None):
    truth, predicted = [], []
    for pair in pairs:
        for a, b, p in zip(pair.truth, pair.predicted, pair.priorities, strict=True):
            if priority is None or priority == p:
                truth.append(a)
                predicted.append(b)
    return truth, predicted


def bootstrap(pairs, priority=None, *, seed=SEED, resamples=RESAMPLES):
    """Pair-cluster percentile bootstrap; a draw retains every criterion of a pair."""
    if resamples < 1 or not pairs:
        raise ValueError("Bootstrap requires pairs and positive resamples")
    rng = np.random.default_rng(seed)
    names = ("accuracy", "kappa", "collapsed_kappa", "evidence_f1", "fit_accuracy")
    values = {name: [] for name in names}
    matrices = np.array([confusion(*flatten([pair], priority), LEVELS) for pair in pairs])
    fits = np.array([pair.fit_truth == pair.fit_predicted for pair in pairs])
    evidence_indices = [i for i, level in enumerate(LEVELS) if level in EVIDENCE]
    group = [COLLAPSED.index(collapse(level)) for level in LEVELS]
    for indices in rng.integers(0, len(pairs), size=(resamples, len(pairs))):
        matrix = matrices[indices].sum(axis=0)
        n = matrix.sum()
        values["accuracy"].append(float(matrix.trace() / n) if n else None)
        values["kappa"].append(kappa(matrix))
        collapsed = np.zeros((3, 3), dtype=int)
        for i in range(6):
            for j in range(6):
                collapsed[group[i], group[j]] += matrix[i, j]
        values["collapsed_kappa"].append(kappa(collapsed))
        tp = matrix[np.ix_(evidence_indices, evidence_indices)].sum()
        denominator = matrix[evidence_indices, :].sum() + matrix[:, evidence_indices].sum()
        values["evidence_f1"].append(float(2 * tp / denominator) if denominator else 0.0)
        values["fit_accuracy"].append(float(fits[indices].mean()))
    result = {}
    for name, samples in values.items():
        defined = [v for v in samples if v is not None]
        result[name] = {
            "low": float(np.percentile(defined, 2.5)) if defined else None,
            "high": float(np.percentile(defined, 97.5)) if defined else None,
            "n": len(pairs) if name == "fit_accuracy" else len(flatten(pairs, priority)[0]),
            "clusters": len(pairs),
            "defined_resamples": len(defined),
            "undefined_resamples": resamples - len(defined),
        }
    return result


def summarize(pairs, priority=None, *, seed=SEED, resamples=RESAMPLES):
    result = criterion_metrics(*flatten(pairs, priority))
    actual, predicted = [p.fit_truth for p in pairs], [p.fit_predicted for p in pairs]
    result["fit"] = classification(actual, predicted, FITS)
    result["fit"]["coverage_spearman"] = spearman([p.coverage for p in pairs], actual)
    result["fit"]["known_only_score_spearman"] = spearman(
        [p.known_only_score for p in pairs], actual
    )
    result["bootstrap_95_ci"] = bootstrap(pairs, priority, seed=seed, resamples=resamples)
    result["pair_count"] = len(pairs)
    return result


def load_labels(directory):
    result = {}
    for path in sorted(directory.glob("*.yaml")):
        label = yaml.safe_load(path.read_text())
        key = f"{label['cv_sheet_id']}__{label['jd_id']}"
        if key != path.stem or key in result:
            raise ValueError(f"Duplicate or misnamed pair: {path}")
        if label["overall_fit"] not in FITS:
            raise ValueError(f"Invalid fit: {path}")
        if any(c["level"] not in LEVELS for c in label["criteria"].values()):
            raise ValueError(f"Invalid level: {path}")
        result[key] = label
    if not result:
        raise ValueError(f"No YAML labels in {directory}")
    return result


def load_jds(labels_dir, labels):
    jd_dir = next((p / "jds" for p in labels_dir.parents if (p / "jds").is_dir()), None)
    if jd_dir is None:
        raise ValueError("Cannot locate jds/ under a parent of labels directory")
    return {
        jd: yaml.safe_load((jd_dir / f"{jd}.yaml").read_text())
        for jd in sorted({label["jd_id"] for label in labels.values()})
    }


def load_run(directory, labels, jds):
    files = {p.stem: p for p in (directory / "pairs").glob("*.json")}
    if files.keys() != labels.keys():
        raise ValueError(f"Run/label pair sets differ: {directory}")
    pairs, audit = [], []
    for key, label in labels.items():
        record = json.loads(files[key].read_text())
        if record["status"] != "succeeded":
            raise ValueError(f"Cannot silently exclude failed pair: {key}")
        if (record["sheet_id"], record["jd_id"]) != (label["cv_sheet_id"], label["jd_id"]):
            raise ValueError(f"Pair identity mismatch: {key}")
        result = record["result"]
        if result["jd_id"] != label["jd_id"]:
            raise ValueError(f"Result JD mismatch: {key}")
        jd = jds[label["jd_id"]]
        codes = [c["code"] for c in jd["criteria"]]
        priorities = [c["priority"] for c in jd["criteria"]]
        criteria = {c["assessment"]["criterion_id"]: c for c in result["criteria"]}
        if (
            len(criteria) != len(result["criteria"])
            or set(criteria) != set(codes)
            or set(label["criteria"]) != set(codes)
        ):
            raise ValueError(f"Criterion sets differ: {key}")
        levels = [criteria[c]["validation"]["level"] for c in codes]
        if any(level not in LEVELS for level in levels):
            raise ValueError(f"Invalid validated level: {key}")
        for code, level in zip(codes, levels, strict=True):
            raw = criteria[code]["assessment"]["level"]
            if raw != level:
                audit.append({"pair": key, "criterion": code, "raw": raw, "validated": level})
        weights = [c["weight"] for c in jd["criteria"]]
        rubric = result["versions"]["config"]["rubric_values"]
        known_weight = sum(w for w, level in zip(weights, levels, strict=True) if level in ORDINAL)
        total_weight = sum(weights)
        if total_weight <= 0 or any(w < 0 for w in weights):
            raise ValueError(f"Invalid JD weights: {key}")
        score = (
            100
            * sum(
                w * rubric[level]
                for w, level in zip(weights, levels, strict=True)
                if level in ORDINAL
            )
            / known_weight
            if known_weight
            else None
        )
        pairs.append(
            Pair(
                key,
                label["jd_id"],
                codes,
                priorities,
                [label["criteria"][c]["level"] for c in codes],
                levels,
                label["overall_fit"],
                derive_fit(levels, priorities),
                known_weight / total_weight,
                score,
            )
        )
    return pairs, audit


def annotator_comparison(reference, candidate, jds):
    if reference.keys() != candidate.keys():
        raise ValueError("Annotator pair sets differ")
    truth, predicted, actual_fits, predicted_fits = [], [], [], []
    for key, label in reference.items():
        other = candidate[key]
        codes = [c["code"] for c in jds[label["jd_id"]]["criteria"]]
        if set(codes) != set(label["criteria"]) or set(codes) != set(other["criteria"]):
            raise ValueError(f"Annotator criterion sets differ: {key}")
        truth.extend(label["criteria"][c]["level"] for c in codes)
        predicted.extend(other["criteria"][c]["level"] for c in codes)
        actual_fits.append(label["overall_fit"])
        predicted_fits.append(other["overall_fit"])
    metrics = criterion_metrics(truth, predicted)
    return {
        "accuracy": metrics["exact"]["accuracy"],
        "kappa": metrics["exact"]["kappa"],
        "collapsed_kappa": metrics["collapsed"]["kappa"],
        "evidence_kappa": metrics["evidence"]["kappa"],
        "fit_kappa": classification(actual_fits, predicted_fits, FITS)["kappa"],
    }


def error_analysis(pairs):
    transitions, criteria = Counter(), {}
    for pair in pairs:
        for code, a, b in zip(pair.codes, pair.truth, pair.predicted, strict=True):
            counts = criteria.setdefault(f"{pair.jd}/{code}", {"errors": 0, "n": 0})
            counts["n"] += 1
            counts["errors"] += a != b
            if a != b:
                transitions[f"{a} → {b}"] += 1
    return {
        "transitions": dict(transitions.most_common()),
        "by_criterion": dict(sorted(criteria.items(), key=lambda item: -item[1]["errors"])),
        "fit_errors": [
            {"pair": p.key, "label": p.fit_truth, "system": p.fit_predicted}
            for p in pairs
            if p.fit_truth != p.fit_predicted
        ],
        "pairs": [
            {
                "pair": p.key,
                "label_fit": p.fit_truth,
                "system_fit": p.fit_predicted,
                "coverage": p.coverage,
                "known_only_score": p.known_only_score,
            }
            for p in pairs
        ],
    }


def fmt(value):
    return "undefined" if value is None else f"{value:.4f}"


def metric_cell(metric, ci=None):
    text = f"{fmt(metric['value'])} (n={metric['n']})"
    if ci is not None:
        text += f" [{fmt(ci['low'])}, {fmt(ci['high'])}]"
    return text


def table(headers, rows):
    return [
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join(["---"] * len(headers)) + " |",
        *["| " + " | ".join(map(str, row)) + " |" for row in rows],
    ]


def matrix_table(matrix):
    return table(
        ["Label / system", *matrix["classes"]],
        [[name, *row] for name, row in zip(matrix["classes"], matrix["matrix"], strict=True)],
    )


def markdown(result):
    lines = [
        "# Screening accuracy against silver labels",
        "",
        *result["method"],
        "",
        "## Headline results",
        "",
        "Cells show estimate (n), then the 95% pair-bootstrap interval where available.",
        "",
    ]
    rows = []
    for run in result["runs"]:
        scope = run["scopes"]["all"]
        ci = scope["bootstrap_95_ci"]
        rows.append(
            [
                run["run"],
                metric_cell(scope["exact"]["accuracy"], ci["accuracy"]),
                metric_cell(scope["exact"]["kappa"], ci["kappa"]),
                metric_cell(scope["collapsed"]["kappa"], ci["collapsed_kappa"]),
                metric_cell(scope["evidence"]["f1"], ci["evidence_f1"]),
                metric_cell(scope["fit"]["accuracy"], ci["fit_accuracy"]),
            ]
        )
    lines += table(
        ["Run", "Exact accuracy", "Exact κ", "Collapsed κ", "Evidence F1", "Fit accuracy"], rows
    )
    ci_keys = {
        ("exact", "accuracy"): "accuracy",
        ("exact", "kappa"): "kappa",
        ("collapsed", "kappa"): "collapsed_kappa",
        ("evidence", "f1"): "evidence_f1",
        ("fit", "accuracy"): "fit_accuracy",
    }
    for run in result["runs"]:
        lines += ["", f"## {run['run']}", ""]
        for name, scope in run["scopes"].items():
            ci = scope["bootstrap_95_ci"]
            lines += [f"### {name} ({scope['pair_count']} CV×JD pairs)", ""]
            rows = []
            for family in ("exact", "collapsed", "evidence", "fit"):
                for metric, value in scope[family].items():
                    if not isinstance(value, dict) or "value" not in value:
                        continue
                    interval = ci.get(ci_keys.get((family, metric)))
                    rows.append(
                        [
                            family,
                            metric,
                            metric_cell(value, interval),
                            f"{interval['defined_resamples']}/{result['resamples']}"
                            if interval
                            else "—",
                        ]
                    )
            lines += table(
                ["Family", "Metric", "Value (n) [95% CI]", "Defined bootstrap draws"], rows
            )
            for family in ("exact", "fit"):
                matrix = scope[family]["confusion"]
                lines += [
                    "",
                    f"{family} confusion (n={matrix['n']}; labels rows × system columns):",
                    "",
                    *matrix_table(matrix),
                    "",
                ]
        errors = run["errors"]
        all_scope = run["scopes"]["all"]
        exact_matrix = all_scope["exact"]["confusion"]["matrix"]
        absent_total = sum(exact_matrix[LEVELS.index("absent")])
        absent_unknown = errors["transitions"].get("absent → unknown", 0)
        adequate_partial = errors["transitions"].get("adequate → partial", 0)
        score_n = all_scope["fit"]["known_only_score_spearman"]["n"]
        lines += [
            "### Error patterns",
            "",
            (
                f"Of {absent_total} labelled absent criteria, {absent_unknown} became unknown. "
                f"Adequate → partial accounts for {adequate_partial} errors. "
                "The absent/unknown distinction reflects a material v1.1 convention difference; "
                "evidence detection ignores that distinction, so its F1 can be high despite exact-level errors."
            ),
            "",
            (
                f"Known-only score correlation has n={score_n}; "
                f"{all_scope['pair_count'] - score_n} pairs have zero known weight and no score. "
                "Coverage correlation retains all pairs. Fit errors below identify which classes "
                "drive the headline accuracy; the full 3×3 matrix should be read alongside it."
            ),
            "",
            *table(["Label → system", "Count"], errors["transitions"].items()),
            "",
            *table(
                ["JD / criterion", "Errors", "n"],
                [
                    [c, counts["errors"], counts["n"]]
                    for c, counts in errors["by_criterion"].items()
                ],
            ),
            "",
            *table(
                ["Pair", "Label fit", "System fit"],
                [[p["pair"], p["label"], p["system"]] for p in errors["fit_errors"]],
            ),
            "",
            f"Quote-validation level changes: {len(run['validation_changes'])} criterion assessments.",
            "",
        ]
    lines += [
        "## Inter-annotator agreement",
        "",
        "Raw overall_fit is used as recorded, not recomputed under v1.1; changes reflect both annotation and guideline differences.",
        "",
        *table(
            ["Comparison", "Accuracy", "κ", "Collapsed κ", "Evidence κ", "Fit κ"],
            [
                [
                    name,
                    *[
                        metric_cell(m[k])
                        for k in (
                            "accuracy",
                            "kappa",
                            "collapsed_kappa",
                            "evidence_kappa",
                            "fit_kappa",
                        )
                    ],
                ]
                for name, m in result["inter_annotator"].items()
            ],
        ),
        "",
        "## Limitations",
        "",
        *[f"- {line}" for line in LIMITATIONS],
    ]
    return "\n".join(lines) + "\n"


def evaluate(labels_dir, run_dirs, output_dir, *, seed=SEED, resamples=RESAMPLES):
    labels_dir, output_dir = Path(labels_dir).resolve(), Path(output_dir).resolve()
    run_dirs = [Path(p).resolve() for p in run_dirs]
    raw_dirs = [labels_dir.parent / name for name in ("claude", "gpt")]
    if not run_dirs or any(
        output_dir == p or p in output_dir.parents for p in [labels_dir, *run_dirs, *raw_dirs]
    ):
        raise ValueError("Output must be outside inputs, and at least one run is required")
    if output_dir.exists():
        raise ValueError("Output directory must be new")
    labels = load_labels(labels_dir)
    jds = load_jds(labels_dir, labels)
    for label in labels.values():
        jd = jds[label["jd_id"]]
        codes = [c["code"] for c in jd["criteria"]]
        if set(codes) != set(label["criteria"]):
            raise ValueError("Final label/JD criterion sets differ")
        if label["overall_fit"] != derive_fit(
            [label["criteria"][c]["level"] for c in codes], [c["priority"] for c in jd["criteria"]]
        ):
            raise ValueError("Final labelled fit differs from rule 5")
    result = {
        "created_at": datetime.now(UTC).isoformat(),
        "labels": str(labels_dir),
        "seed": seed,
        "resamples": resamples,
        "numpy_version": np.__version__,
        "method": [
            "System level: result.criteria[].validation.level, the post-quote-verification level in ScreenedCriterion/AssessmentValidation (app/pipelines/screening/models.py and app/assessment/evidence.py). assessment.level and validation.raw_level are pre-validation and are not evaluated.",
            "Six exact classes: strong, adequate, partial, absent, unknown, needs_review. Unweighted κ keeps unknown and needs_review as distinct nominal classes. Macro-F1 averages the union of classes present in labels or predictions. Undefined κ (zero expected disagreement) and constant-rank Spearman are null; no-positive binary precision/recall/F1 are 0.",
            "Linear-weighted κ uses the fixed absent < partial < adequate < strong scale; pairs with either unknown or needs_review are excluded, with retained criterion n reported. Three-class mapping: strong/adequate/partial → evidence, absent → absent, unknown/needs_review → unknown. Binary positive = evidence; all other levels are negative.",
            "System overall_fit: GUIDELINES v1.1 rule 5 applied to validated must_have levels (none with evidence → poor; all adequate/strong → good; otherwise partial). Labelled fit is used as recorded and checked against rule 5 for final labels.",
            "Coverage = sum(JD weights with a validated ordinal level)/sum(all JD weights). Known-only score = 100 × sum(weight × configured rubric[level])/known weight, independent of the min_coverage threshold; null if no known weight. Spearman uses average ranks for ties and pairwise exclusion of null scores, with n reported.",
            f"95% percentile bootstrap: {resamples} resamples of CV×JD pairs retaining all their criteria, NumPy default_rng seed={seed}, restarted per scope/run for comparable draws; undefined κ draws are omitted and their counts reported. JD scopes resample within JD; priority scopes resample full pairs then select criteria. Fit/correlations in priority scopes still use whole-pair fit and scores, so are identical to all-pair metrics.",
            "Every run must have exactly the labelled pair set and successful records with exactly the JD criterion set; failures are rejected rather than silently dropped. Criteria have equal weight in classification metrics; JD weights affect coverage and known-only score only. No LLM calls.",
        ],
        "runs": [],
        "limitations": LIMITATIONS,
    }
    for directory in run_dirs:
        pairs, audit = load_run(directory, labels, jds)
        scopes = {"all": summarize(pairs, seed=seed, resamples=resamples)}
        for jd in sorted(jds):
            scopes[f"jd/{jd}"] = summarize(
                [p for p in pairs if p.jd == jd], seed=seed, resamples=resamples
            )
        for priority in ("must_have", "nice_to_have"):
            scopes[f"priority/{priority}"] = summarize(
                pairs, priority, seed=seed, resamples=resamples
            )
        result["runs"].append(
            {
                "run": directory.name,
                "path": str(directory),
                "scopes": scopes,
                "validation_changes": audit,
                "errors": error_analysis(pairs),
            }
        )
    claude, gpt = [load_labels(p) for p in raw_dirs]
    result["inter_annotator"] = {
        "claude vs gpt": annotator_comparison(claude, gpt, jds),
        "claude vs final": annotator_comparison(labels, claude, jds),
        "gpt vs final": annotator_comparison(labels, gpt, jds),
    }
    report = markdown(result)
    output_dir.mkdir(parents=True)
    (output_dir / "metrics.json").write_text(json.dumps(result, indent=2, allow_nan=False) + "\n")
    (output_dir / "report.md").write_text(report)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--labels", required=True, type=Path)
    parser.add_argument("--runs", required=True, nargs="+", type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--seed", type=int, default=SEED)
    parser.add_argument("--resamples", type=int, default=RESAMPLES)
    args = parser.parse_args()
    evaluate(args.labels, args.runs, args.output_dir, seed=args.seed, resamples=args.resamples)
    print(f"Evaluated {len(args.runs)} runs; outputs: {args.output_dir}")


if __name__ == "__main__":
    main()
