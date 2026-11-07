"""Tóm tắt lỗi và mức độ theo nhóm; che thông tin liên hệ khi in."""
import collections, json, re, sys
from common import OUT

EMAIL = re.compile(r"[\w.+-]+@[\w.-]+")
PHONE = re.compile(r"(?<!\d)(?:\+?84|0)[\d .-]{8,12}\d")
mask = lambda s: PHONE.sub("[phone]", EMAIL.sub("[email]", s or ""))
for model in sys.argv[1:]:
    rows = [json.loads(l) for l in (OUT / f"{model}.jsonl").open()]
    print("==", model)
    for r in rows:
        if not r["schema_valid"]:
            print("INVALID", r["cv"], r["task"], r["done_reason"], r["output_tokens"], r["seconds"])
    a = [r for r in rows if r["task"] != "extract" and r["schema_valid"]]
    print("by group", {g: dict(collections.Counter(r["parsed"]["level"] for r in a if r["group"] == g)) for g in ("vi", "mixed", "en")})
    print("by criterion", {t: dict(collections.Counter(r["parsed"]["level"] for r in a if r["task"] == t)) for t in sorted({r["task"] for r in a})})
    no_q = [r for r in a if r["parsed"]["level"] in ("strong", "adequate", "partial", "absent") and r.get("quotes_ok", 0) == 0]
    print("assertive level without a verified quote:", len(no_q), "of", len(a))
    ok = sum(r.get("quotes_ok", 0) for r in a); tot = sum(r.get("quotes_total", 0) for r in a)
    print("quotes", ok, tot)
    for g in ("vi", "mixed", "en"):
        s = [r for r in a if r["group"] == g]
        print(" quotes", g, sum(r.get("quotes_ok", 0) for r in s), sum(r.get("quotes_total", 0) for r in s))
    print("sample rationales:")
    for r in [x for x in a if x["group"] != "en"][:4]:
        print(" -", r["cv"], r["task"], r["parsed"]["level"], "|", mask(r["parsed"]["rationale"])[:160])
