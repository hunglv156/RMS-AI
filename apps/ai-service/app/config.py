from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

_REPO_ROOT_ENV = Path(__file__).resolve().parents[3] / ".env"


class Settings(BaseSettings):
    database_url: SecretStr | None = None
    s3_endpoint: str | None = None
    s3_access_key: SecretStr | None = None
    s3_secret_key: SecretStr | None = None
    s3_bucket: str | None = None
    gemini_api_key: SecretStr | None = None
    gemini_model: str = "gemini-3.8-flash-high"
    llm_base_url: str | None = None
    llm_api_key: SecretStr | None = None
    llm_model: str = "ag/gemini-3.8-flash-high"
    llm_timeout_s: float = Field(default=30.0, gt=0)
    llm_hedge_after_s: float | None = Field(default=None, gt=0)
    llm_max_retries: int = Field(default=2, ge=0, le=10)
    ai_service_host: str = "127.0.0.1"
    ai_service_port: int = 8100
    screening_model: str = "ag/gemini-3.8-flash-low"
    screening_prompt_version: Literal["screening-v1", "screening-v2"] = "screening-v2"
    screening_context_mode: Literal["full", "retrieved"] = "retrieved"
    screening_retrieval_mode: Literal["lexical", "dense", "hybrid"] = "lexical"
    screening_retrieval_k: int = Field(default=5, ge=1)
    screening_hedge_after_s: float | None = Field(default=20.0, gt=0)
    screening_escalate_model: str | None = "ag/gemini-4-argon-medium"
    screening_escalate_on: frozenset[Literal["needs_review", "coverage_band"]] = frozenset(
        {"needs_review"}
    )
    screening_min_coverage: float = Field(default=0.8, ge=0, le=1)
    screening_sample_jds_dir: Path = _REPO_ROOT_ENV.parent / "data/eval/jds"

    model_config = SettingsConfigDict(
        env_file=_REPO_ROOT_ENV,
        env_file_encoding="utf-8",
        extra="ignore",
    )
