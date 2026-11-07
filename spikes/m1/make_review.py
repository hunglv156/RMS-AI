"""Tạo file so sánh 8B và 14B để người kiểm tra bằng tay; che email và số điện thoại."""
import collections, json, re
from common import OUT, select_samples

EMAIL = re.compile(r"[\w.+-]+@[\w.-]+")
PHONE = re.compile(r"(?<!\d)(?:\+?84|0)[\d .-]{8,12}\d")
mask = lambda s: PHONE.sub("[phone]", EMAIL.sub("[email]", s or ""))
load = lambda name: {(r["cv"], r["task"]): r for r in map(json.loads, (OUT / f"{name}.jsonl").open())}
a, b = load("qwen3-8b-v2"), load("qwen3-14b-v2")
tasks = ["backend", "database", "cloud", "teamwork", "english"]
out = ["# Kiểm tra tay M1 (không commit)\n"]
same = total = 0
counts = collections.Counter()
for s in select_samples():
    out.append(f"\n## {s['id']}\n\n```text\n{mask(s['text'])}\n```\n")
    for t in tasks:
        x, y = a[(s["id"], t)]["parsed"], b[(s["id"], t)]["parsed"]
        total += 1; same += x["level"] == y["level"]
        counts[(x["level"], y["level"])] += 1
        out.append(f"\n### {t}\n")
        for name, r in (("8B", x), ("14B", y)):
            out.append(f"- **{name}: {r['level']}**: {mask(r['rationale'])}")
            out += [f"  - \"{mask(e['quote'])}\"" for e in r["evidence"]]
    out.append("\n### extract 8B\n\n```json\n" + mask(json.dumps(a[(s['id'], 'extract')]['parsed'], ensure_ascii=False, indent=1)) + "\n```\n")
(OUT / "review.md").write_text("\n".join(out))
print("agreement", same, total)
print(counts.most_common())
print("v2 empty rationale 8B/14B", *[sum(1 for k, r in d.items() if k[1] in tasks and not r["parsed"]["rationale"].strip()) for d in (a, b)])
for cv in ("vi-1108", "mixed-1512", "en-1064"):
    for t in tasks:
        x, y = a[(cv, t)]["parsed"], b[(cv, t)]["parsed"]
        print(cv, t, "8B", x["level"], "|14B", y["level"], "|", mask(y["rationale"])[:110])
