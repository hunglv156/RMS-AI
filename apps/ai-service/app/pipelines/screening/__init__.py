"""Screen one normalized CV string or PDF Path, without persistence or networking.

Inject an LLMProvider in all modes and an Embedder for dense/hybrid retrieval.
Lexical retrieval needs no embedder. Provider/schema failures propagate; no
partial scoring result is returned. JDs are limited to eight criteria to retain
one batched call. Default scoring values are illustrative, not calibrated.
"""

import hashlib
import json
from dataclasses import asdict
from pathlib import Path

import yaml
from pydantic import ValidationError

from app.assessment.evidence import validate_assessment, verify_quote
from app.chunking import chunk_text
from app.embeddings import Embedder, embed_chunks
from app.extraction.document import extract_document
from app.infrastructure.llm.base import LLMProvider, LLMSchemaError
from app.prompts.screening import screening_prompt
from app.retrieval import build_context, retrieve_for_criteria
from app.scoring.engine import CriterionResult, resolve_level, score_criteria

from .models import (
    CheckedEvidence,
    JobDescription,
    ScreenedCriterion,
    ScreeningConfig,
    ScreeningResponse,
    ScreeningResult,
    ScreeningVersions,
)

__all__ = ["JobDescription", "ScreeningConfig", "ScreeningResult", "load_jd", "screen"]


def load_jd(path: str | Path) -> JobDescription:
    """Read the evaluation JD YAML format safely and validate all scoring inputs."""
    return JobDescription.model_validate(yaml.safe_load(Path(path).read_text(encoding="utf-8")))


def _sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


async def screen(
    cv: str | Path,
    jd: JobDescription | str | Path,
    *,
    provider: LLMProvider,
    config: ScreeningConfig | None = None,
    embedder: Embedder | None = None,
) -> ScreeningResult:
    """Strings are already-normalized CV text; use Path for PDF input.

    JD may be a validated model or YAML path. Quote offsets always reference the
    exact input text, including when retrieval supplies only selected passages.
    """
    config = config or ScreeningConfig()
    jd = load_jd(jd) if isinstance(jd, (str, Path)) else jd
    extraction = None
    if isinstance(cv, Path):
        document = extract_document(cv.read_bytes())
        text = document.text
        extraction = asdict(document)
        extraction.pop("text")
    else:
        text = cv
    if not text.strip():
        raise ValueError("CV text must be nonempty")
    context = text
    retrieval_versions = {"chunker": None, "embedding": None, "retrieval": None}
    if config.context_mode == "retrieved":
        if config.retrieval_mode != "lexical" and embedder is None:
            raise ValueError("Dense/hybrid retrieval requires an injected embedder")
        chunks = chunk_text(text)
        embeddings = embed_chunks(chunks, embedder) if config.retrieval_mode != "lexical" else None
        retrieved = retrieve_for_criteria(
            chunks,
            embeddings,
            [criterion.model_dump() for criterion in jd.criteria],
            mode=config.retrieval_mode,
            k=config.retrieval_k,
        )
        # No silent truncation: all selected passages fit within the source size.
        context = build_context(chunks, retrieved, char_budget=len(text))
        retrieval_versions = {
            **retrieved.pipeline_versions_json,
            "hits": {
                code: [asdict(hit) for hit in hits]
                for code, hits in retrieved.per_criterion_hits.items()
            },
            "chunks": [asdict(chunk) | {"text": None} for chunk in chunks],
        }
    system, user = screening_prompt(config.prompt_version, jd.model_dump(), context)
    response = await provider.generate_structured(
        system=system, user=user, response_model=ScreeningResponse, temperature=0.0
    )
    try:
        assessments = ScreeningResponse.model_validate(response.value).criteria
    except ValidationError as exc:
        raise LLMSchemaError("Screening response failed schema validation") from exc
    codes = [assessment.criterion_id for assessment in assessments]
    expected = {criterion.code for criterion in jd.criteria}
    if len(codes) != len(set(codes)) or set(codes) != expected:
        raise LLMSchemaError("Screening response criterion set differs from JD")
    by_code = {assessment.criterion_id: assessment for assessment in assessments}
    results = []
    for criterion in jd.criteria:
        assessment = by_code[criterion.code]
        checked = []
        for evidence in assessment.evidence:
            verification = verify_quote(text, **evidence.model_dump())
            if verification.valid and evidence.quote not in context:
                verification = verification.model_copy(
                    update={"valid": False, "reason": "quote_not_in_context"}
                )
            checked.append(CheckedEvidence(evidence=evidence, verification=verification))
        validation = validate_assessment(
            assessment.level,
            [item.evidence.model_dump() for item in checked if item.verification.valid],
            text,
        )
        resolved = resolve_level(validation.level, config.rubric_values)
        scoring = CriterionResult(
            criterion_id=criterion.code,
            weight=criterion.weight,
            priority=criterion.priority,
            validated=validation.evidence_valid,
            **resolved,
        )
        value = scoring.match_value
        results.append(
            ScreenedCriterion(
                assessment=assessment,
                validation=validation,
                evidence=checked,
                scoring=scoring,
                score=100 * value if value is not None else None,
                weighted_points=criterion.weight * value if value is not None else None,
            )
        )
    return ScreeningResult(
        jd_id=jd.id,
        criteria=results,
        total=score_criteria(
            [item.scoring for item in results],
            config.min_coverage,
            expected_criterion_ids=expected,
        ),
        llm=response.metadata,
        versions=ScreeningVersions(
            prompt=config.prompt_version,
            model=response.metadata.model,
            config=config,
            retrieval=retrieval_versions,
            extraction=extraction,
            cv_sha256=_sha256(text),
            jd_sha256=_sha256(json.dumps(jd.model_dump(), sort_keys=True)),
        ),
    )
