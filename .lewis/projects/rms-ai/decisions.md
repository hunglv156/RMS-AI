---
updated: 2026-11-21
---

# Decisions

Record accepted coordination choices and links to shared product/architecture
decisions. Keep business rules and architecture decisions in the project's
shared sources, accessible without Chief activation; do not copy them here.
Do not rewrite an accepted decision silently; append a superseding decision
and link the old entry.

| ID | Date | Status | Decision | Authority | Supersedes |
| --- | --- | --- | --- | --- | --- |
| D1 | 2026-11-21 | accepted | LLM = Gemini API `gemini-3.8-flash-high`; Qwen3 14B dropped entirely (no baseline) | Dylan | README §3.1 (Qwen3 via Ollama) |
| D2 | 2026-11-21 | accepted | Dataset = Kaggle only, reduced test set; Hugging Face D1 dropped | Dylan | thesis §4.1.1 D1 |
| D3 | 2026-11-21 | accepted | English first; Vietnamese deferred | Dylan | — |
| D4 | 2026-11-21 | accepted | Rebuild code from scratch; do not restore `apps/` from git history | Dylan | — |
| D5 | 2026-11-21 | accepted | API usage unrestricted (Dylan has access) | Dylan | — |
| D6 | 2026-11-21 | accepted | First experiment run uses 10 CV × 2 JD from the Kaggle eval set | Dylan | thesis §4.1.2 (20 × 2) |
| D7 | 2026-11-21 | accepted | Order M0→M1→M2→M3 first; SaaS platform (M4) decided after M3 | Dylan ("làm theo đề xuất") | — |
| D8 | 2026-11-21 | accepted | Translate JD-A/JD-B criteria to English; rewrite data/eval/GUIDELINES.md | Dylan ("làm theo đề xuất") | — |
| D9 | 2026-11-21 | accepted | Lewis may create worker branches/worktrees and merge reviewed work into main; ask Dylan before other commits/push | Dylan ("làm theo đề xuất") | — |
| D10 | 2026-11-21 | accepted | JD-B `labor_law` → general "employment law" (code `employment_law`) | Dylan | T0.3 JD-B translation |
| D11 | 2026-11-21 | accepted | Criterion weights set by Lewis (JD-A 25/25/15/15/10/10; JD-B 30/20/15/10/15/10), illustrative, not calibrated | Dylan delegated ("bạn tự đặt") | weight: null |
| D12 | 2026-11-21 | accepted | BM25 keyword lists from T0.3 accepted as-is (plus employment-law update) | Dylan | — |
| D13 | 2026-11-21 | accepted | Start M1 | Dylan | — |

Statuses: `proposed`, `accepted`, `superseded`, or `rejected`.
