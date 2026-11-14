"""Chấm gộp mọi tiêu chí của một CV (ADR 0008) rồi xác minh bằng chứng (README 10.4)."""

import json
from collections.abc import Sequence
from dataclasses import dataclass, field
from typing import Any

from pydantic import BaseModel, ValidationError

from app.assessment.prompts import ASSESS_PROMPT_VERSION, build_task
from app.assessment.quotes import has_ellipsis, locate_quote
from app.assessment.schemas import build_batch_model
from app.config import MAX_CV_CHARS
from app.infrastructure.llm import LLMProvider, LLMResult
from app.prompts.shared import SHARED_SYSTEM, build_user

MAX_CRITERIA_PER_CALL = 8
ASSESS_MAX_TOKENS = 1800
NO_JUDGMENT = {"unknown", "needs_review"}


@dataclass(frozen=True)
class CriterionSpec:
    code: str
    label: str
    description: str = ""


@dataclass
class Evidence:
    quote: str
    start_offset: int
    end_offset: int


@dataclass
class CriterionAssessment:
    code: str
    level: str
    rationale: str
    evidence: list[Evidence]
    raw: dict[str, Any]
    notes: list[str] = field(default_factory=list)


@dataclass
class EvaluationOutcome:
    status: str  # "ok" | "failed_validation"
    assessments: list[CriterionAssessment]
    raw_calls: list[dict[str, Any]]
    truncated: bool
    error: str | None = None


class BatchInvalid(Exception):
    pass


def validate_item(cv_text: str, raw: dict[str, Any]) -> CriterionAssessment:
    """Xác minh bằng chứng của một tiêu chí. Mọi kết luận phải có evidence tìm được trong CV."""
    notes: list[str] = []
    evidence: list[Evidence] = []
    for quote in raw["evidence"]:
        found = locate_quote(cv_text, quote)
        if found is None:
            notes.append("evidence_ellipsis" if has_ellipsis(quote) else "evidence_not_found")
            continue
        if any(e.start_offset == found.start and e.end_offset == found.end for e in evidence):
            continue
        evidence.append(Evidence(found.text, found.start, found.end))

    level: str = raw["level"]
    if level not in NO_JUDGMENT and not evidence:
        notes.append(f"downgraded_{level}_no_valid_evidence")
        level = "needs_review"
    return CriterionAssessment(raw["criterion"], level, raw["rationale"], evidence, raw, notes)


def _parse_batch(
    model: type[BaseModel], codes: Sequence[str], result: LLMResult
) -> list[dict[str, Any]]:
    if result.done_reason == "length":
        raise BatchInvalid("output truncated")
    try:
        parsed = model.model_validate_json(result.content).model_dump()
    except ValidationError as exc:
        raise BatchInvalid(f"schema: {str(exc)[:200]}") from exc
    items: list[dict[str, Any]] = parsed["results"]
    returned = [i["criterion"] for i in items]
    if sorted(returned) != sorted(codes):
        raise BatchInvalid(f"criteria mismatch: expected {sorted(codes)}, got {sorted(returned)}")
    return items


async def _assess_chunk(
    provider: LLMProvider,
    cv_text: str,
    chunk: Sequence[CriterionSpec],
    raw_calls: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    codes = [c.code for c in chunk]
    model = build_batch_model(codes)
    user = build_user(cv_text, build_task([(c.code, c.label, c.description) for c in chunk]))
    last_error = ""
    for attempt in (1, 2):  # thiếu/trùng/sai schema thì gọi lại đúng một lần
        result = await provider.chat(
            SHARED_SYSTEM, user, model.model_json_schema(), max_tokens=ASSESS_MAX_TOKENS
        )
        raw_calls.append(
            {
                "attempt": attempt,
                "codes": codes,
                "content": result.content,
                "done_reason": result.done_reason,
                "seconds": result.total_seconds,
                "prompt_tokens": result.prompt_tokens,
                "output_tokens": result.output_tokens,
                "prompt_seconds": result.prompt_seconds,
                "output_seconds": result.output_seconds,
            }
        )
        try:
            return _parse_batch(model, codes, result)
        except BatchInvalid as exc:
            last_error = str(exc)
    raise BatchInvalid(last_error)


async def evaluate_criteria(
    provider: LLMProvider, cv_text: str, criteria: Sequence[CriterionSpec]
) -> EvaluationOutcome:
    codes = [c.code for c in criteria]
    if len(set(codes)) != len(codes):
        raise ValueError("Duplicate criterion code")
    truncated = len(cv_text) > MAX_CV_CHARS
    text = cv_text[:MAX_CV_CHARS]
    raw_calls: list[dict[str, Any]] = []
    items: list[dict[str, Any]] = []
    for i in range(0, len(criteria), MAX_CRITERIA_PER_CALL):
        chunk = criteria[i : i + MAX_CRITERIA_PER_CALL]
        try:
            items.extend(await _assess_chunk(provider, text, chunk, raw_calls))
        except BatchInvalid as exc:
            return EvaluationOutcome("failed_validation", [], raw_calls, truncated, str(exc))
    by_code = {i["criterion"]: i for i in items}
    assessments = [validate_item(text, by_code[c]) for c in codes]
    return EvaluationOutcome("ok", assessments, raw_calls, truncated)


def prompt_version() -> str:
    return ASSESS_PROMPT_VERSION


def dumps(obj: Any) -> str:
    return json.dumps(obj, ensure_ascii=False)
