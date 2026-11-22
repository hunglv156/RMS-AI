# T5.8 — Escalation selection and held-out result

Dev selected `ag/gemini-4-argon-medium` mechanically: A failed the latency gate (16/20 ≤40 s); B passed (18/20) and improved both collapsed κ and evidence F1. The one held-out run succeeded 20/20 without resume, but only 11/20 pairs met 40 s (p95 93.99 s versus historical 33.637 s). On primary labels, collapsed κ decreased while evidence F1 increased; on strict labels both increased, and fit accuracy fell from 1.00 to 0.95 under both variants.

## Procedure

Dev runs A then B were executed strictly sequentially, each on the 20 canonical dev CV×JD pairs. Common flags: `--model ag/gemini-3.8-flash-low --prompt-version screening-v2 --context-mode retrieved --retrieval-mode lexical --retrieval-k 5 --concurrency 1 --hedge-after-s 20`; escalation band fixed at `[0.7, 0.9)`. A requests `ag/gemini-3.8-flash-high`; B requests `ag/gemini-4-argon-medium`. No code, canonical labels, or environment files were changed; no commit was made.

The existing no-escalation dev reference used the same model/prompt/retrieval settings but no hedging. This historical-reference comparison combines escalation with the hedge setting and gateway timing changes; it cannot isolate the escalation effect. Reference: `20261122T083536Z-v2-lexical-gemini-3-8-flash-low-c1`; its earlier offline evaluation is `accuracy-bakeoff-20261122T120520Z`. All three were freshly evaluated offline against dev final labels.

The approved held-out staging YAML was verified byte-identical to canonical before calls: SHA-256 `ce42cfbff2bd031b7d984d272fd3680a483855290917f47e5271edfa20e97a6f`. Provenance hashes and final verification are in the dev evaluation directory.

## Intervals and definitions

Accuracy metrics use unmodified `app.experiments.evaluate` outputs: nominal six-class exact κ; collapsed κ merges strong/adequate/partial into evidence, retains absent, and merges unknown/needs_review; evidence F1 detects binary evidence, not quote overlap; fit accuracy applies guideline rule 5. Accuracy CIs are 95% percentile intervals from 2,000 pair-cluster bootstrap draws with NumPy seed 20261122. Supplemental absent recall and operational intervals use the same seed/draw count; absent draws with zero support are omitted. Success uses a Wilson 95% interval. Count intervals resample totals of 20 pairs. Latency is runner pair latency, including preparation, provider retries, hedging, and both escalation passes, excluding queue/persistence. Percentiles use linear interpolation at (n−1)q. Max/p95 intervals describe the observed sample, not unseen future tails. Escalation reasons can overlap; counts concern triggered pairs, and escalation failures preserve primary results.

## Dev results

| Run | Success [95% CI] | p50 s [CI] | p95 s [CI] | Max s [CI] | ≤40 s [count CI] | Escalations [count CI] | Reasons [count CIs] | Escalation errors |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Reference — no escalation | 20/20 [0.839, 1.000] | 7.214 [6.678, 7.416] | 26.518 [7.606, 53.697] | 53.697 [7.673, 53.697] | 19/20 [17, 20] | 0 [0, 0] | needs_review: 0 [0, 0]; coverage_band: 0 [0, 0] | 0 |
| A — Flash high | 20/20 [0.839, 1.000] | 7.829 [7.135, 20.787] | 173.293 [29.569, 194.945] | 194.945 [56.192, 194.945] | 16/20 [12, 19] | 5 [1, 9] | needs_review: 1 [0, 3]; coverage_band: 5 [1, 9] | 0 |
| B — Argon medium | 20/20 [0.839, 1.000] | 13.759 [6.846, 25.628] | 89.140 [28.679, 91.840] | 91.840 [34.630, 91.840] | 18/20 [15, 20] | 4 [1, 8] | needs_review: 1 [0, 3]; coverage_band: 3 [0, 6] | 0 |

| Run | Exact κ [95% CI] | Collapsed κ [CI] | Evidence F1 [CI] | Fit accuracy [CI] | Absent recall [CI] |
| --- | --- | --- | --- | --- | --- |
| Reference — no escalation | 0.6356 [0.5113, 0.7448] | 0.7107 [0.5816, 0.8280] | 0.8440 [0.7473, 0.9247] | 0.9500 [0.8500, 1.0000] | 20/20 = 1.0000 [1.0000, 1.0000] |
| A — Flash high | 0.6548 [0.5095, 0.7864] | 0.7352 [0.6054, 0.8507] | 0.8829 [0.8000, 0.9461] | 0.9000 [0.7500, 1.0000] | 20/20 = 1.0000 [1.0000, 1.0000] |
| B — Argon medium | 0.6455 [0.5256, 0.7652] | 0.7771 [0.6649, 0.8758] | 0.9217 [0.8706, 0.9635] | 0.9000 [0.7500, 1.0000] | 20/20 = 1.0000 [1.0000, 1.0000] |

## Mechanical selection

Candidates A and B must have 20/20 success, then at least 17/20 pairs <=40 s. Pick higher collapsed kappa; values within 0.01 tie, then higher evidence F1, then lower p95. Use escalation only if the picked candidate strictly improves reference collapsed kappa OR evidence F1. Otherwise no escalation and skip held-out.

- A — Flash high: 20/20 successful; 16/20 ≤40 s; discarded. Collapsed κ=0.73522459; evidence F1=0.88288288; p95=173.293291 s.
- B — Argon medium: 20/20 successful; 18/20 ≤40 s; eligible. Collapsed κ=0.77707006; evidence F1=0.92173913; p95=89.139903 s.

Picked before reference gate: `20261122T162215Z-dev-esc-argonmedium`. Deltas versus reference: collapsed κ +0.06632626; evidence F1 +0.07770243. The reference gate uses strict improvement in at least one of these metrics (logical OR).

**Decision: 20261122T162215Z-dev-esc-argonmedium.**

## One held-out run

The selected configuration was run exactly once on the approved staged 10 held-out CVs × two JDs. No runner resume was needed. Selection was frozen in the dev `selection.json` before this run began; held-out outputs were not used to change the model or band. The new outputs were evaluated offline under primary and strict labels.

Historical no-escalation values below are transcribed from the selected Flash low/v2/hedge20 rows of `data/eval/runs/20261122T122041Z-heldout-eval/RESULTS.md`. Its Flash high/v1 baseline is a different configuration and is not the comparison here. Historical values retain that report’s rounding; new results are reported to four decimals.

### Held-out operational comparison

The operational values are identical under primary and strict labels.

| Run | Success [95% CI] | p50 s [CI] | p95 s [CI] | Max s [CI] | ≤40 s [count CI] | Escalations [count CI] | Reasons [count CIs] | Escalation errors |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Historical no escalation | 20/20 [0.839, 1.000] | 8.190 [6.899, 24.064] | 33.637 [25.178, 41.069] | 41.069 [29.093, 41.069] | 19/20 [17, 20] | 0 [0, 0] | none | 0 |
| Argon medium escalation | 20/20 [0.839, 1.000] | 21.447 [17.112, 75.079] | 93.994 [83.358, 107.473] | 107.473 [84.891, 107.473] | 11/20 [7, 15] | 8 [4, 12] | needs_review: 2 [0, 5]; coverage_band: 6 [2, 10] | 0 |

### Primary labels

Each row contains 140 criterion labels and 20 rule-5 fits.

| Run | Exact κ [95% CI] | Collapsed κ [CI] | Evidence F1 [CI] | Fit accuracy [CI] | Absent recall [CI] |
| --- | --- | --- | --- | --- | --- |
| Historical no escalation | 0.587 [0.457, 0.710] | 0.698 [0.559, 0.822] | 0.848 [0.757, 0.924] | 1.000 [1.000, 1.000] | 20/21 = 0.952 [0.842, 1.000] |
| Argon medium escalation | 0.5595 [0.4611, 0.6533] | 0.6782 [0.5529, 0.8007] | 0.8819 [0.7907, 0.9429] | 0.9500 [0.8500, 1.0000] | 20/21 = 0.9524 [0.8421, 1.0000] |

New minus historical no escalation (unrounded stored metrics): exact κ -0.027927; collapsed κ -0.020063; evidence F1 +0.033890; fit accuracy -0.050000. No additional held-out model selection follows from these differences.

### Strict labels

Each row contains 140 criterion labels and 20 rule-5 fits.

| Run | Exact κ [95% CI] | Collapsed κ [CI] | Evidence F1 [CI] | Fit accuracy [CI] | Absent recall [CI] |
| --- | --- | --- | --- | --- | --- |
| Historical no escalation | 0.657 [0.546, 0.763] | 0.748 [0.641, 0.847] | 0.862 [0.773, 0.932] | 1.000 [1.000, 1.000] | 28/33 = 0.848 [0.769, 0.947] |
| Argon medium escalation | 0.6725 [0.5755, 0.7578] | 0.7911 [0.6813, 0.8881] | 0.8960 [0.8036, 0.9561] | 0.9500 [0.8500, 1.0000] | 31/33 = 0.9394 [0.8709, 1.0000] |

New minus historical no escalation (unrounded stored metrics): exact κ +0.015437; collapsed κ +0.043244; evidence F1 +0.034211; fit accuracy -0.050000. No additional held-out model selection follows from these differences.

### Per-pair held-out latency and escalation flags


| Pair | Status | Latency s | Escalated | Reasons | Primary s | Escalation s | Escalation failed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| database-h1__jd-hr-real | succeeded | 107.472689 | no | — | 107.472147 | 0.000000 | no |
| database-h1__jd-py-real | succeeded | 74.119514 | no | — | 74.118170 | 0.000000 | no |
| designer-h1__jd-hr-real | succeeded | 8.148621 | no | — | 8.148058 | 0.000000 | no |
| designer-h1__jd-py-real | succeeded | 6.744810 | no | — | 6.743998 | 0.000000 | no |
| devops-h1__jd-hr-real | succeeded | 83.357742 | no | — | 83.356888 | 0.000000 | no |
| devops-h1__jd-py-real | succeeded | 93.284645 | yes | needs_review | 81.853990 | 11.425568 | no |
| finance-h1__jd-hr-real | succeeded | 19.387080 | yes | coverage_band | 6.771709 | 12.614924 | no |
| finance-h1__jd-py-real | succeeded | 4.923214 | no | — | 4.922471 | 0.000000 | no |
| hr-h1__jd-hr-real | succeeded | 69.374232 | no | — | 69.370287 | 0.000000 | no |
| hr-h1__jd-py-real | succeeded | 72.733579 | no | — | 72.732522 | 0.000000 | no |
| hr-h2__jd-hr-real | succeeded | 20.981800 | yes | coverage_band | 7.741099 | 13.239974 | no |
| hr-h2__jd-py-real | succeeded | 5.483706 | no | — | 5.482571 | 0.000000 | no |
| hr-h3__jd-hr-real | succeeded | 21.912129 | yes | coverage_band | 7.262907 | 14.641538 | no |
| hr-h3__jd-py-real | succeeded | 6.248950 | no | — | 6.247937 | 0.000000 | no |
| python_dev-h1__jd-hr-real | succeeded | 20.182000 | yes | coverage_band | 8.392762 | 11.788649 | no |
| python_dev-h1__jd-py-real | succeeded | 17.509991 | yes | coverage_band | 6.563672 | 10.945256 | no |
| python_dev-h2__jd-hr-real | succeeded | 76.038800 | yes | needs_review | 56.106668 | 19.931136 | no |
| python_dev-h2__jd-py-real | succeeded | 16.714325 | yes | coverage_band | 5.289472 | 11.422050 | no |
| python_dev-h3__jd-hr-real | succeeded | 86.564825 | no | — | 86.564040 | 0.000000 | no |
| python_dev-h3__jd-py-real | succeeded | 84.890645 | no | — | 84.889812 | 0.000000 | no |

### Execution provenance

Run: `20261122T164305Z-heldout-final-flashlow-v2-hedge20-esc-argonmedium`. Manifest invocations: 1; gateway-reported models: ['gemini-3.8-flash-n', 'gemini-4-argon-trial']. Requested primary/escalation selectors remain recorded in the manifest. Successful-output per-call attempts and hedge metadata are retained in pair JSON, including primary summaries for escalated pairs. Shared gateway noise and primary-output variation mean this is a comparison of complete runs, not a causal estimate of escalation alone.


## Per-pair dev latency and escalation flags

Each row is one CV×JD pair. Reason lists refer to validated primary results; measured latency includes an escalation pass when triggered.

| Run | Pair | Status | Latency s | Escalated | Reasons | Primary s | Escalation s | Escalation failed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Reference — no escalation | database-01__jd-hr-real | succeeded | 7.672919 | no | — | — | — | no |
| Reference — no escalation | database-01__jd-py-real | succeeded | 7.248037 | no | — | — | — | no |
| Reference — no escalation | designer-01__jd-hr-real | succeeded | 53.697268 | no | — | — | — | no |
| Reference — no escalation | designer-01__jd-py-real | succeeded | 25.087847 | no | — | — | — | no |
| Reference — no escalation | devops-01__jd-hr-real | succeeded | 6.216623 | no | — | — | — | no |
| Reference — no escalation | devops-01__jd-py-real | succeeded | 6.995110 | no | — | — | — | no |
| Reference — no escalation | finance-01__jd-hr-real | succeeded | 7.404853 | no | — | — | — | no |
| Reference — no escalation | finance-01__jd-py-real | succeeded | 6.834790 | no | — | — | — | no |
| Reference — no escalation | hr-01__jd-hr-real | succeeded | 6.920324 | no | — | — | — | no |
| Reference — no escalation | hr-01__jd-py-real | succeeded | 6.299038 | no | — | — | — | no |
| Reference — no escalation | hr-02__jd-hr-real | succeeded | 8.309397 | no | — | — | — | no |
| Reference — no escalation | hr-02__jd-py-real | succeeded | 7.362919 | no | — | — | — | no |
| Reference — no escalation | hr-03__jd-hr-real | succeeded | 7.180868 | no | — | — | — | no |
| Reference — no escalation | hr-03__jd-py-real | succeeded | 6.101307 | no | — | — | — | no |
| Reference — no escalation | python_dev-01__jd-hr-real | succeeded | 7.427118 | no | — | — | — | no |
| Reference — no escalation | python_dev-01__jd-py-real | succeeded | 7.269821 | no | — | — | — | no |
| Reference — no escalation | python_dev-02__jd-hr-real | succeeded | 7.602178 | no | — | — | — | no |
| Reference — no escalation | python_dev-02__jd-py-real | succeeded | 6.521565 | no | — | — | — | no |
| Reference — no escalation | python_dev-03__jd-hr-real | succeeded | 6.242191 | no | — | — | — | no |
| Reference — no escalation | python_dev-03__jd-py-real | succeeded | 6.036734 | no | — | — | — | no |
| A — Flash high | database-01__jd-hr-real | succeeded | 128.530305 | yes | coverage_band | 6.755857 | 121.774028 | no |
| A — Flash high | database-01__jd-py-real | succeeded | 7.501059 | no | — | 7.496498 | 0.000000 | no |
| A — Flash high | designer-01__jd-hr-real | succeeded | 12.725743 | no | — | 12.724963 | 0.000000 | no |
| A — Flash high | designer-01__jd-py-real | succeeded | 19.509403 | no | — | 19.508477 | 0.000000 | no |
| A — Flash high | devops-01__jd-hr-real | succeeded | 5.560280 | no | — | 5.559702 | 0.000000 | no |
| A — Flash high | devops-01__jd-py-real | succeeded | 6.047886 | no | — | 6.047537 | 0.000000 | no |
| A — Flash high | finance-01__jd-hr-real | succeeded | 56.191568 | yes | coverage_band | 6.407822 | 49.782993 | no |
| A — Flash high | finance-01__jd-py-real | succeeded | 6.302154 | no | — | 6.301093 | 0.000000 | no |
| A — Flash high | hr-01__jd-hr-real | succeeded | 7.060791 | no | — | 7.060134 | 0.000000 | no |
| A — Flash high | hr-01__jd-py-real | succeeded | 7.269281 | no | — | 7.268148 | 0.000000 | no |
| A — Flash high | hr-02__jd-hr-real | succeeded | 7.873747 | no | — | 7.872768 | 0.000000 | no |
| A — Flash high | hr-02__jd-py-real | succeeded | 6.680914 | no | — | 6.679701 | 0.000000 | no |
| A — Flash high | hr-03__jd-hr-real | succeeded | 7.209744 | no | — | 7.209138 | 0.000000 | no |
| A — Flash high | hr-03__jd-py-real | succeeded | 5.639204 | no | — | 5.638059 | 0.000000 | no |
| A — Flash high | python_dev-01__jd-hr-real | succeeded | 172.153713 | yes | coverage_band | 12.454595 | 159.698235 | no |
| A — Flash high | python_dev-01__jd-py-real | succeeded | 22.064399 | no | — | 22.063749 | 0.000000 | no |
| A — Flash high | python_dev-02__jd-hr-real | succeeded | 194.945278 | yes | coverage_band | 14.265687 | 180.679221 | no |
| A — Flash high | python_dev-02__jd-py-real | succeeded | 17.435955 | no | — | 17.435631 | 0.000000 | no |
| A — Flash high | python_dev-03__jd-hr-real | succeeded | 39.936748 | yes | needs_review, coverage_band | 6.399520 | 33.536460 | no |
| A — Flash high | python_dev-03__jd-py-real | succeeded | 7.783749 | no | — | 7.783088 | 0.000000 | no |
| B — Argon medium | database-01__jd-hr-real | succeeded | 23.126699 | yes | coverage_band | 9.992699 | 13.133558 | no |
| B — Argon medium | database-01__jd-py-real | succeeded | 8.598530 | no | — | 8.597779 | 0.000000 | no |
| B — Argon medium | designer-01__jd-hr-real | succeeded | 5.393018 | no | — | 5.392505 | 0.000000 | no |
| B — Argon medium | designer-01__jd-py-real | succeeded | 5.844546 | no | — | 5.843929 | 0.000000 | no |
| B — Argon medium | devops-01__jd-hr-real | succeeded | 34.630203 | no | — | 34.629480 | 0.000000 | no |
| B — Argon medium | devops-01__jd-py-real | succeeded | 22.671150 | no | — | 22.670089 | 0.000000 | no |
| B — Argon medium | finance-01__jd-hr-real | succeeded | 19.807842 | yes | coverage_band | 6.586784 | 13.220688 | no |
| B — Argon medium | finance-01__jd-py-real | succeeded | 5.662965 | no | — | 5.661790 | 0.000000 | no |
| B — Argon medium | hr-01__jd-hr-real | succeeded | 6.480895 | no | — | 6.480155 | 0.000000 | no |
| B — Argon medium | hr-01__jd-py-real | succeeded | 6.185489 | no | — | 6.184674 | 0.000000 | no |
| B — Argon medium | hr-02__jd-hr-real | succeeded | 7.501806 | no | — | 7.501377 | 0.000000 | no |
| B — Argon medium | hr-02__jd-py-real | succeeded | 7.029444 | no | — | 7.028929 | 0.000000 | no |
| B — Argon medium | hr-03__jd-hr-real | succeeded | 6.663178 | no | — | 6.662289 | 0.000000 | no |
| B — Argon medium | hr-03__jd-py-real | succeeded | 7.753572 | no | — | 7.750399 | 0.000000 | no |
| B — Argon medium | python_dev-01__jd-hr-real | succeeded | 34.981609 | no | — | 34.981126 | 0.000000 | no |
| B — Argon medium | python_dev-01__jd-py-real | succeeded | 88.997818 | yes | needs_review | 29.670625 | 59.326284 | no |
| B — Argon medium | python_dev-02__jd-hr-real | succeeded | 91.839526 | yes | coverage_band | 9.959739 | 81.873758 | no |
| B — Argon medium | python_dev-02__jd-py-real | succeeded | 18.919312 | no | — | 18.918345 | 0.000000 | no |
| B — Argon medium | python_dev-03__jd-hr-real | succeeded | 28.129398 | no | — | 28.128822 | 0.000000 | no |
| B — Argon medium | python_dev-03__jd-py-real | succeeded | 28.366147 | no | — | 28.365427 | 0.000000 | no |

## Limitations

- Small n: 10 CVs × 2 JDs per dataset; 20 dependent pairs and 140 criteria. Pair bootstrap preserves within-pair criteria but not the same CV’s cross-JD dependence; intervals are descriptive and do not establish significance. Success intervals assume independent pairs.
- Silver labels are LLM annotations, not human ground truth. Adjudicator/model-family overlap and dev-convention harmonisation can bias agreement; primary and strict held-out labels test different conventions.
- Shared gateway noise, retries, cancellation, model nondeterminism, and sequential order confound latency comparisons. Historical dev reference has no hedge; the new configurations use hedge20. Successful pair status can include escalation fallback, disclosed above.
- The escalation coverage band `[0.7, 0.9)` was fixed a priori for this task, not selected on these dev/held-out outputs; `needs_review` is the other fixed trigger.
- Escalation was added after the first held-out result at Dylan’s request. Even with dev-only selection and one conditional new held-out run, the held-out dataset has already been inspected and this is not a pristine first-use confirmatory test.
- Fit is a deterministic rubric proxy; weights and scores are uncalibrated, and expected_group is sampling metadata, not ground truth.
- Bootstrap intervals on observed extrema cannot guarantee future latency tails. Reported gateway response model aliases do not independently establish the requested selector’s reasoning policy.

## Artifacts

- Dev selection and tables: `data/eval/runs/20261122T162215Z-dev-escalation-eval/` (`accuracy/`, `selection.json`, `supplementary-metrics.json`, `input-provenance.json`, `read-only-verification.json`).
- Held-out `primary/` and `strict/`: unmodified evaluator `metrics.json`/`report.md`, plus supplemental operational/absent-recall intervals.
- Held-out raw output: `data/eval/runs/20261122T164305Z-heldout-final-flashlow-v2-hedge20-esc-argonmedium/` (manifest, 20 pair JSONs, summaries, runner log).
- `heldout-verification.json`: staged/canonical inputs, completed manifest, pair-text and read-only checks.
- Offline helper scripts are new reproducibility artifacts under run directories; application/evaluation source is unchanged.
