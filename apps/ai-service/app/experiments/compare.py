"""Compare experiment diagnostics (not accuracy); never writes into input runs."""

import argparse
import json
import statistics
from pathlib import Path

from app.experiments.run import atomic_write, sha256, summarize


def mean(values):
    return statistics.mean(values) if values else None


def context_length(pair, directory, manifest):
    if pair.get("context_char_length") is not None:
        return pair["context_char_length"], "measured"
    # Historical full runs predate measurement. Recover only from hash-verified
    # canonical input text; never infer retrieved context or alter the input run.
    if manifest["identity"]["config"]["context_mode"] == "full":
        source_hash = pair.get("source_pdf_sha256")
        path = directory.parent.parent / "text" / f"{source_hash}.txt"
        if path.is_file():
            data = path.read_bytes()
            if sha256(data) == pair.get("text_content_sha256"):
                return len(data.decode("utf-8")), "verified_full_input"
    return None, None


def compare_runs(run_dirs, output_dir):
    run_dirs = [Path(path).resolve() for path in run_dirs]
    output_dir = Path(output_dir).resolve()
    if not run_dirs:
        raise ValueError("At least one baseline run is required")
    if any(output_dir == path or path in output_dir.parents for path in run_dirs):
        raise ValueError("Comparison output must be outside input runs")
    runs = []
    baseline = None
    baseline_context_mean = None
    for directory in run_dirs:
        pairs = [json.loads(p.read_text()) for p in sorted((directory / "pairs").glob("*.json"))]
        if not pairs:
            raise ValueError(f"No pair records in {directory}")
        summary = summarize(pairs)
        manifest = json.loads((directory / "manifest.json").read_text())
        indexed = {(p["sheet_id"], p["jd_id"]): p for p in summary["pairs"]}
        if baseline is None:
            baseline = indexed
        deltas, agreements, differences = [], [], []
        for key in sorted(baseline.keys() | indexed.keys()):
            before, after = baseline.get(key), indexed.get(key)
            comparable = bool(
                before and after and before["status"] == after["status"] == "succeeded"
            )
            delta = None
            agreement = None
            score_difference = None
            if comparable:
                if before["coverage"] is not None and after["coverage"] is not None:
                    delta = after["coverage"] - before["coverage"]
                if before["score_state"] is not None and after["score_state"] is not None:
                    agreement = before["score_state"] == after["score_state"]
                    agreements.append(agreement)
                if before["known_only_score"] is not None and after["known_only_score"] is not None:
                    score_difference = abs(after["known_only_score"] - before["known_only_score"])
                    differences.append(score_difference)
            deltas.append(
                {
                    "sheet_id": key[0],
                    "jd_id": key[1],
                    "both_succeeded": comparable,
                    "coverage_delta": delta,
                    "score_state_agrees": agreement,
                    "known_only_score_absolute_difference": score_difference,
                }
            )
        successful = [p for p in pairs if p["status"] == "succeeded"]
        reasoning = [p.get("reasoning_tokens") for p in successful]
        prompt_lengths = [
            p["prompt_char_length"] for p in successful if p.get("prompt_char_length") is not None
        ]
        contexts = [context_length(p, directory, manifest) for p in successful]
        context_lengths = [length for length, _ in contexts if length is not None]
        context_mean = mean(context_lengths)
        if not runs:
            baseline_context_mean = context_mean
        reduction = (
            1 - context_mean / baseline_context_mean
            if context_mean is not None and baseline_context_mean
            else None
        )
        runs.append(
            {
                "run": directory.name,
                "path": str(directory),
                "requested_model": manifest["identity"]["requested_model"],
                "concurrency": [i["concurrency"] for i in manifest["invocations"]],
                "pair_count": summary["pair_count"],
                "succeeded": summary["succeeded"],
                "latency_s": summary["latency_s"],
                "tokens": summary["tokens"]
                | {
                    "reasoning": sum(v for v in reasoning if v is not None)
                    if any(v is not None for v in reasoning)
                    else None,
                    "missing_reasoning_pairs": sum(v is None for v in reasoning),
                },
                "context_chars": {
                    "mean": context_mean,
                    "available_pairs": len(context_lengths),
                    "measured_pairs": sum(origin == "measured" for _, origin in contexts),
                    "reconstructed_full_pairs": sum(
                        origin == "verified_full_input" for _, origin in contexts
                    ),
                    "reduction_vs_baseline": reduction,
                    "definition": "Unicode characters in cv_context sent to the LLM; historical full input recovered only when source content hash matches",
                },
                "prompt_chars": {
                    "mean": mean(prompt_lengths),
                    "min": min(prompt_lengths, default=None),
                    "max": max(prompt_lengths, default=None),
                    "measured_pairs": len(prompt_lengths),
                    "definition": "pipeline system + user characters; excludes provider-added schema/formatting",
                },
                "quote_verification": summary["quote_verification"],
                "mean_coverage": mean(
                    [
                        p["coverage"]
                        for p in summary["pairs"]
                        if p["status"] == "succeeded" and p["coverage"] is not None
                    ]
                ),
                "versus_baseline": {
                    "pairs": deltas,
                    "score_state_agreement": {
                        "count": sum(agreements),
                        "compared": len(agreements),
                        "rate": mean(agreements),
                    },
                    "known_only_score": {
                        "both_known_pairs": len(differences),
                        "mean_absolute_difference": mean(differences),
                    },
                },
            }
        )
    result = {
        "interpretation": "Diagnostics only, not accuracy: no human labels are used. Coverage, quote verification, agreement and known-only scores do not establish correctness.",
        "baseline": run_dirs[0].name,
        "runs": runs,
    }
    atomic_write(output_dir / "comparison.json", json.dumps(result, indent=2) + "\n")
    atomic_write(output_dir / "comparison.md", markdown(result))
    return result


def display(value):
    return "null" if value is None else f"{value:.3f}" if isinstance(value, float) else str(value)


def markdown(result):
    lines = [
        "# Latency comparison (not accuracy)",
        "",
        result["interpretation"],
        "",
        "Latency population: successful pairs; includes provider retries, excludes local semaphore queue and persistence. Token totals cover successful calls only; failed attempts may be unreported. Context means use successful pairs with available context lengths; reduction is 1 - run mean / baseline mean. Missing measurements remain null.",
        "",
        "| Run | Success | p50 s | p95 s | Max s | ≤40 s | Input tokens | Output tokens | Reasoning tokens | Quote verification | Mean coverage | Mean context chars | Context reduction | State agreement | Known-only MAD |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for run in result["runs"]:
        latency, tokens, vs = run["latency_s"], run["tokens"], run["versus_baseline"]
        cells = [
            run["run"],
            f"{run['succeeded']}/{run['pair_count']}",
            latency["p50"],
            latency["p95"],
            latency["max"],
            latency["within_40_s"],
            tokens["input"],
            tokens["output"],
            tokens["reasoning"],
            run["quote_verification"]["rate"],
            run["mean_coverage"],
            run["context_chars"]["mean"],
            run["context_chars"]["reduction_vs_baseline"],
            vs["score_state_agreement"]["rate"],
            vs["known_only_score"]["mean_absolute_difference"],
        ]
        lines.append("| " + " | ".join(display(v) for v in cells) + " |")
    for run in result["runs"]:
        lines += [
            "",
            f"## {run['run']} versus baseline (not accuracy)",
            "",
            f"Context characters: {json.dumps(run['context_chars'])}",
            f"Prompt characters: {json.dumps(run['prompt_chars'])}",
            f"Score-state agreement: {json.dumps(run['versus_baseline']['score_state_agreement'])}",
            f"Known-only diagnostic: {json.dumps(run['versus_baseline']['known_only_score'])}",
            "",
            "| CV | JD | Both succeeded | Coverage delta | State agrees | Known-only absolute difference |",
            "| --- | --- | --- | --- | --- | --- |",
        ]
        for pair in run["versus_baseline"]["pairs"]:
            lines.append("| " + " | ".join(display(v) for v in pair.values()) + " |")
    return "\n".join(lines) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("run_dirs", nargs="+", type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()
    result = compare_runs(args.run_dirs, args.output_dir)
    print(f"Compared {len(result['runs'])} runs (not accuracy); outputs: {args.output_dir}")


if __name__ == "__main__":
    main()
