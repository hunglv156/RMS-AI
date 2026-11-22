"""Credential-free effective configuration, pinned to the executable source tree."""

import hashlib
import json
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from app.config import Settings
from app.extraction.document import EXTRACTOR_VERSION, NORMALIZATION_VERSION
from app.pipelines.screening.models import ScreeningConfig
from app.prompts.screening import SCREENING_V1, SCREENING_V2


def canonical_json(value):
    # JSON.stringify (Node consumer) serializes integral floats as integers.
    def normalize(item):
        if isinstance(item, dict):
            return {key: normalize(val) for key, val in item.items()}
        if isinstance(item, list):
            return [normalize(val) for val in item]
        if isinstance(item, float) and item.is_integer():
            return int(item)
        return item

    return json.dumps(
        normalize(value), sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False
    )


def source_revision():
    root = Path(__file__).resolve().parents[1]
    digest = hashlib.sha256()
    for path in sorted(root.rglob("*.py")):
        digest.update(path.relative_to(root).as_posix().encode())
        digest.update(b"\0")
        digest.update(path.read_bytes())
    return "source-" + digest.hexdigest()


def screening_manifest(settings: Settings):
    enabled = bool(settings.screening_escalate_model and settings.screening_escalate_on)
    deterministic = settings.ai_provider_mode == "deterministic"
    enabled = enabled and not deterministic
    gateway = bool(settings.llm_base_url and settings.llm_api_key)
    url = urlsplit(settings.llm_base_url or "")
    # Strip URL credentials, query strings and fragments from returned metadata.
    endpoint = urlunsplit((url.scheme, url.netloc.rsplit("@", 1)[-1], url.path, "", ""))
    prompt = SCREENING_V2 if settings.screening_prompt_version == "screening-v2" else SCREENING_V1
    value = {
        "build_revision": settings.ai_build_revision or source_revision(),
        "mode": settings.ai_provider_mode,
        "provider": "deterministic" if deterministic else "openai_compat" if gateway else "gemini",
        "models": {
            "primary": "deterministic-v1" if deterministic else settings.screening_model,
            "escalation": (
                "deterministic-v1" if deterministic else settings.screening_escalate_model
            )
            if enabled
            else None,
        },
        "prompts": {
            "version": settings.screening_prompt_version,
            "sha256": hashlib.sha256(prompt.encode()).hexdigest(),
        },
        "scoring": {
            "version": "scoring-v1",
            "rubric_values": ScreeningConfig().rubric_values,
            "min_coverage": settings.screening_min_coverage,
        },
        "retrieval": {
            "context_mode": settings.screening_context_mode,
            "mode": settings.screening_retrieval_mode,
            "k": settings.screening_retrieval_k,
            "version": "retrieval-v1",
        },
        "parser": {"version": EXTRACTOR_VERSION, "normalization_version": NORMALIZATION_VERSION},
        "hedge": {
            "after_s": None if deterministic or not gateway else settings.screening_hedge_after_s
        },
        "escalation": {
            "enabled": enabled,
            "triggers": sorted(settings.screening_escalate_on) if enabled else [],
        },
        "deadlines": {
            "aggregate_s": settings.ai_request_deadline_s,
            "extraction_s": settings.ai_extraction_deadline_s,
        },
        "provider_settings": {
            "base_url": endpoint if gateway and not deterministic else None,
            "temperature": 0,
            "timeout_s": settings.llm_timeout_s,
            "max_retries": settings.llm_max_retries,
            "structured_output_version": "structured-json-v1",
        },
    }
    return value | {"fingerprint": hashlib.sha256(canonical_json(value).encode()).hexdigest()}
