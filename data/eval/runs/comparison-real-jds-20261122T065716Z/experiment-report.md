# T4.4 — Real JD experiment results

Diagnostics only, not accuracy. Expected groups are not ground truth; no accuracy claim is made. All 20 pairs succeeded in both runs, so no resume was needed.

## Commands

From `apps/ai-service`, with environment loaded without printing it:

```sh
set -a; . /Users/hung/Study/RMS-AI/.env; set +a
uv run python -m app.experiments.run --eval-set ../../data/eval/set-10x2.yaml --jd-ids jd-py-real jd-hr-real --context-mode retrieved --retrieval-mode lexical --retrieval-k 5 --concurrency 1 --output-dir ../../data/eval/runs/20261122T054842Z-real-lexical-high-c1 --model ag/gemini-3.8-flash-high
uv run python -m app.experiments.run --eval-set ../../data/eval/set-10x2.yaml --jd-ids jd-py-real jd-hr-real --context-mode retrieved --retrieval-mode lexical --retrieval-k 5 --concurrency 1 --output-dir ../../data/eval/runs/20261122T061003Z-real-lexical-medium-c1 --model ag/gemini-3.8-flash-medium
uv run python -m app.experiments.compare --output-dir ../../data/eval/runs/comparison-real-jds-20261122T065716Z ../../data/eval/runs/20261122T054842Z-real-lexical-high-c1 ../../data/eval/runs/20261122T061003Z-real-lexical-medium-c1
```

## Run summary

Latency is per successful pair and excludes queue and persistence time. Token counts cover successful calls. Quote verification is valid/total; mean coverage averages successful pairs with coverage. “Scored” means published score is non-null.

| Run | Success | p50 s | p95 s | max s | ≤40 s | Input tokens | Output tokens | Quote verification | Mean coverage | Scored pairs |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 20261122T054842Z-real-lexical-high-c1 | 20/20 | 61.49 | 103.79 | 109.10 | 2 | 199625 | 21152 | 147/156 (94.2%) | 0.375 | 4/20 |
| 20261122T061003Z-real-lexical-medium-c1 | 20/20 | 43.29 | 99.10 | 225.19 | 10 | 118690 | 19695 | 119/141 (84.4%) | 0.325 | 4/20 |

### Latency comparability

Runs use a shared LLM gateway, so latency depends on gateway load at run time. These 2026-11-22 runs on the real JDs `jd-py-real` and `jd-hr-real` are not directly comparable with earlier runs on `jd-a` and `jd-b` (for example, `data/eval/runs/20261121T193406Z-retrieved-lexical-high-c1/`, p50 ≈ 36 s): both the JDs, which have longer and more detailed criteria, and the time and gateway load differ. A like-for-like latency comparison requires running both JD sets in the same session.

## Run 1 per-pair results

| CV | JD | Score | Coverage | Known-only score | Expected group |
|---|---|---:|---:|---:|---|
| python_dev-01 | jd-py-real | 63.33 | 0.9 | 63.33 | match_A |
| python_dev-01 | jd-hr-real | — | 0.2 | 40.0 | match_A |
| python_dev-02 | jd-py-real | — | 0.1 | 40.0 | match_A |
| python_dev-02 | jd-hr-real | — | 0.6 | 50.0 | match_A |
| python_dev-03 | jd-py-real | — | 0.65 | 42.31 | match_A |
| python_dev-03 | jd-hr-real | — | 0.2 | 40.0 | match_A |
| devops-01 | jd-py-real | — | 0.4 | 51.25 | partial_A |
| devops-01 | jd-hr-real | — | 0.1 | 40.0 | partial_A |
| database-01 | jd-py-real | — | 0.3 | 50.0 | partial_A |
| database-01 | jd-hr-real | — | 0.35 | 48.57 | partial_A |
| hr-01 | jd-py-real | — | 0.1 | 40.0 | match_B |
| hr-01 | jd-hr-real | 61.67 | 0.9 | 61.67 | match_B |
| hr-02 | jd-py-real | — | 0.1 | 40.0 | match_B |
| hr-02 | jd-hr-real | 82.0 | 1.0 | 82.0 | match_B |
| hr-03 | jd-py-real | — | 0.0 | — | match_B |
| hr-03 | jd-hr-real | 61.67 | 0.9 | 61.67 | match_B |
| finance-01 | jd-py-real | — | 0.1 | 40.0 | none |
| finance-01 | jd-hr-real | — | 0.5 | 40.0 | none |
| designer-01 | jd-py-real | — | 0.0 | — | none |
| designer-01 | jd-hr-real | — | 0.1 | 40.0 | none |

## Comparison and observations

Both runs recorded identical score states for all 20 pairs. Mean coverage was 0.375 for high and 0.325 for medium; the comparison reports mean absolute difference 4.35 in known-only scores across 18 pairs where both had a known-only score. High verified 147/156 quotes (94.2%); medium verified 119/141 (84.4%). Medium used fewer reported tokens (118,690 input and 19,695 output versus 199,625 and 21,152) and had lower p50 latency (43.29 s versus 61.49 s), while its maximum latency was higher (225.19 s versus 109.10 s). Only 4/20 pairs in each run had a non-null published score at the 0.8 minimum-coverage threshold; the other pairs have null published scores with known-only diagnostics where available. These are screening diagnostics, not accuracy findings.

## Artifacts

- High run: `data/eval/runs/20261122T054842Z-real-lexical-high-c1/` (manifest, pair records, summary JSON/Markdown).
- Medium run: `data/eval/runs/20261122T061003Z-real-lexical-medium-c1/` (manifest, pair records, summary JSON/Markdown).
- Comparison: `data/eval/runs/comparison-real-jds-20261122T065716Z/comparison.json` and `comparison.md`.
