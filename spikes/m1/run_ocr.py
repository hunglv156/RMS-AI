"""So sánh Tesseract vie+eng trên ảnh trang với lớp text gốc của dataset."""
import difflib
import io
import json
import re
import statistics

import pyarrow.parquet as pq
import pytesseract
from PIL import Image

from common import OUT, PARQUET, now, select_samples


def squash(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().lower()


def main() -> None:
    samples = select_samples()
    rows = pq.read_table(PARQUET, columns=["images"])["images"]
    results = []
    for sample in samples:
        pages = rows[sample["row"]].as_py()
        start = now()
        text = "\n".join(
            pytesseract.image_to_string(Image.open(io.BytesIO(page["bytes"])), lang="vie+eng") for page in pages
        )
        seconds = now() - start
        ratio = difflib.SequenceMatcher(None, squash(text), squash(sample["text"]), autojunk=False).ratio()
        size = Image.open(io.BytesIO(pages[0]["bytes"])).size
        results.append({"cv": sample["id"], "group": sample["group"], "pages": len(pages), "size": size,
                        "similarity": round(ratio, 3), "seconds_per_page": round(seconds / len(pages), 2)})
        print(results[-1], flush=True)
    by_group = {
        g: round(statistics.mean(r["similarity"] for r in results if r["group"] == g), 3)
        for g in ("vi", "mixed", "en")
    }
    summary = {"by_group": by_group, "seconds_per_page_median": statistics.median(r["seconds_per_page"] for r in results)}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "ocr.summary.json").write_text(json.dumps({**summary, "results": results}, indent=2))
    print(summary)


if __name__ == "__main__":
    main()
