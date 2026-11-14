from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel, Field

from app.config import PIPELINE_VERSION
from app.extraction.profile import ExtractionError, extract_profile
from app.extraction.text import extract_text
from app.infrastructure.llm import LLMProvider
from app.infrastructure.storage import ObjectStore
from app.security import require_signature

router = APIRouter(prefix="/internal/v1/documents", dependencies=[Depends(require_signature)])

Uuid = Annotated[str, Field(pattern=r"^[0-9a-fA-F-]{36}$")]


class ParseRequest(BaseModel):
    organization_id: Uuid
    resume_id: Uuid
    object_key: str
    mime_type: str


class ParseResponse(BaseModel):
    extracted_text_key: str
    char_count: int
    page_count: int | None
    ocr_used: bool
    quality_flags: list[str]
    parser_version: str


class ExtractRequest(BaseModel):
    organization_id: Uuid
    resume_id: Uuid
    extracted_text_key: str


class ExtractResponse(BaseModel):
    profile: dict[str, Any]
    prompt_version: str
    model: str
    truncated: bool
    timings: dict[str, Any]


def _store(request: Request) -> ObjectStore:
    store: ObjectStore = request.app.state.store
    return store


def _llm(request: Request) -> LLMProvider:
    provider: LLMProvider = request.app.state.llm
    return provider


def _assert_key_in_org(key: str, organization_id: str) -> None:
    # Key phải nằm trong tiền tố của đúng tổ chức, không tin tenant suy đoán.
    if not key.startswith(f"org/{organization_id}/") or ".." in key:
        raise HTTPException(status_code=403, detail="Object key does not belong to organization")


@router.post("/parse", response_model=ParseResponse)
async def parse(body: ParseRequest, request: Request) -> ParseResponse:
    _assert_key_in_org(body.object_key, body.organization_id)
    store = _store(request)
    data = await run_in_threadpool(store.get, body.object_key)
    try:
        extracted = await run_in_threadpool(extract_text, data, body.mime_type)
    except Exception as exc:  # file hỏng: lỗi của tài liệu, không phải của hệ thống
        raise HTTPException(status_code=422, detail=f"Cannot read document: {exc}") from exc
    key = f"org/{body.organization_id}/extracted/{body.resume_id}/{PIPELINE_VERSION}.txt"
    await run_in_threadpool(store.put, key, extracted.text.encode(), "text/plain; charset=utf-8")
    return ParseResponse(
        extracted_text_key=key,
        char_count=len(extracted.text),
        page_count=extracted.page_count,
        ocr_used=extracted.ocr_used,
        quality_flags=extracted.flags,
        parser_version=PIPELINE_VERSION,
    )


@router.post("/extract", response_model=ExtractResponse)
async def extract(body: ExtractRequest, request: Request) -> ExtractResponse:
    _assert_key_in_org(body.extracted_text_key, body.organization_id)
    text = (await run_in_threadpool(_store(request).get, body.extracted_text_key)).decode()
    try:
        result = await extract_profile(_llm(request), text)
    except ExtractionError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    llm = result.llm
    return ExtractResponse(
        profile=result.profile.model_dump(),
        prompt_version=result.prompt_version,
        model=llm.model,
        truncated=result.truncated,
        timings={
            "prompt_tokens": llm.prompt_tokens,
            "prompt_seconds": llm.prompt_seconds,
            "output_tokens": llm.output_tokens,
            "output_seconds": llm.output_seconds,
            "total_seconds": llm.total_seconds,
        },
    )
