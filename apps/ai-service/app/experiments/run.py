"""Run canonical CV/JD pairs. --limit caps pairs, not CVs.

Retrieved mode supports lexical, dense and hybrid retrieval. Resume requires identical identity.
The eval-set text_sha256 field is a source-PDF hash used only as a text lookup key.
Latency includes text loading/hashing and screening, excluding queue and persistence time.
"""

import argparse
import asyncio
import hashlib
import json
import os
import re
import statistics
import subprocess
import tempfile
import time
from datetime import UTC, datetime
from pathlib import Path

import yaml

from app.chunking import CHUNKER_VERSION
from app.config import Settings
from app.embeddings import BgeM3Embedder
from app.infrastructure.llm import get_llm_provider
from app.pipelines.screening import (
    EscalationRule,
    ScreeningConfig,
    load_jd,
    screen,
    screen_with_escalation,
)
from app.pipelines.screening.models import ScreeningVersions


def utc_now():
    return datetime.now(UTC).isoformat()


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def redact(value, secrets):
    if isinstance(value, str):
        for secret in secrets:
            if secret:
                value = value.replace(secret, "[REDACTED]")
        return value
    if isinstance(value, dict):
        return {redact(k, secrets): redact(v, secrets) for k, v in value.items()}
    if isinstance(value, list):
        return [redact(v, secrets) for v in value]
    return value


def atomic_write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=".writing-", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        Path(temporary).unlink(missing_ok=True)


def write_json(path, value, secrets):
    atomic_write(path, json.dumps(redact(value, secrets), ensure_ascii=False, indent=2) + "\n")


def percentile(values, fraction):
    if not values:
        return None
    ordered = sorted(values)
    index = (len(ordered) - 1) * fraction
    lower = int(index)
    upper = min(lower + 1, len(ordered) - 1)
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (index - lower)


def summarize(pairs):
    successful = [p for p in pairs if p["status"] == "succeeded"]
    latencies = [p["latency_s"] for p in successful]
    quotes = [e for p in successful for c in p["result"]["criteria"] for e in c["evidence"]]
    valid = sum(e["verification"]["valid"] for e in quotes)
    groups = {}
    for pair in pairs:
        key = (pair["expected_group"], pair["jd_id"])
        groups.setdefault(key, {"score": [], "coverage": [], "known_only_score": []})
        result = pair.get("result", {})
        total = result.get("total", {})
        for name, value in (
            ("score", total.get("observed_score")),
            ("coverage", total.get("coverage")),
            ("known_only_score", _known_only_score(result)),
        ):
            if value is not None:
                groups[key][name].append(value)
    usage = [p["result"]["llm"] for p in successful]
    escalation = [p["result"]["escalation"] for p in successful if "escalation" in p["result"]]
    usage += [
        e["primary_result_summary"]["llm"]
        for e in escalation
        if e["triggered"] and e["error"] is None
    ]
    input_tokens = sum(m["input_tokens"] or 0 for m in usage)
    output_tokens = sum(m["output_tokens"] or 0 for m in usage)
    summary = {
        "interpretation": "Sanity check only, not accuracy: expected groups are not ground truth.",
        "pair_count": len(pairs),
        "succeeded": len(successful),
        "pairs": [
            {k: p[k] for k in ("sheet_id", "jd_id", "expected_group", "status", "latency_s")}
            | {
                "score": p.get("result", {}).get("total", {}).get("observed_score"),
                "coverage": p.get("result", {}).get("total", {}).get("coverage"),
                "score_state": p.get("result", {}).get("total", {}).get("score_state"),
                "known_only_score": _known_only_score(p.get("result", {})),
            }
            for p in pairs
        ],
        "latency_s": {
            "population": "successful pairs; excludes queue and persistence time",
            "percentile_method": "linear interpolation at (n - 1) * quantile",
            "p50": percentile(latencies, 0.5),
            "p95": percentile(latencies, 0.95),
            "max": max(latencies, default=None),
            "within_40_s": sum(v <= 40 for v in latencies),
        },
        "tokens": {
            "input": input_tokens,
            "output": output_tokens,
            "total": input_tokens + output_tokens,
            "missing_usage_pairs": sum(
                m["input_tokens"] is None or m["output_tokens"] is None for m in usage
            ),
            "scope": "successful calls only; failed/retried call usage may be unreported",
        },
        "quote_verification": {
            "valid": valid,
            "total": len(quotes),
            "rate": valid / len(quotes) if quotes else None,
        },
        "failures": [
            {"sheet_id": p["sheet_id"], "jd_id": p["jd_id"], **p["error"]}
            for p in pairs
            if p["status"] == "failed"
        ],
        "group_scores_not_accuracy": [
            {
                "expected_group": group,
                "jd_id": jd,
                "count": len(values["coverage"]),
                "scored_count": len(values["score"]),
                "mean": statistics.mean(values["score"]) if values["score"] else None,
                "median": statistics.median(values["score"]) if values["score"] else None,
                "coverage_mean": statistics.mean(values["coverage"])
                if values["coverage"]
                else None,
                "coverage_median": statistics.median(values["coverage"])
                if values["coverage"]
                else None,
                "known_only_score_mean": statistics.mean(values["known_only_score"])
                if values["known_only_score"]
                else None,
                "known_only_score_median": statistics.median(values["known_only_score"])
                if values["known_only_score"]
                else None,
            }
            for (group, jd), values in sorted(groups.items())
        ],
    }
    if escalation:
        summary["escalation"] = {
            "escalated_pairs": sum(e["triggered"] for e in escalation),
            "failed_pairs": sum(e["error"] is not None for e in escalation),
            "reasons": {
                reason: sum(reason in e["reasons"] for e in escalation)
                for reason in ("needs_review", "coverage_band")
            },
            "latency_s": {
                key: sum(e[key] for e in escalation)
                for key in ("primary_latency_s", "escalation_latency_s", "total_latency_s")
            },
        }
    return summary


def _known_only_score(result):
    known = [
        c["scoring"]
        for c in result.get("criteria", [])
        if c.get("scoring", {}).get("match_value") is not None
    ]
    weight = sum(c.get("weight", 0) for c in known)
    if not known or weight <= 0:
        return None
    return round(100 * sum(c["weight"] * c["match_value"] for c in known) / weight, 2)


def summarize_directory(output_dir):
    pair_files = sorted((Path(output_dir) / "pairs").glob("*.json"))
    pairs = [json.loads(path.read_text()) for path in pair_files]
    summary = summarize(pairs)
    atomic_write(
        Path(output_dir) / "summary.json", json.dumps(summary, ensure_ascii=False, indent=2) + "\n"
    )
    atomic_write(Path(output_dir) / "summary.md", markdown(summary))
    return summary


def markdown(summary):
    lines = [
        "# Screening experiment",
        "",
        summary["interpretation"],
        "Null scores mean insufficient coverage; excluded from group means/medians.",
        "Coverage is known criterion weight / total weight; the published score is available only at min_coverage 0.8. Known-only score is a diagnostic weighted score over known criteria, even below that threshold.",
        "Latency includes input verification and screening; excludes queue and persistence time.",
        "",
        f"Succeeded: {summary['succeeded']}/{summary['pair_count']}",
        f"Latency seconds: {json.dumps(summary['latency_s'])}",
        f"Tokens: {json.dumps(summary['tokens'])}",
        f"Quote verification: {json.dumps(summary['quote_verification'])}",
        "",
        "| CV | JD | Group | Status | Score | Coverage | Score state | Known-only diagnostic | Latency (s) |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for p in summary["pairs"]:
        lines.append(
            f"| {p['sheet_id']} | {p['jd_id']} | {p['expected_group']} | "
            f"{p['status']} | {p['score']} | {p['coverage']} | {p['score_state']} | "
            f"{p['known_only_score']} | {p['latency_s']:.3f} |"
        )
    lines += [
        "",
        "## Group sanity check (not accuracy)",
        "",
        "| Group | JD | Count | Published mean | Published median | Coverage mean | Coverage median | Known-only mean | Known-only median |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for g in summary["group_scores_not_accuracy"]:
        lines.append(
            f"| {g['expected_group']} | {g['jd_id']} | {g['count']} | {g['mean']} | {g['median']} | "
            f"{g['coverage_mean']} | {g['coverage_median']} | {g['known_only_score_mean']} | {g['known_only_score_median']} |"
        )
    lines += ["", "## Failures", "", json.dumps(summary["failures"], ensure_ascii=False), ""]
    if "escalation" in summary:
        lines += ["## Escalation", "", json.dumps(summary["escalation"]), ""]
    return "\n".join(lines)


def git_state(directory):
    def git(*args):
        return subprocess.check_output(
            ["git", "-C", str(directory), *args], text=True, stderr=subprocess.DEVNULL
        ).strip()

    try:
        return {"commit": git("rev-parse", "HEAD"), "dirty": bool(git("status", "--porcelain"))}
    except (OSError, subprocess.CalledProcessError):
        return {"commit": None, "dirty": None}


class MeasuredProvider:
    """Observe pipeline prompts and exposed metadata without changing the provider."""

    def __init__(self, provider):
        self.provider = provider
        self.measurements = {
            "prompt_char_length": None,
            "context_char_length": None,
            "input_tokens": None,
            "output_tokens": None,
            "reasoning_tokens": None,
        }

    async def generate_structured(self, **kwargs):
        # Counts trusted system + user text passed by the pipeline, excluding
        # provider-added schema/formatting. This definition is stable across models.
        self.measurements["prompt_char_length"] = len(kwargs["system"]) + len(kwargs["user"])
        self.measurements["context_char_length"] = len(json.loads(kwargs["user"])["cv_context"])
        response = await self.provider.generate_structured(**kwargs)
        metadata = response.metadata.model_dump()
        details = metadata.get("completion_tokens_details") or {}
        self.measurements.update(
            input_tokens=metadata.get("input_tokens"),
            output_tokens=metadata.get("output_tokens"),
            reasoning_tokens=details.get("reasoning_tokens", metadata.get("reasoning_tokens")),
        )
        return response


async def run_experiment(
    *,
    eval_set,
    jd_ids,
    output_dir,
    settings,
    provider=None,
    context_mode="full",
    retrieval_mode="lexical",
    retrieval_k=5,
    prompt_version="screening-v1",
    concurrency=4,
    limit=None,
    model=None,
    hedge_after_s=None,
    escalate_model=None,
    escalate_coverage_band=(0.7, 0.9),
    escalation_provider=None,
):
    if concurrency < 1 or (limit is not None and limit < 1):
        raise ValueError("concurrency and limit must be positive")
    escalation_rule = EscalationRule(
        coverage_low=escalate_coverage_band[0], coverage_high=escalate_coverage_band[1]
    )
    if escalation_provider is not None and escalate_model is None:
        raise ValueError("escalation_provider requires escalate_model")
    if model is not None:
        settings = settings.model_copy(update={"llm_model": model, "gemini_model": model})
    if hedge_after_s is not None:
        # Validate overrides through Settings; model_copy does not validate updates.
        settings = Settings.model_validate(
            settings.model_dump() | {"llm_hedge_after_s": hedge_after_s}
        )
    eval_set, output_dir = Path(eval_set).resolve(), Path(output_dir).resolve()
    config = ScreeningConfig(
        context_mode=context_mode,
        retrieval_mode=retrieval_mode,
        retrieval_k=retrieval_k,
        prompt_version=prompt_version,
    )
    embedder = (
        BgeM3Embedder()
        if context_mode == "retrieved" and retrieval_mode in {"dense", "hybrid"}
        else None
    )
    secrets = [k.get_secret_value() for k in (settings.llm_api_key, settings.gemini_api_key) if k]
    dataset = yaml.safe_load(eval_set.read_bytes())
    jd_ids = list(dict.fromkeys(jd_ids))
    cvs = [{**cv, "source_pdf_sha256": cv["text_sha256"]} for cv in dataset["cvs"]]
    for identifier in [*jd_ids, *(cv["sheet_id"] for cv in cvs)]:
        if not re.fullmatch(r"[A-Za-z0-9_-]+", identifier):
            raise ValueError("CV and JD identifiers must be safe filename components")
    if len({cv["sheet_id"] for cv in cvs}) != len(cvs):
        raise ValueError("Duplicate CV identifiers")
    for cv in cvs:
        if not re.fullmatch(r"[a-f0-9]{64}", cv["source_pdf_sha256"]):
            raise ValueError("Invalid source-PDF SHA-256 text lookup key")
    jds = {jd: eval_set.parent / "jds" / f"{jd}.yaml" for jd in jd_ids}
    loaded_jds = {jd: load_jd(path) for jd, path in jds.items()}
    if any(jd != value.id for jd, value in loaded_jds.items()):
        raise ValueError("JD id differs from requested file id")
    identity = {
        "eval_set_sha256": sha256(eval_set.read_bytes()),
        "jd_file_sha256": {jd: sha256(path.read_bytes()) for jd, path in jds.items()},
        "config": config.model_dump(),
        "embedding_model_id": embedder.model_id if embedder is not None else None,
        "requested_model": (
            settings.llm_model
            if settings.llm_base_url and settings.llm_api_key is not None
            else settings.gemini_model
        ),
        "hedge_after_s": settings.llm_hedge_after_s,
        "versions": {
            "pipeline": ScreeningVersions.model_fields["pipeline"].default,
            "prompt": config.prompt_version,
            "chunker": CHUNKER_VERSION,
            "chunker_used": context_mode == "retrieved",
        },
    }
    # Omit default escalation settings to preserve historical manifests and resume.
    if escalate_model is not None or tuple(escalate_coverage_band) != (0.7, 0.9):
        identity["escalation"] = {
            "model": escalate_model,
            "coverage_band": [escalation_rule.coverage_low, escalation_rule.coverage_high],
        }
    manifest_path = output_dir / "manifest.json"
    if manifest_path.exists():
        manifest = json.loads(manifest_path.read_text())
        # Historical manifests predate hedging and implicitly used no hedge.
        manifest["identity"].setdefault("hedge_after_s", None)
        if manifest["identity"] != redact(identity, secrets):
            raise ValueError("Resume inputs/config/model differ; use a new output directory")
    else:
        manifest = {
            "run_id": output_dir.name,
            "started_at": utc_now(),
            "ended_at": None,
            "git": git_state(eval_set.parent),
            "identity": identity,
            "invocations": [],
        }
    manifest["invocations"].append(
        {
            "started_at": utc_now(),
            "ended_at": None,
            "concurrency": concurrency,
            "limit": limit,
            "git": git_state(eval_set.parent),
            "provider_config": {
                "timeout_s": settings.llm_timeout_s,
                "max_retries": settings.llm_max_retries,
                "hedge_after_s": settings.llm_hedge_after_s,
                "temperature": 0.0,
            },
        }
    )
    manifest["ended_at"] = None
    write_json(manifest_path, manifest, secrets)
    provider = provider if provider is not None else get_llm_provider(settings)
    if escalate_model is not None and escalation_provider is None:
        escalation_settings = settings.model_copy(
            update={"llm_model": escalate_model, "gemini_model": escalate_model}
        )
        escalation_provider = get_llm_provider(escalation_settings)
    semaphore = asyncio.Semaphore(concurrency)
    selected = [(cv, jd) for cv in cvs for jd in jd_ids]
    selected = selected[:limit] if limit else selected

    async def process(cv, jd):
        async with semaphore:
            started = time.perf_counter()
            path = output_dir / "pairs" / f"{cv['sheet_id']}__{jd}.json"
            pair = {
                "sheet_id": cv["sheet_id"],
                "jd_id": jd,
                "expected_group": cv["expected_group"],
                "source_pdf_sha256": cv["source_pdf_sha256"],
                "text_content_sha256": None,
            }
            measured = MeasuredProvider(provider)
            try:
                data = (eval_set.parent / "text" / f"{cv['source_pdf_sha256']}.txt").read_bytes()
                pair["text_content_sha256"] = sha256(data)
                if path.exists():
                    previous = json.loads(path.read_text())
                    if (
                        previous["status"] == "succeeded"
                        and previous["text_content_sha256"] == pair["text_content_sha256"]
                    ):
                        return previous
                screening = screen
                extra = {}
                if escalate_model is not None:
                    screening = screen_with_escalation
                    escalation_measured = MeasuredProvider(escalation_provider)
                    extra = {
                        "escalation_provider": escalation_measured,
                        "escalation_model": escalate_model,
                        "rule": escalation_rule,
                    }
                result = await screening(
                    data.decode("utf-8"),
                    loaded_jds[jd],
                    provider=measured,
                    config=config,
                    embedder=embedder,
                    **extra,
                )
                if escalate_model is not None and result.escalation.triggered:
                    for key in ("input_tokens", "output_tokens", "reasoning_tokens"):
                        primary_value = measured.measurements[key]
                        escalation_value = escalation_measured.measurements[key]
                        # Preserve fallback usage and signal missing successful-call usage.
                        if result.escalation.error is None:
                            measured.measurements[key] = (
                                primary_value + escalation_value
                                if primary_value is not None and escalation_value is not None
                                else None
                            )
                pair.update(status="succeeded", result=result.model_dump(mode="json"))
            except Exception as exc:  # noqa: BLE001 — isolate pair failures and redact CLI errors
                pair.update(
                    status="failed", error={"class": type(exc).__name__, "message": str(exc)}
                )
            pair.update(measured.measurements)
            pair["latency_s"] = time.perf_counter() - started
            pair["finished_at"] = utc_now()
            write_json(path, pair, secrets)
            return redact(pair, secrets)

    pairs = await asyncio.gather(*(process(cv, jd) for cv, jd in selected))
    manifest["text_content_sha256"] = {p["sheet_id"]: p["text_content_sha256"] for p in pairs}
    summary = summarize(pairs)
    write_json(output_dir / "summary.json", summary, secrets)
    atomic_write(output_dir / "summary.md", redact(markdown(summary), secrets))
    manifest["gateway_reported_models"] = sorted(
        {
            p["result"]["llm"]["response_model"]
            for p in pairs
            if p["status"] == "succeeded" and p["result"]["llm"].get("response_model")
        }
    )
    manifest["ended_at"] = utc_now()
    manifest["invocations"][-1]["ended_at"] = manifest["ended_at"]
    write_json(manifest_path, manifest, secrets)
    return summary


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--eval-set", type=Path)
    parser.add_argument("--jd-ids", nargs="+", default=["jd-a", "jd-b"])
    parser.add_argument("--context-mode", choices=["full", "retrieved"], default="full")
    parser.add_argument(
        "--retrieval-mode", choices=["lexical", "dense", "hybrid"], default="lexical"
    )
    parser.add_argument("--retrieval-k", type=int, default=5)
    parser.add_argument(
        "--prompt-version", choices=["screening-v1", "screening-v2"], default="screening-v1"
    )
    parser.add_argument("--concurrency", type=int, default=4)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--model", help="Override the requested model for this run only")
    parser.add_argument("--hedge-after-s", type=float, help="Override LLM hedging delay in seconds")
    parser.add_argument("--escalate-model", help="Re-screen hard cases with this model")
    parser.add_argument(
        "--escalate-coverage-band",
        nargs=2,
        type=float,
        default=(0.7, 0.9),
        metavar=("LOW", "HIGH"),
        help="Escalate when LOW <= coverage < HIGH",
    )
    parser.add_argument("--limit", type=int)
    parser.add_argument("--summarize-only", action="store_true")
    args = parser.parse_args()
    if args.summarize_only:
        summary = summarize_directory(args.output_dir)
        print(f"Summarized {summary['pair_count']} pairs; outputs: {args.output_dir}")
        return 0
    if args.eval_set is None:
        parser.error("--eval-set is required unless --summarize-only is used")
    settings = Settings()
    secrets = [k.get_secret_value() for k in (settings.llm_api_key, settings.gemini_api_key) if k]
    try:
        run_args = vars(args).copy()
        run_args.pop("summarize_only")
        summary = asyncio.run(run_experiment(**run_args, settings=settings))
    except Exception as exc:  # noqa: BLE001 — isolate pair failures and redact CLI errors
        parser.exit(2, redact(f"{type(exc).__name__}: {exc}\n", secrets))
    print(f"Succeeded {summary['succeeded']}/{summary['pair_count']}; outputs: {args.output_dir}")
    return 1 if summary["failures"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
