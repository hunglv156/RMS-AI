# Latency comparison (not accuracy)

Diagnostics only, not accuracy: no human labels exist. Coverage, quote verification, agreement and known-only scores do not establish correctness.

Latency population: successful pairs; includes provider retries, excludes local semaphore queue and persistence. Token totals cover successful calls only; failed attempts may be unreported. Missing measurements remain null.

| Run | Success | p50 s | p95 s | Max s | ≤40 s | Input tokens | Output tokens | Reasoning tokens | Quote verification | Mean coverage | State agreement | Known-only MAD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 20261121T153755Z-full-t180 | 20/20 | 76.380 | 266.519 | 290.177 | 1 | 198341 | 15874 | null | 0.936 | 0.458 | 1 | 0.000 |
| 20261121T185747Z-full-high-c1 | 20/20 | 43.651 | 82.525 | 129.424 | 7 | 184509 | 16326 | null | 0.959 | 0.478 | 1 | 2.587 |
| 20261121T185747Z-full-medium-c1 | 20/20 | 22.072 | 33.975 | 39.097 | 20 | 117536 | 14786 | null | 0.762 | 0.388 | 0.900 | 1.817 |
| 20261121T185747Z-full-low-c1 | 20/20 | 6.723 | 8.577 | 8.960 | 20 | 88454 | 11848 | null | 0.855 | 0.432 | 0.950 | 6.704 |

## 20261121T153755Z-full-t180 versus baseline (not accuracy)

Prompt characters: {"mean": null, "min": null, "max": null, "measured_pairs": 0, "definition": "pipeline system + user characters; excludes provider-added schema/formatting"}
Score-state agreement: {"count": 20, "compared": 20, "rate": 1}
Known-only diagnostic: {"both_known_pairs": 19, "mean_absolute_difference": 0.0}

| CV | JD | Both succeeded | Coverage delta | State agrees | Known-only absolute difference |
| --- | --- | --- | --- | --- | --- |
| database-01 | jd-a | True | 0.000 | True | 0.000 |
| database-01 | jd-b | True | 0.000 | True | 0.000 |
| designer-01 | jd-a | True | 0.000 | True | 0.000 |
| designer-01 | jd-b | True | 0.000 | True | 0.000 |
| devops-01 | jd-a | True | 0.000 | True | 0.000 |
| devops-01 | jd-b | True | 0.000 | True | 0.000 |
| finance-01 | jd-a | True | 0.000 | True | null |
| finance-01 | jd-b | True | 0.000 | True | 0.000 |
| hr-01 | jd-a | True | 0.000 | True | 0.000 |
| hr-01 | jd-b | True | 0.000 | True | 0.000 |
| hr-02 | jd-a | True | 0.000 | True | 0.000 |
| hr-02 | jd-b | True | 0.000 | True | 0.000 |
| hr-03 | jd-a | True | 0.000 | True | 0.000 |
| hr-03 | jd-b | True | 0.000 | True | 0.000 |
| python_dev-01 | jd-a | True | 0.000 | True | 0.000 |
| python_dev-01 | jd-b | True | 0.000 | True | 0.000 |
| python_dev-02 | jd-a | True | 0.000 | True | 0.000 |
| python_dev-02 | jd-b | True | 0.000 | True | 0.000 |
| python_dev-03 | jd-a | True | 0.000 | True | 0.000 |
| python_dev-03 | jd-b | True | 0.000 | True | 0.000 |

## 20261121T185747Z-full-high-c1 versus baseline (not accuracy)

Prompt characters: {"mean": 9220.9, "min": 4446, "max": 15291, "measured_pairs": 20, "definition": "pipeline system + user characters; excludes provider-added schema/formatting"}
Score-state agreement: {"count": 20, "compared": 20, "rate": 1}
Known-only diagnostic: {"both_known_pairs": 19, "mean_absolute_difference": 2.5873684210526315}

| CV | JD | Both succeeded | Coverage delta | State agrees | Known-only absolute difference |
| --- | --- | --- | --- | --- | --- |
| database-01 | jd-a | True | 0.100 | True | 3.430 |
| database-01 | jd-b | True | 0.000 | True | 0.000 |
| designer-01 | jd-a | True | 0.000 | True | 0.000 |
| designer-01 | jd-b | True | 0.000 | True | 0.000 |
| devops-01 | jd-a | True | 0.000 | True | 0.000 |
| devops-01 | jd-b | True | 0.000 | True | 0.000 |
| finance-01 | jd-a | True | 0.100 | True | null |
| finance-01 | jd-b | True | 0.000 | True | 0.000 |
| hr-01 | jd-a | True | 0.100 | True | 0.000 |
| hr-01 | jd-b | True | 0.000 | True | 11.660 |
| hr-02 | jd-a | True | 0.000 | True | 0.000 |
| hr-02 | jd-b | True | 0.000 | True | 0.000 |
| hr-03 | jd-a | True | 0.100 | True | 15.000 |
| hr-03 | jd-b | True | 0.000 | True | 10.500 |
| python_dev-01 | jd-a | True | 0.000 | True | 0.000 |
| python_dev-01 | jd-b | True | 0.000 | True | 0.000 |
| python_dev-02 | jd-a | True | 0.000 | True | 8.570 |
| python_dev-02 | jd-b | True | 0.000 | True | 0.000 |
| python_dev-03 | jd-a | True | 0.000 | True | 0.000 |
| python_dev-03 | jd-b | True | 0.000 | True | 0.000 |

## 20261121T185747Z-full-medium-c1 versus baseline (not accuracy)

Prompt characters: {"mean": 9220.9, "min": 4446, "max": 15291, "measured_pairs": 20, "definition": "pipeline system + user characters; excludes provider-added schema/formatting"}
Score-state agreement: {"count": 18, "compared": 20, "rate": 0.9}
Known-only diagnostic: {"both_known_pairs": 18, "mean_absolute_difference": 1.8166666666666664}

| CV | JD | Both succeeded | Coverage delta | State agrees | Known-only absolute difference |
| --- | --- | --- | --- | --- | --- |
| database-01 | jd-a | True | 0.100 | True | 3.430 |
| database-01 | jd-b | True | 0.000 | True | 0.000 |
| designer-01 | jd-a | True | 0.000 | True | 0.000 |
| designer-01 | jd-b | True | 0.000 | True | 0.000 |
| devops-01 | jd-a | True | -0.100 | True | 1.230 |
| devops-01 | jd-b | True | 0.000 | True | 0.000 |
| finance-01 | jd-a | True | 0.000 | True | null |
| finance-01 | jd-b | True | -0.400 | True | 0.000 |
| hr-01 | jd-a | True | 0.000 | True | 0.000 |
| hr-01 | jd-b | True | 0.000 | True | 6.660 |
| hr-02 | jd-a | True | 0.000 | True | 0.000 |
| hr-02 | jd-b | True | 0.000 | True | 0.000 |
| hr-03 | jd-a | True | 0.000 | True | 0.000 |
| hr-03 | jd-b | True | 0.000 | True | 16.500 |
| python_dev-01 | jd-a | True | -0.250 | False | 3.000 |
| python_dev-01 | jd-b | True | 0.000 | True | 0.000 |
| python_dev-02 | jd-a | True | -0.350 | True | null |
| python_dev-02 | jd-b | True | -0.400 | False | 1.880 |
| python_dev-03 | jd-a | True | 0.000 | True | 0.000 |
| python_dev-03 | jd-b | True | 0.000 | True | 0.000 |

## 20261121T185747Z-full-low-c1 versus baseline (not accuracy)

Prompt characters: {"mean": 9220.9, "min": 4446, "max": 15291, "measured_pairs": 20, "definition": "pipeline system + user characters; excludes provider-added schema/formatting"}
Score-state agreement: {"count": 19, "compared": 20, "rate": 0.95}
Known-only diagnostic: {"both_known_pairs": 18, "mean_absolute_difference": 6.703888888888889}

| CV | JD | Both succeeded | Coverage delta | State agrees | Known-only absolute difference |
| --- | --- | --- | --- | --- | --- |
| database-01 | jd-a | True | 0.100 | True | 3.430 |
| database-01 | jd-b | True | 0.000 | True | 4.620 |
| designer-01 | jd-a | True | 0.000 | True | 0.000 |
| designer-01 | jd-b | True | 0.000 | True | 0.000 |
| devops-01 | jd-a | True | 0.000 | True | 0.000 |
| devops-01 | jd-b | True | 0.000 | True | 0.000 |
| finance-01 | jd-a | True | 0.100 | True | null |
| finance-01 | jd-b | True | 0.000 | True | 10.910 |
| hr-01 | jd-a | True | 0.000 | True | 30.000 |
| hr-01 | jd-b | True | 0.000 | True | 11.660 |
| hr-02 | jd-a | True | 0.000 | True | 0.000 |
| hr-02 | jd-b | True | -0.100 | True | 2.670 |
| hr-03 | jd-a | True | 0.000 | True | 0.000 |
| hr-03 | jd-b | True | 0.000 | True | 15.000 |
| python_dev-01 | jd-a | True | -0.250 | False | 3.000 |
| python_dev-01 | jd-b | True | 0.000 | True | 30.000 |
| python_dev-02 | jd-a | True | -0.350 | True | null |
| python_dev-02 | jd-b | True | 0.000 | True | 9.380 |
| python_dev-03 | jd-a | True | 0.000 | True | 0.000 |
| python_dev-03 | jd-b | True | 0.000 | True | 0.000 |

## Study interpretation (not accuracy)

All A–C runs completed 20/20 on the first invocation, with zero remaining failures and no resume needed. They ran sequentially at concurrency one, with full context, timeout 180 s, maximum two retries, temperature zero, and no prompt or criteria changes. All 60 successful calls reported one provider attempt. The baseline had 18 one-attempt calls and two two-attempt calls; those two were the 265.3 s and 290.2 s tail observations. The recorded pair latency excludes the runner's local semaphore waiting time, but includes the provider's call, backoff and retries.

- **Concurrency / gateway queueing:** high/c1 improved p50 from 76.4 to 43.7 s and p95 from 266.5 to 82.5 s, and 17/20 matched pairs were faster (mean paired latency change −46.2 s). This is consistent with lower contention and fewer retries, but does not prove gateway queueing caused the original latency: the baseline was earlier, there is no gateway queue telemetry, and the baseline's two retries inflate its tail. High/c1 still had a single-attempt 129.4 s call and only 7/20 pairs within 40 s, so concurrency four is not necessary for slow calls.
- **Requested reasoning level:** at concurrency one, medium reached 20/20 within 40 s (p50 22.1 s, max 39.1 s), while low reached 20/20 within 40 s with substantially more margin (p50 6.7 s, max 9.0 s). Corresponding system+user prompt lengths are identical across all three new runs. Requested level is therefore strongly associated with the largest observed speed improvement without shortening the prompt. These are sequential, unreplicated runs, so temporal gateway load remains a confound; every run reports the same gateway model string `gemini-3.8-flash-n`, and reasoning tokens are unavailable, preventing verification of the actual internal reasoning budget.
- **Prompt size:** system+user text spans 4,446–15,291 Unicode characters (mean 9,220.9), excluding provider-added schema/formatting. Descriptive Pearson correlations of prompt characters with latency across the 20 pairs are high 0.088, medium 0.486, low −0.074. This does not support prompt size as the sole or dominant explanation in these runs, but it does not measure the effect of shortening a fixed prompt: content, JD and response differ across pairs, and no prompt-size intervention was authorized. Gateway-reported input token totals also vary across levels despite identical prompt text; they should not be treated as a clean measure of prompt size or used to infer missing reasoning tokens.

**Diagnostic trade-off, not accuracy:** high/c1 preserves all 20 score states versus baseline, improves quote verification to 142/148 (95.9%), and has mean coverage 47.8% versus baseline 45.8%; its known-only score MAD is 2.59 points over 19 pairs known in both. Medium has quote verification 99/130 (76.2%), mean coverage 38.8%, score-state agreement 18/20, and known-only MAD 1.82 over 18 pairs known in both. Low has quote verification 118/138 (85.5%), mean coverage 43.2%, score-state agreement 19/20, and known-only MAD 6.70 over 18 pairs known in both. Coverage changes for every pair are above and in comparison.json. Quote verification checks source-text support, not semantic correctness; known-only scores can also compare different sets of known criteria, and a small MAD is not evidence of accuracy.

**Decision:** medium and low both met the latency target on this sample; low offers the largest latency margin and better coverage/quote verification than medium here, but larger known-only score drift from the baseline. High/c1 retains the strongest diagnostic agreement and evidence verification, while failing the ≤40 s target for 13/20 pairs. Low is a candidate for a human-labeled evaluation, rather than a validated replacement: no option's accuracy or deployment suitability can be established from these diagnostics alone. Repeated counterbalanced concurrency/level runs and gateway telemetry would be needed for stronger queueing/reasoning attribution; a controlled prompt-size experiment would be needed to quantify size effects.

## Implementation and validation

Changed source files:

- `apps/ai-service/app/experiments/run.py`: run-local `--model` override using copied settings; requested model participates in resume identity; per-pair input/output/reasoning tokens and system+user character length via an observation wrapper, including nulls on unavailable metadata.
- `apps/ai-service/app/experiments/compare.py`: baseline-first comparison CLI, aggregate diagnostics and per-pair coverage/state/known-only differences, explicitly labeled not accuracy; reads input runs without rewriting them.
- `apps/ai-service/tests/experiments/test_run.py`: fake-provider model override, resume mismatch, measurements, comparison fixture math, failed/missing pairs and input preservation coverage.

Validation from `apps/ai-service`:

- `uv run pytest`: **141 passed, 3 skipped**, five existing SWIG deprecation warnings.
- `uv run ruff check .`: **All checks passed**.
- `uv run ruff format --check .`: **46 files already formatted**.
- `git diff --check`: **passed**.

Live commands (environment sourced from the authorized `/Users/hung/Study/RMS-AI/.env` without printing its contents):

```sh
uv run python -m app.experiments.run --eval-set ../../data/eval/set-10x2.yaml --context-mode full --concurrency 1 --model ag/gemini-3.8-flash-high --output-dir ../../data/eval/runs/20261121T185747Z-full-high-c1
uv run python -m app.experiments.run --eval-set ../../data/eval/set-10x2.yaml --context-mode full --concurrency 1 --model ag/gemini-3.8-flash-medium --output-dir ../../data/eval/runs/20261121T185747Z-full-medium-c1
uv run python -m app.experiments.run --eval-set ../../data/eval/set-10x2.yaml --context-mode full --concurrency 1 --model ag/gemini-3.8-flash-low --output-dir ../../data/eval/runs/20261121T185747Z-full-low-c1
uv run python -m app.experiments.compare ../../data/eval/runs/20261121T153755Z-full-t180 ../../data/eval/runs/20261121T185747Z-full-high-c1 ../../data/eval/runs/20261121T185747Z-full-medium-c1 ../../data/eval/runs/20261121T185747Z-full-low-c1 --output-dir ../../data/eval/runs/comparison-latency-20261121T185747Z
```

All four commands exited zero. Each new run directory contains manifest.json, 20 pair JSON records, summary.json, summary.md and execution.log; this comparison directory contains comparison.md and comparison.json. No existing run directory, provider, pipeline, environment file or criteria was modified, and nothing was committed. Directory timestamps use the execution host's UTC clock.
