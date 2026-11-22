# Final held-out test — T5.5

## Procedure and provenance

The selected configuration and comparison baseline were each run once, sequentially, on 10 held-out CVs × jd-py-real and jd-hr-real (20 pairs, 140 criteria). No smoke run, retuning, or configuration selection used the held-out results. No resume was needed. Provider metadata records 0 selected pairs and 1 baseline pairs with more than one internal attempt (provider-retries.json).

Output timestamp: 20261122T122041Z. Runner/evaluator/comparison source and canonical labels/JDs/text were read-only. No commit was made. Provider timeout was 180 s and max_retries 2; provider-internal retries are distinct from a runner resume. Selected hedge delay was 20 s; baseline hedging was disabled.

The original held-out YAML lives beside neither jds/ nor text/, whereas run.py resolves both relative to the YAML. The coordinator approved a byte-identical copy at inputs/set-heldout-10.yaml and relative symlinks inputs/jds and inputs/text to canonical data/eval/jds and data/eval/text. Before calls, staged YAML/JD/text hashes were verified against canonical inputs; manifest dataset/JD hashes were checked at startup and both completed manifests and every pair text hash were checked afterward. See input-hashes.json and hash-validation.json.
Canonical/staged eval-set SHA256: `ce42cfbff2bd031b7d984d272fd3680a483855290917f47e5271edfa20e97a6f`.

Both configurations use retrieved lexical context, k=5, concurrency=1. Selected: ag/gemini-3.8-flash-low, screening-v2, hedge-after-s=20. Baseline: ag/gemini-3.8-flash-high, screening-v1, no hedge.

## Operational headline (same under both label variants)

Latency includes input verification and screening/provider retries/hedging, excluding queue and persistence. CIs are descriptive percentile pair-bootstrap intervals (2,000 draws, seed 20261122); count intervals use resampled totals of 20 pairs. Success uses a Wilson binomial 95% interval. Quote verification pools emitted quotes, resampling whole pairs. Hedges fired counts pairs marked hedged, not physical requests across retries; wins counts responses won by the hedge. Bootstrap extrema intervals describe this observed sample and cannot bound unseen future tails.

| Run | Success [95% CI] | p50 s [CI] | p95 s [CI] | max s [CI] | ≤40 s [count CI] | Hedges / wins [count CIs] | Quote verification [CI] |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Selected Flash low / v2 / hedge20 | 20/20 [0.839, 1.000] | 8.190 [6.899, 24.064] | 33.637 [25.178, 41.069] | 41.069 [29.093, 41.069] | 19/20 [17, 20] | 8 / 0 [4, 12] / [0, 0] | 143/145 = 0.986 [0.956, 1.000] |
| Baseline Flash high / v1 / no hedge | 20/20 [0.839, 1.000] | 59.121 [52.000, 70.657] | 175.641 [73.752, 236.831] | 236.831 [88.315, 236.831] | 3/20 [0, 6] | 0 / 0 [0, 0] / [0, 0] | 139/145 = 0.959 [0.923, 0.986] |

## Primary labels — accuracy headline

Each row uses 140 validated criteria and 20 rule-5 fits. Exact κ is nominal six-class Cohen κ; collapsed κ maps strong/adequate/partial to evidence. Evidence F1 is binary evidence detection, not quote overlap. All accuracy CIs use evaluate.py's 2,000 pair-bootstrap draws and seed 20261122. Absent-recall CIs use the same pair draws; draws with zero absent support are omitted.

| Run | Exact accuracy [95% CI] | Exact κ [CI] | Collapsed κ [CI] | Evidence F1 [CI] | Fit accuracy [CI] | Absent recall [CI] |
| --- | --- | --- | --- | --- | --- | --- |
| Selected Flash low / v2 / hedge20 | 0.686 [0.586, 0.786] | 0.587 [0.457, 0.710] | 0.698 [0.559, 0.822] | 0.848 [0.757, 0.924] | 1.000 [1.000, 1.000] | 20/21 = 0.952 [0.842, 1.000] |
| Baseline Flash high / v1 / no hedge | 0.614 [0.543, 0.686] | 0.459 [0.356, 0.552] | 0.587 [0.454, 0.698] | 0.885 [0.785, 0.949] | 0.950 [0.850, 1.000] | 0/21 = 0.000 [0.000, 0.000] |

## Strict labels — accuracy headline

Each row uses 140 validated criteria and 20 rule-5 fits. Exact κ is nominal six-class Cohen κ; collapsed κ maps strong/adequate/partial to evidence. Evidence F1 is binary evidence detection, not quote overlap. All accuracy CIs use evaluate.py's 2,000 pair-bootstrap draws and seed 20261122. Absent-recall CIs use the same pair draws; draws with zero absent support are omitted.

| Run | Exact accuracy [95% CI] | Exact κ [CI] | Collapsed κ [CI] | Evidence F1 [CI] | Fit accuracy [CI] | Absent recall [CI] |
| --- | --- | --- | --- | --- | --- | --- |
| Selected Flash low / v2 / hedge20 | 0.736 [0.643, 0.821] | 0.657 [0.546, 0.763] | 0.748 [0.641, 0.847] | 0.862 [0.773, 0.932] | 1.000 [1.000, 1.000] | 28/33 = 0.848 [0.769, 0.947] |
| Baseline Flash high / v1 / no hedge | 0.543 [0.457, 0.614] | 0.392 [0.295, 0.481] | 0.482 [0.364, 0.595] | 0.868 [0.764, 0.939] | 0.950 [0.850, 1.000] | 0/33 = 0.000 [0.000, 0.000] |

## Sensitivity to dev-convention harmonisation

Strict labels restore the agreed raw level and consistently use Claude raw evidence/notes for all 120 agreed criteria; disagreements retain final adjudication. The 15 level changes exactly match ADJUDICATION.md: 10 unknown→absent on recruiting/HR programs, 3 adequate→partial on communication, 2 partial→absent on adjacent education. All 20 overall_fit values were recomputed using v1.1 rule 5 and none changed. The source metadata is preserved, with derivation disclosed in labels-strict/README.md. Evidence quote text and supplied offsets were validated.

- Selected Flash low / v2 / hedge20, strict minus primary: exact accuracy +0.0500; exact κ +0.0697; collapsed κ +0.0496; evidence F1 +0.0138; fit accuracy +0.0000; absent recall -0.1039.
- Baseline Flash high / v1 / no hedge, strict minus primary: exact accuracy -0.0714; exact κ -0.0675; collapsed κ -0.1054; evidence F1 -0.0173; fit accuracy +0.0000; absent recall +0.0000.

## Dev versus held-out selected configuration

Dev numbers below are transcribed from accuracy-bakeoff-20261122T120520Z/bakeoff.md, used only for selection. The dev Flash low run had no hedge; held-out adds the preselected hedge-after-s=20 setting. This is a dataset-and-execution comparison, not an isolated estimate of a hedge effect.

| Dataset / labels | Success | p50 / p95 / max s | ≤40 s | Quote rate | Exact κ | Collapsed κ | Evidence F1 | Fit accuracy | Absent recall |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Dev / final | 20/20 | 7.2 / 26.5 / 53.7 | 19/20 | 0.942 | 0.636 [0.511, 0.745] | 0.711 [0.582, 0.828] | 0.844 [0.747, 0.925] | 0.950 [0.850, 1.000] | 1.000 |
| Held-out / primary | 20/20 | 8.190 / 33.637 / 41.069 | 19/20 | 0.986 | 0.587 [0.457, 0.710] | 0.698 [0.559, 0.822] | 0.848 [0.757, 0.924] | 1.000 [1.000, 1.000] | 0.952 [0.842, 1.000] |
| Held-out / strict | 20/20 | 8.190 / 33.637 / 41.069 | 19/20 | 0.986 | 0.657 [0.546, 0.763] | 0.748 [0.641, 0.847] | 0.862 [0.773, 0.932] | 1.000 [1.000, 1.000] | 0.848 [0.769, 0.947] |

## Per-CV latency — selected run

Each cell is the measured CV×JD pair latency in seconds; no aggregation across JDs.

| CV | jd-py-real s | jd-hr-real s |
| --- | --- | --- |
| database-h1 | 41.069 | 6.421 |
| designer-h1 | 5.944 | 7.500 |
| devops-h1 | 21.802 | 26.326 |
| finance-h1 | 6.106 | 6.499 |
| hr-h1 | 6.742 | 7.796 |
| hr-h2 | 8.584 | 7.318 |
| hr-h3 | 6.654 | 7.057 |
| python_dev-h1 | 31.161 | 23.062 |
| python_dev-h2 | 29.093 | 24.342 |
| python_dev-h3 | 19.069 | 33.246 |

## Observations

The selected run met the observed p95 ≤40 s target (33.637 s), with a single 41.069 s pair; the 95% bootstrap interval for p95 extends to 41.069 s, so the point target is not a population guarantee. All eight launched hedges lost to the primary request, so this run provides no observed hedge wins and cannot attribute its latency to hedging.

Strict labels improve selected exact accuracy by 5.0 percentage points and collapsed κ by 0.0496, while reducing baseline exact accuracy by 7.14 points and collapsed κ by 0.1054. The selected run has higher exact/collapsed agreement and fit accuracy, but lower primary-label evidence F1 than baseline (0.848 versus 0.885); these are distinct rubric outcomes.

Both manifests report gateway response model `gemini-3.8-flash-n`, although the requested selectors differ (`ag/gemini-3.8-flash-low` versus `ag/gemini-3.8-flash-high`). The manifests preserve the requested selectors, but the response model name alone cannot independently verify the gateway’s low/high execution policy.

See operational and accuracy headline tables for the measured latency/quality difference and sensitivity. Hedge outcomes are metadata from successful responses; canceled losing requests may still consume gateway work, so token totals cannot establish full hedging cost.

- Selected Flash low / v2 / hedge20: 1 raw-to-validated level changes; fit errors: [].
- Baseline Flash high / v1 / no hedge: 2 raw-to-validated level changes; fit errors: [{"pair": "python_dev-h2__jd-hr-real", "label": "partial", "system": "poor"}].

## Limitations

- Labels are silver LLM annotations, not human ground truth; the Claude adjudicator shares a model family with one annotator, and masking was incomplete because note languages exposed identities. On the 20 disagreements the adjudicator matched Claude 14 times and GPT 5, with 1 neither; this can reflect self-preference.
- Dev-convention harmonisation overturned 15 raw agreements. The primary-versus-strict deltas above measure its observed effect on this fixed output; they do not establish which label policy is correct. Strict labels still retain adjudication of the 20 disagreements.
- Small n: 10 CVs, 20 pairs, 140 dependent criteria. The prescribed pair bootstrap preserves within-pair criteria but does not preserve dependence between the same CV under two JDs; intervals are descriptive, and no significance claim or population-wide speed guarantee follows. Success Wilson intervals also assume independent pairs.
- Shared-gateway latency varies over time; sequential runs avoid overlap but are not a controlled randomized speed experiment. Provider retries and hedging can add calls, and successful-response usage may omit canceled/failed attempts.
- python_dev-h3 has OCR-noisy text. It remains included under both JDs and both label variants; no cleanup, exclusion, or special tuning was applied.
- Fit is a deterministic rule-5 rubric proxy rather than a hiring recommendation. JD weights and scores are illustrative and uncalibrated; expected_group is sampling metadata and is never accuracy ground truth.

## Artifacts

- primary/ and strict/: unmodified evaluate.py metrics.json and report.md outputs.
- comparison/: unmodified compare.py diagnostic outputs (not accuracy).
- supplementary-metrics.json: operational CIs and absent-recall CIs.
- labels-strict/README.md: complete list of the 15 changed criteria.
- input-hashes.json and hash-validation.json: canonical-input and completed-manifest checks.
