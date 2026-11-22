---
updated: 2026-11-22
from: Lewis
to: next session
---

# Handoff

## Resume From

- M4 (real JDs, silver labels, accuracy) complete on local `main` `b300840`. Orca Run `run_bcb6ee23b3af`. Awaiting Dylan: screening-v2 prompt (absent rule) with held-out check?, production model choice, push.

## Next Actions

1. Ask Dylan for M3 scope (candidates: latency investigation, human labelling of 40 sheets, retrieved-mode run, thesis update).
2. Investigate python_dev-02 × JD-B scoring 64.4 at coverage 0.8 if Dylan asks.

## Watch Outs

- `origin/main` is stale (`e4d47fe`); create worktrees with `--base-branch main` or reset them.
- Gateway secrets live only in root `.env`; never copy them.
- Reviewer terminal `ctx_c6758943d72a` was kept open by Dylan; do not release it.
