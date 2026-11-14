"""Test live: cần Ollama chạy Qwen3 14B và PDF Kaggle trong data/ (không commit). Chạy: pytest -m ollama."""

import random
import time
from pathlib import Path

import pytest

from app.config import ROOT, Settings
from app.extraction.profile import extract_profile
from app.extraction.text import extract_pdf
from app.infrastructure.llm import OllamaProvider
from app.schemas.extraction import SlimExtraction

pytestmark = pytest.mark.ollama
EXTRACT_BUDGET_SECONDS = 45


def pick_pdfs(n: int) -> list[Path]:
    pdfs = sorted((ROOT / "data").rglob("*.pdf"))
    if not pdfs:
        pytest.skip("Không có PDF Kaggle trong data/")
    return random.Random(42).sample(pdfs, n)


@pytest.mark.asyncio
async def test_extract_two_kaggle_cvs() -> None:
    provider = OllamaProvider("http://127.0.0.1:11434", Settings.model_fields["llm_model"].default)
    warm = await provider.chat(
        "Trả JSON.", "ping", {"type": "object", "properties": {"ok": {"type": "boolean"}}}
    )
    assert warm.content
    for pdf in pick_pdfs(2):
        text = extract_pdf(pdf.read_bytes()).text
        start = time.perf_counter()
        result = await extract_profile(provider, text)
        elapsed = time.perf_counter() - start
        SlimExtraction.model_validate(result.profile.model_dump())
        assert elapsed < EXTRACT_BUDGET_SECONDS, f"{pdf.name}: {elapsed:.1f}s"
