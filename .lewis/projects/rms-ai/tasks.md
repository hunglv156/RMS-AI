---
updated: 2026-11-21
source_of_truth: repository workflow or linked external tracker
---

# Active Tasks

Keep only the current working set here. Link external tracker records when they
are authoritative.

| ID | Task | Status | Priority | Owner | Source |
| --- | --- | --- | --- | --- | --- |
| T0.3b | Eval follow-up: employment_law, weights, guideline nits (DATA) | in-progress | high | codex/gpt-6-luna medium | task_532bca899e94, ctx_ed1ee9c4ec8c, main worktree |
| T1.1 | LLMProvider + GeminiProvider (AI) | in-progress | high | codex/gpt-6.1-terra medium (Chief choice before routing; route checked after) | task_08480c909d7a, ctx_27b76defe9f9, worktree m1-llm |
| T1.3 | Scoring + quote verification (AI) | next | high | — | queued: codex capacity 2 |
| T1.2 | OCR + normalization (AI) | next | high | — | queued |
| T1.4 | Chunking + bge-m3 + BM25/RRF (AI) | next | high | — | queued |
| T0.4 | Nits: root lockfile + .ruff_cache (INFRA); version fallback + config tests (AI) | next | low | — | queued |
| T0.1 | Monorepo skeleton + docker-compose (INFRA) | done (review PASS; merged e3e567d; open: RustFS bucket not auto-created → API T4.3) | high | codex/gpt-6-luna medium (Jev ok) | task_6bf3106ef7b6, ctx_30b6c2c331f4, worktree m0-infra (new-child from main) |
| T0.3 | Eval set 10 CV x 2 JD, English JDs, GUIDELINES, label templates (DATA) | done (review PASS, uncommitted in main worktree; open Qs: weights, keywords, labor_law; 2 non-blocking GUIDELINES nits) | high | codex/gpt-6.1-terra high (Chief choice: Jev unsure; ground-truth protocol, costly mistakes) | task_fab66f139d79, ctx_bb3c79bc0c71, main worktree |
| T0.2 | AI service skeleton (AI) | done (review PASS; merged 42290db; nits: root pnpm lockfile, .ruff_cache ignore, version fallback, more config tests) | high | codex/gpt-6-luna medium (Jev ok) | task_7e89876d19ce, ctx_de6e9ad368c3, worktree m0-ai |
| rms-readme-gemini | Update README for Gemini rebuild (D1–D6) | done (accepted; review PASS after 1 fix round; uncommitted) | high | codex/gpt-6-luna medium (Jev 0.88) | Orca run_6f8f7d56ebc8, task_f68a52c91b46, ctx_7ab57b9086f1; pre-start README blob 737cf08 |

Statuses: `next`, `in-progress`, `waiting`, `done`, or `cancelled`. Remove
completed and cancelled rows after current state and handoff are updated.
