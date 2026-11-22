"""Internal synchronous screening API, using the production pipeline configuration."""

import time
from dataclasses import dataclass
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, UploadFile
from pydantic import ValidationError
from starlette.concurrency import run_in_threadpool

from app.config import Settings
from app.extraction.document import (
    DocumentLimitError,
    EncryptedPDFError,
    ExtractionLimits,
    InvalidPDFError,
    OCRError,
    extract_document,
)
from app.infrastructure.llm import (
    LLMError,
    LLMProvider,
    LLMProviderError,
    LLMTimeoutError,
    get_llm_provider,
)
from app.pipelines.screening import (
    EscalationRule,
    ScreeningConfig,
    load_jd,
    screen,
    screen_with_escalation,
)
from app.pipelines.screening.models import JobDescription

router = APIRouter(prefix="/internal/v1")


class APIError(Exception):
    def __init__(self, status: int, code: str, message: str):
        self.status = status
        self.code = code
        self.message = message


def get_settings() -> Settings:
    return Settings()


SettingsDep = Annotated[Settings, Depends(get_settings)]


def get_extraction_limits() -> ExtractionLimits:
    return ExtractionLimits()


def public_config(settings: Settings) -> dict:
    return {
        "model": settings.screening_model,
        "prompt_version": settings.screening_prompt_version,
        "context_mode": settings.screening_context_mode,
        "retrieval_mode": settings.screening_retrieval_mode,
        "retrieval_k": settings.screening_retrieval_k,
        "hedge_after_s": settings.screening_hedge_after_s,
        "escalation": {
            "enabled": bool(settings.screening_escalate_model and settings.screening_escalate_on),
            "model": settings.screening_escalate_model,
            "triggers": sorted(settings.screening_escalate_on),
        },
        "min_coverage": settings.screening_min_coverage,
    }


@dataclass(frozen=True)
class ScreeningProviders:
    primary: LLMProvider
    escalation: LLMProvider | None = None


def get_screening_providers(settings: SettingsDep) -> ScreeningProviders:
    # Match the runner's model overrides without changing the experiment defaults.
    configured = bool(settings.llm_base_url and settings.llm_api_key) or bool(
        settings.gemini_api_key
    )
    if not configured:
        raise APIError(503, "llm_not_configured", "Configure an LLM provider before screening.")
    base = settings.model_copy(update={"llm_hedge_after_s": settings.screening_hedge_after_s})

    def provider(model):
        return get_llm_provider(base.model_copy(update={"llm_model": model, "gemini_model": model}))

    return ScreeningProviders(
        primary=provider(settings.screening_model),
        escalation=(
            provider(settings.screening_escalate_model)
            if settings.screening_escalate_model and settings.screening_escalate_on
            else None
        ),
    )


class SafeProvider:
    """Keep provider exception details out of both HTTP and escalation metadata."""

    def __init__(self, provider: LLMProvider):
        self.provider = provider

    async def generate_structured(self, **kwargs):
        try:
            return await self.provider.generate_structured(**kwargs)
        except (LLMTimeoutError, TimeoutError):
            raise LLMTimeoutError("The LLM request timed out.") from None
        except Exception:  # noqa: BLE001 — provider failures must not expose connection details
            raise LLMProviderError("The LLM request failed.") from None


@router.get("/screening-config")
def screening_config(settings: SettingsDep):
    return public_config(settings)


@router.get("/sample-jds")
def sample_jds(settings: SettingsDep):
    items = []
    for name in ("jd-py-real", "jd-hr-real"):
        jd = load_jd(settings.screening_sample_jds_dir / f"{name}.yaml")
        items.append({"id": jd.id, "title": jd.title, "summary": jd.summary, "jd": jd.model_dump()})
    return {"items": items}


def get_screening_embedder(settings: SettingsDep):
    # Same optional dense/hybrid wiring as experiments.run; lexical stays offline.
    if (
        settings.screening_context_mode == "retrieved"
        and settings.screening_retrieval_mode != "lexical"
    ):
        from app.embeddings import BgeM3Embedder

        return BgeM3Embedder()
    return None


@router.post("/screenings")
async def create_screening(
    settings: SettingsDep,
    providers: Annotated[ScreeningProviders, Depends(get_screening_providers)],
    limits: Annotated[ExtractionLimits, Depends(get_extraction_limits)],
    embedder: Annotated[object, Depends(get_screening_embedder)],
    cv: Annotated[UploadFile | None, File()] = None,
    jd: Annotated[str | None, Form()] = None,
):
    started = time.perf_counter()
    try:
        job = JobDescription.model_validate_json(jd or "")
    except ValidationError:
        raise APIError(400, "invalid_jd", "Provide a valid JobDescription JSON object.") from None
    if cv is None:
        raise APIError(400, "invalid_pdf", "Provide a PDF CV file.")
    try:
        if cv.content_type not in {"application/pdf", "application/octet-stream"}:
            raise APIError(415, "unsupported_type", "Only PDF CV files are supported.")
        # Read at most one byte over the limit, including for chunked uploads.
        data = await cv.read(limits.max_bytes + 1)
        if len(data) > limits.max_bytes:
            raise APIError(413, "file_too_large", "The PDF exceeds the document size limit.")
        try:
            document = await run_in_threadpool(extract_document, data, limits=limits)
        except EncryptedPDFError:
            raise APIError(400, "encrypted_pdf", "Encrypted PDFs are unsupported.") from None
        except DocumentLimitError:
            raise APIError(413, "file_too_large", "The PDF exceeds the document limits.") from None
        except (InvalidPDFError, OCRError):
            raise APIError(400, "invalid_pdf", "The PDF could not be read or extracted.") from None
    finally:
        await cv.close()
    if not document.text.strip():
        raise APIError(400, "empty_text", "The PDF contains no extractable text.")
    config = ScreeningConfig(
        prompt_version=settings.screening_prompt_version,
        context_mode=settings.screening_context_mode,
        retrieval_mode=settings.screening_retrieval_mode,
        retrieval_k=settings.screening_retrieval_k,
        min_coverage=settings.screening_min_coverage,
    )
    kwargs = {"provider": SafeProvider(providers.primary), "config": config, "embedder": embedder}
    try:
        if providers.escalation is not None:
            result = await screen_with_escalation(
                document.text,
                job,
                escalation_provider=SafeProvider(providers.escalation),
                escalation_model=settings.screening_escalate_model,
                rule=EscalationRule(triggers=settings.screening_escalate_on),
                **kwargs,
            )
        else:
            result = await screen(document.text, job, **kwargs)
    except LLMTimeoutError:
        raise APIError(504, "llm_timeout", "The LLM request timed out; try again.") from None
    except LLMError:
        raise APIError(
            502, "llm_error", "The LLM could not complete screening; try again."
        ) from None
    return {
        "screening": result.model_dump(mode="json"),
        "extraction": {
            "pages": len(document.pages),
            "ocr_pages": sum(page.method == "ocr" for page in document.pages),
            "chars": len(document.text),
        },
        "latency_s": time.perf_counter() - started,
        "config": public_config(settings),
    }
