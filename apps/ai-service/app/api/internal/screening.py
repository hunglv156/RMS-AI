"""Internal synchronous screening API, using the production pipeline configuration."""

import asyncio
import hashlib
import secrets
import time
from contextlib import suppress
from dataclasses import asdict, dataclass
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Header, Request, UploadFile
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute
from pydantic import ValidationError

from app.api.deterministic import DeterministicProvider
from app.api.manifest import screening_manifest
from app.config import Settings
from app.extraction.bounded import ExtractionTimeoutError, extract_bounded
from app.extraction.document import (
    DocumentLimitError,
    EncryptedPDFError,
    ExtractionLimits,
    InvalidPDFError,
    OCRError,
)
from app.infrastructure.llm import (
    LLMError,
    LLMProvider,
    LLMProviderError,
    LLMRateLimitError,
    LLMSchemaError,
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


class APIError(Exception):
    def __init__(self, status: int, code: str, message: str):
        self.status = status
        self.code = code
        self.message = message


def get_settings() -> Settings:
    return Settings()


SettingsDep = Annotated[Settings, Depends(get_settings)]


async def require_service_token(
    settings: SettingsDep, authorization: Annotated[str | None, Header()] = None
):
    token = settings.ai_internal_token
    expected = token.get_secret_value() if token else ""
    if not expected or not secrets.compare_digest(
        (authorization or "").encode(), f"Bearer {expected}".encode()
    ):
        raise APIError(401, "unauthenticated", "A valid service bearer token is required.")


class DeadlineRoute(APIRoute):
    def get_route_handler(self):
        handler = super().get_route_handler()

        async def bounded(request: Request):
            factory = request.app.dependency_overrides.get(get_settings, get_settings)
            settings = factory()
            try:
                async with asyncio.timeout(settings.ai_request_deadline_s):
                    return await handler(request)
            except TimeoutError:
                return JSONResponse(
                    status_code=504,
                    content={
                        "error": {
                            "code": "request_timeout",
                            "message": "The AI request deadline was exceeded.",
                        }
                    },
                )

        return bounded


router = APIRouter(
    prefix="/internal/v1", dependencies=[Depends(require_service_token)], route_class=DeadlineRoute
)


def get_extractor():
    return extract_bounded


def pinned_manifest(
    settings: SettingsDep,
    expected: Annotated[str, Header(alias="X-Expected-Config-Fingerprint")],
    request_id: Annotated[str, Header(alias="X-Request-ID", min_length=1)],
    run_id: Annotated[str, Header(alias="X-Run-ID", min_length=1)],
):
    manifest = screening_manifest(settings)
    if not secrets.compare_digest(expected.encode(), manifest["fingerprint"].encode()):
        raise APIError(409, "config_changed", "The effective screening configuration changed.")
    return manifest


@router.get("/screening-manifest")
def manifest(settings: SettingsDep):
    return screening_manifest(settings)


def get_extraction_limits() -> ExtractionLimits:
    return ExtractionLimits()


def public_config(settings: Settings) -> dict:
    if settings.ai_provider_mode == "deterministic":
        settings = settings.model_copy(
            update={
                "screening_model": "deterministic-v1",
                "screening_escalate_model": None,
                "screening_hedge_after_s": None,
            }
        )
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
    if settings.ai_provider_mode == "deterministic":
        return ScreeningProviders(primary=DeterministicProvider())
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
        except LLMSchemaError:
            raise LLMSchemaError("The LLM returned invalid structured output.") from None
        except LLMRateLimitError:
            raise LLMRateLimitError("The LLM provider is rate limited.") from None
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
    request: Request,
    settings: SettingsDep,
    manifest: Annotated[dict, Depends(pinned_manifest)],
    providers: Annotated[ScreeningProviders, Depends(get_screening_providers)],
    limits: Annotated[ExtractionLimits, Depends(get_extraction_limits)],
    embedder: Annotated[object, Depends(get_screening_embedder)],
    extractor: Annotated[object, Depends(get_extractor)],
    cv: Annotated[UploadFile | None, File()] = None,
    jd: Annotated[str | None, Form()] = None,
):
    async def disconnect():
        while not await request.is_disconnected():
            await asyncio.sleep(0.05)

    work = asyncio.create_task(
        process_screening(settings, manifest, providers, limits, embedder, extractor, cv, jd)
    )
    monitor = asyncio.create_task(disconnect())
    try:
        done, _ = await asyncio.wait({work, monitor}, return_when=asyncio.FIRST_COMPLETED)
        if work in done:
            return await work
        raise APIError(499, "client_disconnected", "The client disconnected.")
    finally:
        for task in (work, monitor):
            task.cancel()
        for task in (work, monitor):
            with suppress(asyncio.CancelledError):
                await task


async def process_screening(settings, manifest, providers, limits, embedder, extractor, cv, jd):
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
            document = await extractor(
                data, limits=limits, timeout_s=settings.ai_extraction_deadline_s
            )
        except ExtractionTimeoutError:
            raise APIError(
                504, "extraction_timeout", "PDF extraction exceeded its deadline."
            ) from None
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
    except LLMSchemaError:
        raise APIError(
            502, "llm_schema_error", "The LLM returned invalid structured output."
        ) from None
    except LLMRateLimitError:
        raise APIError(
            429, "llm_rate_limited", "The LLM provider is rate limited; try again."
        ) from None
    except LLMTimeoutError:
        raise APIError(504, "llm_timeout", "The LLM request timed out; try again.") from None
    except LLMError:
        raise APIError(
            502, "llm_error", "The LLM could not complete screening; try again."
        ) from None
    return {
        "screening": result.model_dump(mode="json"),
        "manifest": manifest,
        "fingerprint": manifest["fingerprint"],
        "source": {
            "text": document.text,
            "pages": [asdict(page) for page in document.pages],
            "normalized_text_sha256": hashlib.sha256(document.text.encode()).hexdigest(),
            "offset_unit": "unicode_code_points",
            "extractor_version": document.extractor_version,
            "normalization_version": document.normalization_version,
            "tool_versions": document.tool_versions,
        },
        "extraction": {
            "pages": len(document.pages),
            "ocr_pages": sum(page.method == "ocr" for page in document.pages),
            "chars": len(document.text),
        },
        "latency_s": time.perf_counter() - started,
        "config": public_config(settings),
    }
