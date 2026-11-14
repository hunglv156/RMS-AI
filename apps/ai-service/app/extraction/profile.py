from dataclasses import dataclass

from pydantic import ValidationError

from app.config import MAX_CV_CHARS
from app.infrastructure.llm import LLMProvider, LLMResult
from app.prompts.extraction import EXTRACT_PROMPT_VERSION, EXTRACT_TASK
from app.prompts.shared import SHARED_SYSTEM, build_user
from app.schemas.extraction import SlimExtraction

# Hồ sơ đầy đủ khoảng 400-700 token; trần thấp để vòng lặp không chiếm cả phút.
EXTRACT_MAX_TOKENS = 1000


class ExtractionError(Exception):
    pass


@dataclass
class ProfileResult:
    profile: SlimExtraction
    prompt_version: str
    llm: LLMResult
    truncated: bool


async def extract_profile(provider: LLMProvider, cv_text: str) -> ProfileResult:
    truncated = len(cv_text) > MAX_CV_CHARS
    result = await provider.chat(
        SHARED_SYSTEM,
        build_user(cv_text[:MAX_CV_CHARS], EXTRACT_TASK),
        SlimExtraction.model_json_schema(),
        max_tokens=EXTRACT_MAX_TOKENS,
    )
    if result.done_reason == "length":
        raise ExtractionError("LLM output truncated")
    try:
        profile = SlimExtraction.model_validate_json(result.content)
    except ValidationError as exc:
        raise ExtractionError(f"Invalid extraction JSON: {str(exc)[:300]}") from exc
    return ProfileResult(profile, EXTRACT_PROMPT_VERSION, result, truncated)
