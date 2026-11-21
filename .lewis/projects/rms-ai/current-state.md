---
updated: 2026-11-21
phase: thesis-writing
health: unknown
---

# Current State

## Summary

- Thesis draft (`docs/Hung25MSA13250_MSA32HN_.docx`) has Chapters 1–4 and references; Chapter 4 reports Experiments 1–5 on a local Qwen3 14B pipeline.
- Product/technical context lives in `docs/README_AI_RECRUITMENT.md` (Vietnamese).
- Commit `e4d47fe` deleted `apps/` and `docs/adr/`; only `docs/` and `data/` remain.

## Recent Evidence

- Thesis 4.3.3: every end-to-end acceptance criterion met except latency (≤ 40 s missed; median 44–53 s).
- Thesis 4.1.2: 40 annotation sheets exist but none labelled.

## Next Milestone

- Unknown; not stated by Dylan.

## Risks And Blockers

- README updated 2026-11-21 for D1–D6 (uncommitted); thesis .docx still describes Qwen3/local and D1 dataset.
- No human labels, so no accuracy, retrieval or F1 metrics.
