"""Phần dùng chung của spike M1: chọn mẫu, gọi Ollama, đo bộ nhớ."""
import io
import json
import random
import re
import threading
import time
from pathlib import Path

import fitz
import psutil
import pyarrow.parquet as pq
import pytesseract
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
PARQUET = ROOT / "data/hf-resumes/train.parquet"
OUT = ROOT / "spikes/output/m1"
OLLAMA = "http://127.0.0.1:11434"
SEED = 42

VI_ONLY = re.compile(r"[ơưđăạảấầẩẫậắằẳẵặẹẻẽếềểễệỉĩịọỏõốồổỗộớờởỡợụủũứừửữựỳỵỷỹ]", re.I)
EN_WORDS = re.compile(r"\b(the|and|of|with|for|experience|skills)\b", re.I)


def select_samples() -> list[dict]:
    """Chọn cố định 10 CV ngành IT: 3 tiếng Việt, 3 pha Việt-Anh, 4 tiếng Anh."""
    table = pq.read_table(PARQUET, columns=["label", "text"])
    rows = [
        {"row": i, "label": label, "text": text}
        for i, (label, text) in enumerate(zip(table["label"].to_pylist(), table["text"].to_pylist()))
        if label == 1 and text and 1500 <= len(text) <= 6000 and "(cid:" not in text and "�" not in text
    ]
    vi, en = [], []
    for row in rows:
        (vi if len(VI_ONLY.findall(row["text"])) >= 20 else en).append(row)
    vi.sort(key=lambda r: len(EN_WORDS.findall(r["text"])))
    half = len(vi) // 2
    rng = random.Random(SEED)
    picks = (
        [("vi", r) for r in rng.sample(vi[:half], 3)]
        + [("mixed", r) for r in rng.sample(vi[half:], 3)]
        + [("en", r) for r in rng.sample(en, 4)]
    )
    return [{**row, "group": group, "id": f"{group}-{row['row']}"} for group, row in picks]


KAGGLE = ROOT / "data/kaggle-resumes/pdf/Resumes PDF"
BUSINESS = ("Business", "HR", "Human", "Finance", "Digital", "Sales", "PMO", "Design", "design", "WebDesign", "web design")


def select_kaggle() -> list[dict]:
    """OCR ngẫu nhiên có seed tới khi đủ 7 CV kỹ thuật và 3 CV kinh doanh; lưu cache để chạy lại giống nhau."""
    cache = OUT / "kaggle_samples.json"
    if cache.exists():
        return json.loads(cache.read_text())
    pdfs = sorted(KAGGLE.rglob("*.pdf"))
    random.Random(SEED).shuffle(pdfs)
    picks, quota = [], {"tech": 7, "business": 3}
    for pdf in pdfs:
        group = "business" if pdf.parent.name.startswith(BUSINESS) else "tech"
        if not quota[group]:
            continue
        with fitz.open(pdf) as doc:
            pages = [page.get_pixmap(dpi=200).tobytes("png") for page in doc]
        start = now()
        text = "\n".join(pytesseract.image_to_string(Image.open(io.BytesIO(p)), lang="vie+eng") for p in pages)
        seconds = round(now() - start, 2)
        if 1500 <= len(text.strip()) <= 6000:
            quota[group] -= 1
            picks.append({"id": f"{group}-{len(picks)}", "group": group, "folder": pdf.parent.name,
                          "text": text.strip(), "ocr_seconds": seconds})
        if not any(quota.values()):
            break
    OUT.mkdir(parents=True, exist_ok=True)
    cache.write_text(json.dumps(picks, ensure_ascii=False))
    return picks


def normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().casefold()


class MemorySampler:
    """Lấy mẫu RAM trống, swap và tổng bộ nhớ các tiến trình Ollama mỗi 0.5 giây."""

    def __enter__(self):
        self.min_available = psutil.virtual_memory().available
        self.swap_start = psutil.swap_memory().used
        self.swap_peak = self.swap_start
        self.ollama_peak = 0
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()
        return self

    def _run(self):
        while not self._stop.wait(0.5):
            self.min_available = min(self.min_available, psutil.virtual_memory().available)
            self.swap_peak = max(self.swap_peak, psutil.swap_memory().used)
            rss = 0
            for proc in psutil.process_iter(["name", "memory_info"]):
                if proc.info["name"] in ("ollama", "llama-server") and proc.info["memory_info"]:
                    rss += proc.info["memory_info"].rss
            self.ollama_peak = max(self.ollama_peak, rss)

    def __exit__(self, *_):
        self._stop.set()
        self._thread.join()

    def summary(self) -> dict:
        gb = 1024**3
        return {
            "min_available_gb": round(self.min_available / gb, 2),
            "swap_growth_gb": round((self.swap_peak - self.swap_start) / gb, 2),
            "swap_peak_gb": round(self.swap_peak / gb, 2),
            "ollama_peak_rss_gb": round(self.ollama_peak / gb, 2),
        }


def now() -> float:
    return time.perf_counter()
