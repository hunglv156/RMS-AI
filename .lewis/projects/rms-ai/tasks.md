---
updated: 2026-11-21
source_of_truth: repository workflow or linked external tracker
---

# Active Tasks

Keep only the current working set here. Link external tracker records when they
are authoritative.

| ID | Task | Status | Priority | Owner | Source |
| --- | --- | --- | --- | --- | --- |
| T0.3b | Eval follow-up (DATA) | done (review PASS; committed) | high | codex/gpt-6-luna medium | task_532bca899e94, ctx_ed1ee9c4ec8c, main worktree |
| T1.1 | LLMProvider + GeminiProvider (AI) | done (review PASS + fixes; merged; live smoke test pending GEMINI_API_KEY) | high | codex/gpt-6.1-terra medium (Chief choice before routing; route checked after) | task_08480c909d7a, ctx_27b76defe9f9, worktree m1-llm |
| T1.3 | Scoring + quote verification (AI) | done (review PASS + 4 non-blocking fixes; merged 9c9f7b9) | high | codex/gpt-6-luna medium (Chief choice on needs_chief: bounded, fully specified) | worktree m1-scoring |
| T1.2 | OCR + normalization (AI) | done (review PASS + 2 fixes; merged; eval must use stored texts as canonical) | high | codex/gpt-6.1-sol medium (Jev ok) | worktree m1-extract |
| T1.4 | Chunking + bge-m3 + BM25/RRF (AI) | done (review PASS; merged d5825a5; nits skipped: keywords .get, CUDA) | high | codex/gpt-6.1-sol medium (Jev ok) | worktree m1-retrieval |
| T0.4 | INFRA nits: root lockfile + .ruff_cache | done (review PASS; merged) | low | codex/gpt-6-luna medium (Jev ok) | worktree m0-nits |
| T0.5 | AI nits: Python 3.13 pin, version fallback, config tests | done (re-review PASS; merged) | medium | codex/gpt-6-luna medium | worktree m0-ai-nits |
| T0.1 | Monorepo skeleton + docker-compose (INFRA) | done (review PASS; merged e3e567d; open: RustFS bucket not auto-created → API T4.3) | high | codex/gpt-6-luna medium (Jev ok) | task_6bf3106ef7b6, ctx_30b6c2c331f4, worktree m0-infra (new-child from main) |
| T0.3 | Eval set 10 CV x 2 JD (DATA) | done (committed with T0.3b) | high | codex/gpt-6.1-terra high (Chief choice: Jev unsure; ground-truth protocol, costly mistakes) | task_fab66f139d79, ctx_bb3c79bc0c71, main worktree |
| T0.2 | AI service skeleton (AI) | done (review PASS; merged 42290db; nits: root pnpm lockfile, .ruff_cache ignore, version fallback, more config tests) | high | codex/gpt-6-luna medium (Jev ok) | task_7e89876d19ce, ctx_de6e9ad368c3, worktree m0-ai |
| rms-readme-gemini | Update README for Gemini rebuild (D1–D6) | done (accepted; review PASS after 1 fix round; uncommitted) | high | codex/gpt-6-luna medium (Jev 0.88) | Orca run_6f8f7d56ebc8, task_f68a52c91b46, ctx_7ab57b9086f1; pre-start README blob 737cf08 |

Statuses: `next`, `in-progress`, `waiting`, `done`, or `cancelled`. Remove
completed and cancelled rows after current state and handoff are updated.
