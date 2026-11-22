# T5.9 — Escalation on needs_review only

The fixed NR-only Argon medium configuration passed the dev gate: 20/20 success and 20/20 pairs ≤40 s. Collapsed κ delta versus reference is +0.07638808; evidence F1 delta is +0.04882045.

## Procedure

Added `EscalationRule.triggers` and runner `--escalate-on`, preserving both triggers by default and preserving existing default manifests and screening serialization. Non-default trigger subsets are recorded canonically in manifest identity and distinguish resumes. All existing tests were left unchanged; new tests cover NR-only with in-band coverage, NR escalation, coverage-only, invalid subsets, CLI parsing, manifest identity, and resume behavior. Validation before provider calls: `uv run pytest` (253 passed, 3 skipped), `uv run ruff check .`, `uv run ruff format --check .` all passed in `apps/ai-service`; see `code-validation.json`.

The model was fixed at `ag/gemini-4-argon-medium`; no model selection was performed. Dev common flags: `--model ag/gemini-3.8-flash-low --prompt-version screening-v2 --context-mode retrieved --retrieval-mode lexical --retrieval-k 5 --concurrency 1 --hedge-after-s 20 --escalate-model ag/gemini-4-argon-medium --escalate-on needs_review`. The coverage band remains a stored default but is inactive. Environment was loaded from the specified file without printing or copying secrets. Runs were strictly sequential; no label or environment files were changed and no commit was made.

The three dev runs were evaluated offline together against `data/eval/labels-silver/final/`: `20261122T083536Z-v2-lexical-gemini-3-8-flash-low-c1`, `20261122T162215Z-dev-esc-argonmedium`, and `20261122T182040Z-dev-esc-nr-argonmedium`. The historical reference has no hedge, so differences combine escalation, hedging, primary-output variation, and gateway timing.

## Intervals and definitions

Accuracy uses unmodified `app.experiments.evaluate`: nominal six-class exact κ; collapsed κ merges strong/adequate/partial into evidence, retains absent, and merges unknown/needs_review; evidence F1 is binary evidence detection, not quote overlap; fit accuracy applies guideline rule 5. Accuracy and absent-recall CIs use 2,000 pair-cluster percentile bootstrap draws, NumPy seed 20261122; zero-support absent draws are omitted. Operational percentile/count intervals use the same seed and 2,000 draws; success uses a Wilson 95% interval. Pair latency includes preparation, provider retries, hedging, and escalation, excluding queue and persistence. Percentiles use linear interpolation at (n−1)q. Observed max/p95 CIs do not bound future tails. Reason counts may overlap; escalation failure preserves primary output.

## Dev results

| Run | Success [95% CI] | p50 s [CI] | p95 s [CI] | Max s [CI] | ≤40 s [count CI] | Escalations [count CI] | Reasons [count CIs] | Escalation errors |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Reference — no escalation | 20/20 [0.839, 1.000] | 7.214 [6.678, 7.416] | 26.518 [7.606, 53.697] | 53.697 [7.673, 53.697] | 19/20 [17, 20] | 0 [0, 0] | needs_review: 0 [0, 0]; coverage_band: 0 [0, 0] | 0 |
| T5.8 — band + NR | 20/20 [0.839, 1.000] | 13.759 [6.846, 25.628] | 89.140 [28.679, 91.840] | 91.840 [34.630, 91.840] | 18/20 [15, 20] | 4 [1, 8] | needs_review: 1 [0, 3]; coverage_band: 3 [0, 6] | 0 |
| T5.9 — NR only | 20/20 [0.839, 1.000] | 21.854 [7.427, 26.239] | 33.005 [26.807, 39.582] | 39.582 [27.329, 39.582] | 20/20 [20, 20] | 1 [0, 3] | needs_review: 1 [0, 3]; coverage_band: 0 [0, 0] | 0 |

| Run | Exact κ [95% CI] | Collapsed κ [CI] | Evidence F1 [CI] | Fit accuracy [CI] | Absent recall [CI] |
| --- | --- | --- | --- | --- | --- |
| Reference — no escalation | 0.6356 [0.5113, 0.7448] | 0.7107 [0.5816, 0.8280] | 0.8440 [0.7473, 0.9247] | 0.9500 [0.8500, 1.0000] | 20/20 = 1.0000 [1.0000, 1.0000] |
| T5.8 — band + NR | 0.6455 [0.5256, 0.7652] | 0.7771 [0.6649, 0.8758] | 0.9217 [0.8706, 0.9635] | 0.9000 [0.7500, 1.0000] | 20/20 = 1.0000 [1.0000, 1.0000] |
| T5.9 — NR only | 0.6796 [0.5423, 0.7914] | 0.7871 [0.6680, 0.8778] | 0.8929 [0.8116, 0.9538] | 0.9500 [0.8500, 1.0000] | 20/20 = 1.0000 [1.0000, 1.0000] |

## Mechanical gate

20/20 success AND at least 17/20 pairs <=40 s AND collapsed kappa >= reference - 0.01 AND evidence F1 >= reference - 0.01.

- `success_20_of_20`: PASS.
- `at_least_17_within_40_s`: PASS.
- `collapsed_kappa_within_0_01_of_reference`: PASS.
- `evidence_f1_within_0_01_of_reference`: PASS.

Full precision: collapsed κ 0.7871318822 ≥ 0.7107438017 − 0.01 = 0.7007438017; evidence F1 0.8928571429 ≥ 0.8440366972 − 0.01 = 0.8340366972. Each comparison is applied independently with logical AND.

**Decision: PASS — one held-out run authorized by the gate.**

## Held-out comparison

Historical no-escalation values are transcribed from the selected Flash low/v2/hedge20 rows of `20261122T122041Z-heldout-eval/RESULTS.md`; T5.8 band+NR values are transcribed from `20261122T164305Z-heldout-escalation-eval/RESULTS.md`. Historical rounding is retained. These historical results are context and did not enter the mechanical dev gate.

Held-out evaluation pending.

### Operations (same for both label variants)

| Run | Success [95% CI] | p50 s [CI] | p95 s [CI] | Max s [CI] | ≤40 s [count CI] | Escalations [count CI] | Reasons [count CIs] | Escalation errors |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Historical no escalation | 20/20 [0.839, 1.000] | 8.190 [6.899, 24.064] | 33.637 [25.178, 41.069] | 41.069 [29.093, 41.069] | 19/20 [17, 20] | 0 [0, 0] | none | 0 |
| T5.8 — band + NR | 20/20 [0.839, 1.000] | 21.447 [17.112, 75.079] | 93.994 [83.358, 107.473] | 107.473 [84.891, 107.473] | 11/20 [7, 15] | 8 [4, 12] | needs_review: 2 [0, 5]; coverage_band: 6 [2, 10] | 0 |
| T5.9 — NR only | Pending | — | — | — | — | — | — | — |

### Primary labels

Each evaluated row uses 140 criteria and 20 rule-5 fits.

| Run | Exact κ [95% CI] | Collapsed κ [CI] | Evidence F1 [CI] | Fit accuracy [CI] | Absent recall [CI] |
| --- | --- | --- | --- | --- | --- |
| Historical no escalation | 0.587 [0.457, 0.710] | 0.698 [0.559, 0.822] | 0.848 [0.757, 0.924] | 1.000 [1.000, 1.000] | 20/21 = 0.952 [0.842, 1.000] |
| T5.8 — band + NR | 0.5595 [0.4611, 0.6533] | 0.6782 [0.5529, 0.8007] | 0.8819 [0.7907, 0.9429] | 0.9500 [0.8500, 1.0000] | 20/21 = 0.9524 [0.8421, 1.0000] |
| T5.9 — NR only (pending) | — | — | — | — | — |

### Strict labels

Each evaluated row uses 140 criteria and 20 rule-5 fits.

| Run | Exact κ [95% CI] | Collapsed κ [CI] | Evidence F1 [CI] | Fit accuracy [CI] | Absent recall [CI] |
| --- | --- | --- | --- | --- | --- |
| Historical no escalation | 0.657 [0.546, 0.763] | 0.748 [0.641, 0.847] | 0.862 [0.773, 0.932] | 1.000 [1.000, 1.000] | 28/33 = 0.848 [0.769, 0.947] |
| T5.8 — band + NR | 0.6725 [0.5755, 0.7578] | 0.7911 [0.6813, 0.8881] | 0.8960 [0.8036, 0.9561] | 0.9500 [0.8500, 1.0000] | 31/33 = 0.9394 [0.8709, 1.0000] |
| T5.9 — NR only (pending) | — | — | — | — | — |

## Per-pair dev latency and escalation flags

Reference — no escalation: 1 non-escalated pairs exceeded 40 s. These delays are consistent with gateway noise; the artifacts cannot isolate gateway load from other primary-pass variation.

T5.8 — band + NR: 0 non-escalated pairs exceeded 40 s. These delays are consistent with gateway noise; the artifacts cannot isolate gateway load from other primary-pass variation.

T5.9 — NR only: 0 non-escalated pairs exceeded 40 s. These delays are consistent with gateway noise; the artifacts cannot isolate gateway load from other primary-pass variation.

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
| T5.8 — band + NR | database-01__jd-hr-real | succeeded | 23.126699 | yes | coverage_band | 9.992699 | 13.133558 | no |
| T5.8 — band + NR | database-01__jd-py-real | succeeded | 8.598530 | no | — | 8.597779 | 0.000000 | no |
| T5.8 — band + NR | designer-01__jd-hr-real | succeeded | 5.393018 | no | — | 5.392505 | 0.000000 | no |
| T5.8 — band + NR | designer-01__jd-py-real | succeeded | 5.844546 | no | — | 5.843929 | 0.000000 | no |
| T5.8 — band + NR | devops-01__jd-hr-real | succeeded | 34.630203 | no | — | 34.629480 | 0.000000 | no |
| T5.8 — band + NR | devops-01__jd-py-real | succeeded | 22.671150 | no | — | 22.670089 | 0.000000 | no |
| T5.8 — band + NR | finance-01__jd-hr-real | succeeded | 19.807842 | yes | coverage_band | 6.586784 | 13.220688 | no |
| T5.8 — band + NR | finance-01__jd-py-real | succeeded | 5.662965 | no | — | 5.661790 | 0.000000 | no |
| T5.8 — band + NR | hr-01__jd-hr-real | succeeded | 6.480895 | no | — | 6.480155 | 0.000000 | no |
| T5.8 — band + NR | hr-01__jd-py-real | succeeded | 6.185489 | no | — | 6.184674 | 0.000000 | no |
| T5.8 — band + NR | hr-02__jd-hr-real | succeeded | 7.501806 | no | — | 7.501377 | 0.000000 | no |
| T5.8 — band + NR | hr-02__jd-py-real | succeeded | 7.029444 | no | — | 7.028929 | 0.000000 | no |
| T5.8 — band + NR | hr-03__jd-hr-real | succeeded | 6.663178 | no | — | 6.662289 | 0.000000 | no |
| T5.8 — band + NR | hr-03__jd-py-real | succeeded | 7.753572 | no | — | 7.750399 | 0.000000 | no |
| T5.8 — band + NR | python_dev-01__jd-hr-real | succeeded | 34.981609 | no | — | 34.981126 | 0.000000 | no |
| T5.8 — band + NR | python_dev-01__jd-py-real | succeeded | 88.997818 | yes | needs_review | 29.670625 | 59.326284 | no |
| T5.8 — band + NR | python_dev-02__jd-hr-real | succeeded | 91.839526 | yes | coverage_band | 9.959739 | 81.873758 | no |
| T5.8 — band + NR | python_dev-02__jd-py-real | succeeded | 18.919312 | no | — | 18.918345 | 0.000000 | no |
| T5.8 — band + NR | python_dev-03__jd-hr-real | succeeded | 28.129398 | no | — | 28.128822 | 0.000000 | no |
| T5.8 — band + NR | python_dev-03__jd-py-real | succeeded | 28.366147 | no | — | 28.365427 | 0.000000 | no |
| T5.9 — NR only | database-01__jd-hr-real | succeeded | 16.988342 | no | — | 16.987795 | 0.000000 | no |
| T5.9 — NR only | database-01__jd-py-real | succeeded | 22.223956 | no | — | 22.223171 | 0.000000 | no |
| T5.9 — NR only | designer-01__jd-hr-real | succeeded | 7.662548 | no | — | 7.661477 | 0.000000 | no |
| T5.9 — NR only | designer-01__jd-py-real | succeeded | 6.623365 | no | — | 6.622404 | 0.000000 | no |
| T5.9 — NR only | devops-01__jd-hr-real | succeeded | 39.581942 | no | — | 39.581183 | 0.000000 | no |
| T5.9 — NR only | devops-01__jd-py-real | succeeded | 32.659363 | no | — | 32.658355 | 0.000000 | no |
| T5.9 — NR only | finance-01__jd-hr-real | succeeded | 5.094119 | no | — | 5.093703 | 0.000000 | no |
| T5.9 — NR only | finance-01__jd-py-real | succeeded | 5.610560 | no | — | 5.609553 | 0.000000 | no |
| T5.9 — NR only | hr-01__jd-hr-real | succeeded | 26.779682 | no | — | 26.778986 | 0.000000 | no |
| T5.9 — NR only | hr-01__jd-py-real | succeeded | 25.574937 | no | — | 25.573748 | 0.000000 | no |
| T5.9 — NR only | hr-02__jd-hr-real | succeeded | 28.215804 | no | — | 28.213760 | 0.000000 | no |
| T5.9 — NR only | hr-02__jd-py-real | succeeded | 26.198621 | no | — | 26.197579 | 0.000000 | no |
| T5.9 — NR only | hr-03__jd-hr-real | succeeded | 7.243671 | no | — | 7.240269 | 0.000000 | no |
| T5.9 — NR only | hr-03__jd-py-real | succeeded | 6.290245 | no | — | 6.289385 | 0.000000 | no |
| T5.9 — NR only | python_dev-01__jd-hr-real | succeeded | 7.609334 | no | — | 7.608517 | 0.000000 | no |
| T5.9 — NR only | python_dev-01__jd-py-real | succeeded | 21.484704 | yes | needs_review | 7.101650 | 14.382414 | no |
| T5.9 — NR only | python_dev-02__jd-hr-real | succeeded | 25.449858 | no | — | 25.448849 | 0.000000 | no |
| T5.9 — NR only | python_dev-02__jd-py-real | succeeded | 6.635054 | no | — | 6.634076 | 0.000000 | no |
| T5.9 — NR only | python_dev-03__jd-hr-real | succeeded | 27.329198 | no | — | 27.328323 | 0.000000 | no |
| T5.9 — NR only | python_dev-03__jd-py-real | succeeded | 26.279119 | no | — | 26.273553 | 0.000000 | no |

## Limitations

- Small n: 10 CVs × 2 JDs per dataset; 20 dependent pairs and 140 criteria. Pair bootstrap preserves within-pair criteria but not the same CV’s cross-JD dependence; these are descriptive intervals, not significance claims. Success intervals assume independent pairs.
- Silver labels are LLM annotations, not human ground truth. Adjudicator/model-family overlap and dev-convention harmonisation can bias agreement; primary and strict labels reflect different conventions.
- Gateway noise, retries, hedging, nondeterminism, and sequential order confound latency comparisons. The dev reference has no hedge; NR-only uses hedge20. Successful pair status can include escalation fallback, reported separately.
- The needs_review-only trigger was chosen after seeing T5.8 held-out results, so held-out is no longer fully untouched for this choice. The dev gate and one subsequent held-out run do not restore confirmatory independence.
- Fit is a deterministic rubric proxy rather than a hiring recommendation. Weights/scores are uncalibrated, and expected_group is sampling metadata rather than ground truth.
- Bootstrap CIs for extrema cannot guarantee future tails; gateway response aliases alone do not independently establish the requested selector’s execution policy.

## Artifacts

- Dev: `data/eval/runs/20261122T182040Z-dev-esc-nr-eval/` — `accuracy/`, `selection.json`, `supplementary-metrics.json`, `code-validation.json`, input provenance and read-only verification, reproducible offline scripts.
- Raw NR-only dev output: `data/eval/runs/20261122T182040Z-dev-esc-nr-argonmedium/` — manifest, summary, 20 pair JSONs, runner log.
