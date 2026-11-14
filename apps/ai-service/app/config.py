from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[3]

# Một num_ctx duy nhất cho mọi lượt gọi: đổi num_ctx làm Ollama nạp lại model và mất KV cache.
LLM_NUM_CTX = 6144
MAX_CV_CHARS = 8000
PIPELINE_VERSION = "parse-v1"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore")

    ai_hmac_secret: str
    s3_endpoint: str
    s3_bucket: str
    s3_access_key: str
    s3_secret_key: str
    ollama_url: str = "http://127.0.0.1:11434"
    llm_model: str = "qwen3:14b"
    hmac_max_skew_seconds: int = 300


@lru_cache
def get_settings() -> Settings:
    return Settings()
