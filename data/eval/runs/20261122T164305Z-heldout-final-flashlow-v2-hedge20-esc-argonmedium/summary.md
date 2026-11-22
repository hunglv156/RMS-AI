# Screening experiment

Sanity check only, not accuracy: expected groups are not ground truth.
Null scores mean insufficient coverage; excluded from group means/medians.
Coverage is known criterion weight / total weight; the published score is available only at min_coverage 0.8. Known-only score is a diagnostic weighted score over known criteria, even below that threshold.
Latency includes input verification and screening; excludes queue and persistence time.

Succeeded: 20/20
Latency seconds: {"population": "successful pairs; excludes queue and persistence time", "percentile_method": "linear interpolation at (n - 1) * quantile", "p50": 21.446964291491895, "p95": 93.9940474038609, "max": 107.47268912498839, "within_40_s": 11}
Tokens: {"input": 130449, "output": 18796, "total": 149245, "missing_usage_pairs": 0, "scope": "successful calls only; failed/retried call usage may be unreported"}
Quote verification: {"valid": 159, "total": 159, "rate": 1.0}

| CV | JD | Group | Status | Score | Coverage | Score state | Known-only diagnostic | Latency (s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| python_dev-h1 | jd-py-real | match_A | succeeded | 56.88 | 0.8 | scored | 56.88 | 17.510 |
| python_dev-h1 | jd-hr-real | match_A | succeeded | None | 0.65 | insufficient_coverage | 6.15 | 20.182 |
| python_dev-h2 | jd-py-real | match_A | succeeded | 50.0 | 0.9 | scored | 50.0 | 16.714 |
| python_dev-h2 | jd-hr-real | match_A | succeeded | None | 0.55 | insufficient_coverage | 0.0 | 76.039 |
| python_dev-h3 | jd-py-real | match_A | succeeded | 68.0 | 1.0 | scored | 68.0 | 84.891 |
| python_dev-h3 | jd-hr-real | match_A | succeeded | 13.0 | 1.0 | scored | 13.0 | 86.565 |
| devops-h1 | jd-py-real | partial_A | succeeded | None | 0.55 | insufficient_coverage | 36.36 | 93.285 |
| devops-h1 | jd-hr-real | partial_A | succeeded | None | 0.45 | insufficient_coverage | 0.0 | 83.358 |
| database-h1 | jd-py-real | partial_A | succeeded | None | 0.55 | insufficient_coverage | 47.27 | 74.120 |
| database-h1 | jd-hr-real | partial_A | succeeded | None | 0.5 | insufficient_coverage | 14.0 | 107.473 |
| hr-h1 | jd-py-real | match_B | succeeded | None | 0.3 | insufficient_coverage | 13.33 | 72.734 |
| hr-h1 | jd-hr-real | match_B | succeeded | 77.5 | 1.0 | scored | 77.5 | 69.374 |
| hr-h2 | jd-py-real | match_B | succeeded | None | 0.2 | insufficient_coverage | 0.0 | 5.484 |
| hr-h2 | jd-hr-real | match_B | succeeded | 61.18 | 0.85 | scored | 61.18 | 20.982 |
| hr-h3 | jd-py-real | match_B | succeeded | None | 0.3 | insufficient_coverage | 13.33 | 6.249 |
| hr-h3 | jd-hr-real | match_B | succeeded | 34.5 | 1.0 | scored | 34.5 | 21.912 |
| finance-h1 | jd-py-real | none | succeeded | None | 0.3 | insufficient_coverage | 23.33 | 4.923 |
| finance-h1 | jd-hr-real | none | succeeded | 21.25 | 0.8 | scored | 21.25 | 19.387 |
| designer-h1 | jd-py-real | none | succeeded | None | 0.3 | insufficient_coverage | 13.33 | 6.745 |
| designer-h1 | jd-hr-real | none | succeeded | None | 0.6 | insufficient_coverage | 61.67 | 8.149 |

## Group sanity check (not accuracy)

| Group | JD | Count | Published mean | Published median | Coverage mean | Coverage median | Known-only mean | Known-only median |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| match_A | jd-hr-real | 3 | 13.0 | 13.0 | 0.7333333333333334 | 0.65 | 6.383333333333334 | 6.15 |
| match_A | jd-py-real | 3 | 58.29333333333334 | 56.88 | 0.9 | 0.9 | 58.29333333333334 | 56.88 |
| match_B | jd-hr-real | 3 | 57.72666666666667 | 61.18 | 0.95 | 1.0 | 57.72666666666667 | 61.18 |
| match_B | jd-py-real | 3 | None | None | 0.26666666666666666 | 0.3 | 8.886666666666667 | 13.33 |
| none | jd-hr-real | 2 | 21.25 | 21.25 | 0.7 | 0.7 | 41.46 | 41.46 |
| none | jd-py-real | 2 | None | None | 0.3 | 0.3 | 18.33 | 18.33 |
| partial_A | jd-hr-real | 2 | None | None | 0.475 | 0.475 | 7.0 | 7.0 |
| partial_A | jd-py-real | 2 | None | None | 0.55 | 0.55 | 41.815 | 41.815 |

## Failures

[]

## Escalation

{"escalated_pairs": 8, "failed_pairs": 0, "reasons": {"needs_review": 2, "coverage_band": 6}, "latency_s": {"primary_latency_s": 790.0311790810374, "escalation_latency_s": 106.0090964170522, "total_latency_s": 896.0402754980896}}
