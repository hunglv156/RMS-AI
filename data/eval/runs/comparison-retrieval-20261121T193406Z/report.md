# T3.2 — Retrieval experiment results

Implemented the retrieval flags, shared production embedder, resume identity checks, and per-pair context measurement; all three sequential retrieval runs completed 20/20 pairs successfully. No failed pairs remained and no resume pass was needed. No changes were committed.

## Changes

- `apps/ai-service/app/experiments/run.py`: added `--retrieval-mode lexical|dense|hybrid` (default lexical) and `--retrieval-k` (default 5); constructs one lazy BGE-M3 embedder for a dense/hybrid run and injects that instance into every pair; stores its model ID in the resume identity alongside the config; records Unicode `cv_context` character length immediately before the provider call, including calls that later fail.
- `apps/ai-service/app/experiments/compare.py`: reports mean context characters, measurement/reconstruction counts, and fractional reduction against the first run; recovers historical full context only from canonical source text whose content hash matches the pair record; never writes into input runs.
- `apps/ai-service/tests/experiments/test_run.py`: tests CLI flags, defaults, invalid k, resume rejection for changed retrieval mode/k/embedding model, one shared FakeEmbedder per run, actual retrieved/full context lengths, Unicode measurement, and comparison reduction/missing/verified historical measurements. Fake providers and embedders avoid model downloads in tests.

## Comparison

All rows contain the same 20 CV/JD pairs. Context reduction = 1 − run mean / baseline mean. Coverage is known criterion weight / total criterion weight. Agreement means the pair-level `scored` versus `insufficient_coverage` state, not agreement on every criterion. Known-only MAD is the mean absolute difference of diagnostic weighted scores over known criteria.

| Mode | Success | p50 s | p95 s | Max s | Mean context chars | Reduction | Mean coverage | Quote verification | State agreement with full | Known-only MAD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Full baseline | 20/20 | 43.65 | 82.52 | 129.42 | 6,253.20 | 0.00% | 47.75% | 142/148 (95.95%) | 20/20 | 0.0000 (20 pairs) |
| Lexical | 20/20 | 35.78 | 81.83 | 99.74 | 3,826.70 | 38.80% | 42.25% | 119/120 (99.17%) | 20/20 | 3.9650 (18 pairs) |
| Dense | 20/20 | 46.85 | 225.32 | 469.37 | 4,995.30 | 20.12% | 44.50% | 130/132 (98.48%) | 19/20 | 3.5365 (20 pairs) |
| Hybrid | 20/20 | 38.78 | 96.04 | 101.48 | 5,492.75 | 12.16% | 45.25% | 131/144 (90.97%) | 19/20 | 2.8025 (20 pairs) |

## What changed

- Lexical: mean context fell 38.80%; observed p50 latency changed -18.02%; mean coverage changed -5.50 percentage points; quote verification changed +3.22 percentage points versus full.
- Dense: mean context fell 20.12%; observed p50 latency changed +7.33%; mean coverage changed -3.25 percentage points; quote verification changed +2.54 percentage points versus full.
- Hybrid: mean context fell 12.16%; observed p50 latency changed -11.16%; mean coverage changed -2.50 percentage points; quote verification changed -4.97 percentage points versus full.

Lexical had the largest context reduction and the lowest observed p50. Dense reduced context but had a higher p50 and a much larger tail: the first pair took 469.37 seconds including the initial model download/load, and `hr-03 / jd-a` used two provider attempts and took 212.48 seconds. Hybrid kept more context than the other retrieved modes and had the closest known-only diagnostic scores to full, but its quote verification was lower (13 `quote_not_found` failures out of 144 quotes, versus 6/148 for full, 1/120 for lexical and 2/132 for dense).

Full and lexical each had 15 insufficient-coverage and 5 scored pairs; dense and hybrid each had 16 insufficient-coverage and 4 scored pairs. High state agreement therefore describes a coarse output-state check. Quote denominators also differ, and verification tests verbatim grounding rather than assessment correctness. These single-pass sequential observations do not isolate provider variability or establish accuracy, recall, or a reliable speedup.

Context was measured for all 20 pairs in every new run. The historical full baseline had no stored context measurement; all 20 lengths were recovered from hash-verified canonical inputs without modifying the baseline. Latency includes text verification, retrieval/embedding and screening (including provider retries), excludes semaphore queue/persistence, and uses linear-interpolated percentiles. Dense includes its cold first download; hybrid reuses the downloaded cache but initializes its own model instance.

Reported input tokens were 184,509 full, 147,243 lexical, 196,296 dense, and 175,600 hybrid; shorter context characters did not consistently mean fewer reported tokens. Reasoning-token measurements were unavailable. All runs requested `ag/gemini-3.8-flash-high` and reported gateway response model `gemini-3.8-flash-n`; this report preserves both names rather than inferring what the gateway served.

## Commands and results

Commands ran from `apps/ai-service` unless noted. The authorized environment file was sourced without printing its contents. Timeout remained 180 seconds with two provider retries, concurrency 1, retrieved context, and k=5 throughout. No prompts, criteria, or k were tuned.

```sh
uv sync --extra embeddings
# Exit 0; installed the optional embedding dependencies.

uv run python -m app.experiments.run --eval-set ../../data/eval/set-10x2.yaml --model ag/gemini-3.8-flash-high --concurrency 1 --context-mode retrieved --retrieval-mode lexical --retrieval-k 5 --output-dir ../../data/eval/runs/20261122T020000Z-retrieved-lexical-high-c1
# Exit 0; 20/20 succeeded. After completion, the new directory and its manifest run_id were renamed to 20261121T193406Z-retrieved-lexical-high-c1 to match the actual UTC start time.

uv run --extra embeddings python -m app.experiments.run --eval-set ../../data/eval/set-10x2.yaml --model ag/gemini-3.8-flash-high --concurrency 1 --context-mode retrieved --retrieval-mode dense --retrieval-k 5 --output-dir ../../data/eval/runs/20261121T193406Z-retrieved-dense-high-c1
# Exit 0; 20/20 succeeded; first use downloaded BAAI/bge-m3 into the Hugging Face cache.

uv run --extra embeddings python -m app.experiments.run --eval-set ../../data/eval/set-10x2.yaml --model ag/gemini-3.8-flash-high --concurrency 1 --context-mode retrieved --retrieval-mode hybrid --retrieval-k 5 --output-dir ../../data/eval/runs/20261121T193406Z-retrieved-hybrid-high-c1
# Exit 0; 20/20 succeeded.

uv run python -m app.experiments.compare ../../data/eval/runs/20261121T185747Z-full-high-c1 ../../data/eval/runs/20261121T193406Z-retrieved-lexical-high-c1 ../../data/eval/runs/20261121T193406Z-retrieved-dense-high-c1 ../../data/eval/runs/20261121T193406Z-retrieved-hybrid-high-c1 --output-dir ../../data/eval/runs/comparison-retrieval-20261121T193406Z
# Exit 0; compared four runs; comparison.json and comparison.md created.

uv run pytest
# Exit 0; 147 passed, 3 skipped, 5 PyMuPDF/SWIG deprecation warnings; 150 collected.
uv run ruff check .
# Exit 0; All checks passed!
uv run ruff format --check .
# Exit 0; 46 files already formatted.
git diff --check
# Exit 0 (repository root).
```

## Outputs and verification

- Full baseline: `data/eval/runs/20261121T185747Z-full-high-c1/` (read-only).
- Lexical: `data/eval/runs/20261121T193406Z-retrieved-lexical-high-c1/`.
- Dense: `data/eval/runs/20261121T193406Z-retrieved-dense-high-c1/`.
- Hybrid: `data/eval/runs/20261121T193406Z-retrieved-hybrid-high-c1/`.
- Comparison: `data/eval/runs/comparison-retrieval-20261121T193406Z/`.
- Every new run has 20 pair records, a finished manifest, summary.json and summary.md; every pair succeeded and has a non-null context length. All input eval/JD hashes and prompt/pipeline versions match the baseline; dense/hybrid record embedding model ID `BAAI/bge-m3` (default revision `main`), lexical records null.
- Remaining work: none for this task. Pipeline, retrieval, embeddings, providers, environment file, and existing run directories were not modified.
