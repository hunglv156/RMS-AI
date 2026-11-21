# Screening experiment

Sanity check only, not accuracy: expected groups are not ground truth.
Null scores mean insufficient coverage; excluded from group means/medians.
Coverage is known criterion weight / total weight; the published score is available only at min_coverage 0.8. Known-only score is a diagnostic weighted score over known criteria, even below that threshold.
Latency includes input verification and screening; excludes queue and persistence time.

Succeeded: 20/20
Latency seconds: {"population": "successful pairs; excludes queue and persistence time", "percentile_method": "linear interpolation at (n - 1) * quantile", "p50": 38.7813363539899, "p95": 96.0435970768027, "max": 101.47619095898699, "within_40_s": 12}
Tokens: {"input": 175600, "output": 16062, "total": 191662, "missing_usage_pairs": 0, "scope": "successful calls only; failed/retried call usage may be unreported"}
Quote verification: {"valid": 131, "total": 144, "rate": 0.9097222222222222}

| CV | JD | Group | Status | Score | Coverage | Score state | Known-only diagnostic | Latency (s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| python_dev-01 | jd-a | match_A | succeeded | 91.0 | 1.0 | scored | 91.0 | 40.497 |
| python_dev-01 | jd-b | match_A | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 101.476 |
| python_dev-02 | jd-a | match_A | succeeded | None | 0.2 | insufficient_coverage | 70.0 | 95.758 |
| python_dev-02 | jd-b | match_A | succeeded | None | 0.65 | insufficient_coverage | 63.08 | 39.027 |
| python_dev-03 | jd-a | match_A | succeeded | None | 0.35 | insufficient_coverage | 48.57 | 30.077 |
| python_dev-03 | jd-b | match_A | succeeded | None | 0.55 | insufficient_coverage | 45.45 | 56.002 |
| devops-01 | jd-a | partial_A | succeeded | None | 0.65 | insufficient_coverage | 79.23 | 36.727 |
| devops-01 | jd-b | partial_A | succeeded | None | 0.25 | insufficient_coverage | 52.0 | 66.699 |
| database-01 | jd-a | partial_A | succeeded | None | 0.35 | insufficient_coverage | 48.57 | 31.772 |
| database-01 | jd-b | partial_A | succeeded | None | 0.65 | insufficient_coverage | 49.23 | 30.199 |
| hr-01 | jd-a | match_B | succeeded | None | 0.2 | insufficient_coverage | 70.0 | 56.196 |
| hr-01 | jd-b | match_B | succeeded | 76.67 | 0.9 | scored | 76.67 | 55.607 |
| hr-02 | jd-a | match_B | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 32.030 |
| hr-02 | jd-b | match_B | succeeded | 91.0 | 1.0 | scored | 91.0 | 60.163 |
| hr-03 | jd-a | match_B | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 32.825 |
| hr-03 | jd-b | match_B | succeeded | 82.0 | 1.0 | scored | 82.0 | 37.582 |
| finance-01 | jd-a | none | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 26.106 |
| finance-01 | jd-b | none | succeeded | None | 0.55 | insufficient_coverage | 70.0 | 38.536 |
| designer-01 | jd-a | none | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 22.390 |
| designer-01 | jd-b | none | succeeded | None | 0.25 | insufficient_coverage | 52.0 | 39.424 |

## Group sanity check (not accuracy)

| Group | JD | Count | Published mean | Published median | Coverage mean | Coverage median | Known-only mean | Known-only median |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| match_A | jd-a | 3 | 91.0 | 91.0 | 0.5166666666666666 | 0.35 | 69.85666666666667 | 70.0 |
| match_A | jd-b | 3 | None | None | 0.43333333333333335 | 0.55 | 59.51 | 63.08 |
| match_B | jd-a | 3 | None | None | 0.13333333333333333 | 0.1 | 70.0 | 70.0 |
| match_B | jd-b | 3 | 83.22333333333333 | 82.0 | 0.9666666666666667 | 1.0 | 83.22333333333333 | 82.0 |
| none | jd-a | 2 | None | None | 0.1 | 0.1 | 70.0 | 70.0 |
| none | jd-b | 2 | None | None | 0.4 | 0.4 | 61.0 | 61.0 |
| partial_A | jd-a | 2 | None | None | 0.5 | 0.5 | 63.900000000000006 | 63.900000000000006 |
| partial_A | jd-b | 2 | None | None | 0.45 | 0.45 | 50.614999999999995 | 50.614999999999995 |

## Failures

[]
