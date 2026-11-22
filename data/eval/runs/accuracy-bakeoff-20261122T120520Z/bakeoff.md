# T5.3 model/config bake-off

All v2 runs used screening-v2, retrieved context, lexical retrieval k=5, concurrency 1 on the 20 CV×JD pairs (10 CVs × 2 JDs). The v1 reference is the supplied prompt-v1 run. Latencies were measured at different times on a shared gateway, so treat them as noisy rather than a controlled head-to-head speed test.

## Results

Accuracy intervals are the pair-bootstrap 95% CIs written by `evaluate.py` (2,000 resamples). Exact κ is nominal six-class Cohen κ; collapsed κ maps strong/adequate/partial to evidence; absent recall is the fraction of silver-labelled absent criteria predicted absent.

| Model | Success | p50 / p95 / max (s) | ≤40 s | Mean output tokens | Quote verification | Exact κ (95% CI) | Collapsed κ (95% CI) | Evidence F1 (95% CI) | Fit accuracy (95% CI) | Absent recall |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| v1 baseline (flash-high) | 20/20 | 61.5 / 103.8 / 109.1 | 2 | 1057.6 | 0.942 | 0.522 [0.427, 0.594] | 0.664 [0.562, 0.746] | 0.933 [0.884, 0.970] | 0.900 [0.750, 1.000] | 0.000 |
| Gemini 3.8 Flash high | 20/20 | 82.5 / 156.6 / 320.5 | 3 | 914.6 | 0.948 | 0.588 [0.476, 0.691] | 0.682 [0.559, 0.791] | 0.852 [0.753, 0.928] | 0.900 [0.750, 1.000] | 1.000 |
| Gemini 3.8 Flash medium | 20/20 | 52.2 / 119.1 / 261.8 | 8 | 886.0 | 0.852 | 0.545 [0.441, 0.642] | 0.607 [0.476, 0.715] | 0.784 [0.659, 0.874] | 0.900 [0.750, 1.000] | 1.000 |
| Gemini 3.8 Flash low | 20/20 | 7.2 / 26.5 / 53.7 | 19 | 626.9 | 0.942 | 0.636 [0.511, 0.745] | 0.711 [0.582, 0.828] | 0.844 [0.747, 0.925] | 0.950 [0.850, 1.000] | 1.000 |
| Gemini 4 Argon low | 20/20 | 92.0 / 187.0 / 459.7 | 4 | 662.0 | 1.000 | 0.628 [0.498, 0.740] | 0.725 [0.583, 0.839] | 0.922 [0.860, 0.964] | 0.850 [0.700, 1.000] | 1.000 |
| Gemini 4 Argon medium | 20/20 | 11.2 / 75.2 / 102.8 | 18 | 637.4 | 0.994 | 0.610 [0.482, 0.727] | 0.705 [0.564, 0.824] | 0.912 [0.845, 0.957] | 0.850 [0.700, 1.000] | 1.000 |
| DeepSeek V4 Flash | 20/20 | 20.3 / 48.7 / 51.3 | 17 | 5509.9 | 0.876 | 0.529 [0.412, 0.638] | 0.631 [0.482, 0.766] | 0.852 [0.732, 0.929] | 0.850 [0.700, 1.000] | 1.000 |
| GLM 5.3 Flash | 0/1 smoke; skipped | — | — | — | — | — | — | — | — | — |

GLM 5.3 Flash smoke failed with `LLMProviderError` (gateway server error), so no full run or accuracy evaluation was attempted. All other candidates completed 20/20; Gemini 3.8 Flash high needed the prescribed single resume after one timeout failure, then completed 20/20.

## Recommendation

Choose **Gemini 3.8 Flash low** for this configuration. It is the only completed v2 candidate meeting the requested p95 ≤40 s screen, and it has the highest collapsed κ among eligible configurations (0.711; 95% CI 0.582–0.828). It screened 19/20 pairs in ≤40 s (p95 26.5 s; max 53.7 s), and also had the highest exact κ (0.636) among completed v2 candidates. The nearest quality/latency alternative by collapsed κ is Gemini 4 Argon low (0.725), but its p95 is 187.0 s; it would need a 147.0 s p95 reduction to meet the target. Gemini 3.8 Flash medium is the next closest to the latency target at p95 119.1 s, requiring a 79.1 s reduction, but has lower collapsed κ (0.607).

Runs happened at different times on a shared gateway, so latency has substantial noise. These dev-set accuracy results are for configuration selection only and are not the final reported result.

## Commands

Each smoke used `uv run --directory apps/ai-service python -m app.experiments.run` with `--eval-set ../../data/eval/set-10x2.yaml --jd-ids jd-py-real jd-hr-real --model <candidate> --prompt-version screening-v2 --context-mode retrieved --retrieval-mode lexical --retrieval-k 5 --concurrency 1 --limit 1 --output-dir <run-dir>`. Successful smokes were followed by the same command without `--limit 1`; the same output directory was resumed once for runs with failures.

Offline evaluation command:

```sh
uv run --directory apps/ai-service python -m app.experiments.evaluate \
  --labels ../../data/eval/labels-silver/final \
  --runs ../../data/eval/runs/20261122T054842Z-real-lexical-high-c1 \
    ../../data/eval/runs/20261122T083536Z-v2-lexical-gemini-3-8-flash-high-c1 \
    ../../data/eval/runs/20261122T083536Z-v2-lexical-gemini-3-8-flash-medium-c1 \
    ../../data/eval/runs/20261122T083536Z-v2-lexical-gemini-3-8-flash-low-c1 \
    ../../data/eval/runs/20261122T083536Z-v2-lexical-gemini-4-argon-low-c1 \
    ../../data/eval/runs/20261122T083536Z-v2-lexical-gemini-4-argon-medium-c1 \
    ../../data/eval/runs/20261122T083536Z-v2-lexical-deepseek-v4-flash-c1 \
  --output-dir ../../data/eval/runs/accuracy-bakeoff-20261122T120520Z
```

Evaluation detail and confidence intervals are in `metrics.json` and `report.md` in this directory.
