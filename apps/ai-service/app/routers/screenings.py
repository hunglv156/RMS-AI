from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from app.assessment.evaluate import CriterionSpec, evaluate_criteria, prompt_version
from app.infrastructure.llm import LLMProvider
from app.infrastructure.storage import ObjectStore
from app.routers.documents import _assert_key_in_org
from app.scoring import resolve_level, score_criteria
from app.security import require_signature

router = APIRouter(prefix="/internal/v1/screenings", dependencies=[Depends(require_signature)])

Uuid = Annotated[str, Field(pattern=r"^[0-9a-fA-F-]{36}$")]
Code = Annotated[str, Field(pattern=r"^[a-z][a-z0-9_]{1,48}$")]


class CriterionIn(BaseModel):
    code: Code
    label: str = Field(max_length=200)
    description: str = Field(default="", max_length=2000)
    weight: float
    priority: Literal["must_have", "nice_to_have"]


class ScoringIn(BaseModel):
    rubric_values: dict[str, float]
    min_coverage: float = Field(ge=0, le=1)


class EvaluateRequest(BaseModel):
    organization_id: Uuid
    resume_id: Uuid
    extracted_text_key: str
    criteria: list[CriterionIn] = Field(min_length=1, max_length=30)
    scoring: ScoringIn


class EvidenceOut(BaseModel):
    quote: str
    start_offset: int
    end_offset: int


class CriterionOut(BaseModel):
    code: str
    level: str
    status: str
    match_value: float | None
    weight: float
    rationale: str
    evidence: list[EvidenceOut]
    validated: bool
    raw: dict[str, Any]
    notes: list[str]


class EvaluateResponse(BaseModel):
    status: Literal["ok", "failed_validation"]
    error: str | None
    results: list[CriterionOut]
    score: dict[str, Any] | None
    prompt_version: str
    model: str
    truncated: bool
    raw_calls: list[dict[str, Any]]
    timings: dict[str, Any]


@router.post("/evaluate", response_model=EvaluateResponse)
async def evaluate(body: EvaluateRequest, request: Request) -> EvaluateResponse:
    _assert_key_in_org(body.extracted_text_key, body.organization_id)
    codes = [c.code for c in body.criteria]
    if len(set(codes)) != len(codes):
        raise HTTPException(status_code=422, detail="Duplicate criterion code")
    if (
        not all(v >= 0 for v in (c.weight for c in body.criteria))
        or sum(c.weight for c in body.criteria) <= 0
    ):
        raise HTTPException(
            status_code=422, detail="Weights must be non-negative with positive sum"
        )
    missing = {"strong", "adequate", "partial", "absent"} - body.scoring.rubric_values.keys()
    if missing:
        raise HTTPException(status_code=422, detail=f"rubric_values missing: {sorted(missing)}")

    store: ObjectStore = request.app.state.store
    provider: LLMProvider = request.app.state.llm
    text = (await run_in_threadpool(store.get, body.extracted_text_key)).decode()

    specs = [CriterionSpec(c.code, c.label, c.description) for c in body.criteria]
    outcome = await evaluate_criteria(provider, text, specs)
    timings = {
        "calls": len(outcome.raw_calls),
        "llm_seconds": round(sum(c["seconds"] for c in outcome.raw_calls), 2),
        "prompt_seconds": round(sum(c["prompt_seconds"] for c in outcome.raw_calls), 2),
        "output_seconds": round(sum(c["output_seconds"] for c in outcome.raw_calls), 2),
        "output_tokens": sum(c["output_tokens"] or 0 for c in outcome.raw_calls),
    }
    base = {
        "prompt_version": prompt_version(),
        "model": provider.model,
        "truncated": outcome.truncated,
        "raw_calls": outcome.raw_calls,
        "timings": timings,
    }
    if outcome.status != "ok":
        return EvaluateResponse(
            status="failed_validation", error=outcome.error, results=[], score=None, **base
        )

    by_code = {c.code: c for c in body.criteria}
    results: list[CriterionOut] = []
    scoring_inputs: list[dict[str, Any]] = []
    for a in outcome.assessments:
        resolved = resolve_level(a.level, body.scoring.rubric_values)
        crit = by_code[a.code]
        # Mọi level đã kết luận đã được ép có evidence hợp lệ ở bước validate.
        validated = a.level in {"unknown", "needs_review"} or bool(a.evidence)
        results.append(
            CriterionOut(
                code=a.code,
                level=a.level,
                status=resolved["status"],
                match_value=resolved["match_value"],
                weight=crit.weight,
                rationale=a.rationale,
                evidence=[
                    EvidenceOut(quote=e.quote, start_offset=e.start_offset, end_offset=e.end_offset)
                    for e in a.evidence
                ],
                validated=validated,
                raw=a.raw,
                notes=a.notes,
            )
        )
        scoring_inputs.append(
            {
                "criterion_id": a.code,
                "weight": crit.weight,
                "priority": crit.priority,
                "status": resolved["status"],
                "match_value": resolved["match_value"],
                "validated": validated,
            }
        )
    score = score_criteria(scoring_inputs, body.scoring.min_coverage)
    return EvaluateResponse(status="ok", error=None, results=results, score=score, **base)
