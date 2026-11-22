---
updated: 2026-11-22
phase: thesis-writing
health: unknown
---

# Current State

## Summary

- Thesis draft (`docs/Hung25MSA13250_MSA32HN_.docx`) has Chapters 1–4 and references; Chapter 4 reports Experiments 1–5 on a local Qwen3 14B pipeline.
- Product/technical context lives in `docs/README_AI_RECRUITMENT.md` (Vietnamese).
- M0–M2 done on local `main` (`cd7d38c`, not pushed; origin/main still `e4d47fe`, so new worktrees need `--base-branch main`). ai-service: extraction, retrieval, scoring, Gemini + OpenAI-compatible providers, screening pipeline, experiment runner; 137 tests pass.
- Live 10×2 runs: 30 s timeout → 6/20 ok; 180 s timeout (`20261121T153755Z-full-t180`) → 20/20 ok, latency p50 76 s / p95 267 s (1 pair ≤ 40 s), quotes 131/140 verified, 6 pairs scored (all in expected group except python_dev-02 × JD-B).

## Recent Evidence

- Thesis 4.3.3: every end-to-end acceptance criterion met except latency (≤ 40 s missed; median 44–53 s).
- Thesis 4.1.2: 40 annotation sheets exist but none labelled.

## Next Milestone

- Unknown; not stated by Dylan.

## Risks And Blockers

- README updated 2026-11-21 for D1–D6 (uncommitted); thesis .docx still describes Qwen3/local and D1 dataset.
- No human labels, so no accuracy, retrieval or F1 metrics.

## M3 Evidence (2026-11-22)

- `main` `cdb072d` (not pushed). Latency study (`comparison-latency-20261121T185747Z`): flash-high c1 p50 44 s (7/20 ≤ 40 s), medium 22 s (20/20, verification 76%), low 7 s (20/20, verification 86%); concurrency 4 inflated high to p50 76 s.
- Retrieved mode (`comparison-retrieval-20261121T193406Z`, high c1): lexical context −39%, p50 36 s, verification 99%, state agreement 20/20; dense/hybrid worse on context reduction.
- Open: Dylan to choose production config (D1); labels still empty.
- Silver labels (2026-11-22, 140 criterion pairs): level agreement 0.71, κ 0.58; merging absent+unknown κ 0.76; evidence-vs-none κ 0.91; overall_fit κ 0.12. Main disagreement: 20× Claude absent vs GPT unknown; GPT never uses poor.

## M4 Evidence (2026-11-22)

- `main` `b300840` (not pushed). Real JDs jd-py-real/jd-hr-real; silver labels raw (claude, gpt) + adjudicated final (GUIDELINES v1.1).
- Accuracy vs final silver labels (`accuracy-real-jds-20261122T075133Z`), high/medium lexical c1: exact acc .67/.68, κ .52/.53, collapsed κ .66/.62, evidence F1 .93/.90, fit acc .90/.90. Main errors: absent→unknown (system almost never outputs absent), adequate→partial.
- Latency on real JDs: high p50 61 s, medium 43 s (shared gateway; not comparable with earlier runs).
