"""Khảo sát PDF: lớp text, kích thước ảnh, nhóm nghề; OCR một mẫu để xác định ngôn ngữ."""
import collections, io, json, random, re, statistics, sys
from pathlib import Path

import fitz
fitz.TOOLS.store_maxsize = 64 * 1024 * 1024
import pytesseract
from PIL import Image

from common import OUT, VI_ONLY, now

root = Path(sys.argv[1])
pdfs = sorted(root.rglob("*.pdf"))
cats = collections.Counter(p.parent.name for p in pdfs)
print("pdfs", len(pdfs), "categories", len(cats))
print(cats.most_common())
rows, broken = [], 0
for p in random.Random(42).sample(pdfs, 60):
    try:
        with fitz.open(p) as d:
            text = sum(len(pg.get_text().strip()) for pg in d)
            imgs = d[0].get_images(full=True)
            rect = d[0].rect
            rows.append({"path": str(p), "pages": len(d), "text": text, "images": len(imgs),
                         "w": imgs[0][2] if imgs else 0, "h": imgs[0][3] if imgs else 0,
                         "dpi": round(imgs[0][2] / (rect.width / 72)) if imgs else 0, "bytes": p.stat().st_size})
    except Exception:
        broken += 1
print("broken", broken, "with text layer >50 chars", sum(r["text"] > 50 for r in rows))
print("pages", collections.Counter(r["pages"] for r in rows).most_common(5))
for k in ("w", "h", "dpi", "bytes"):
    v = sorted(r[k] for r in rows)
    print(k, "p10", v[len(v)//10], "median", v[len(v)//2], "p90", v[len(v)*9//10])
rng = random.Random(42)
sample = rng.sample(rows, 8)
res = []
for r in sample:
    t0 = now()
    with fitz.open(r["path"]) as d:
        pix = d[0].get_pixmap(dpi=200)
    text = pytesseract.image_to_string(Image.open(io.BytesIO(pix.tobytes("png"))), lang="vie+eng")
    res.append({"sec": round(now() - t0, 2), "chars": len(text.strip()), "vi": len(VI_ONLY.findall(text))})
print("ocr sec median", statistics.median(x["sec"] for x in res), "chars median", statistics.median(x["chars"] for x in res))
print("sample docs with >=20 vi-only chars", sum(x["vi"] >= 20 for x in res), "of", len(res), "| vi counts", sorted(x["vi"] for x in res)[-8:])
