# Screening experiment

Sanity check only, not accuracy: expected groups are not ground truth.
Null scores mean insufficient coverage; excluded from group means/medians.
Coverage is known criterion weight / total weight; the published score is available only at min_coverage 0.8. Known-only score is a diagnostic weighted score over known criteria, even below that threshold.
Latency includes input verification and screening; excludes queue and persistence time.

Succeeded: 20/20
Latency seconds: {"population": "successful pairs; excludes queue and persistence time", "percentile_method": "linear interpolation at (n - 1) * quantile", "p50": 35.784179812515504, "p95": 81.82576743061655, "max": 99.7370938330132, "within_40_s": 12}
Tokens: {"input": 147243, "output": 15138, "total": 162381, "missing_usage_pairs": 0, "scope": "successful calls only; failed/retried call usage may be unreported"}
Quote verification: {"valid": 119, "total": 120, "rate": 0.9916666666666667}

| CV | JD | Group | Status | Score | Coverage | Score state | Known-only diagnostic | Latency (s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| python_dev-01 | jd-a | match_A | succeeded | 91.0 | 1.0 | scored | 91.0 | 35.606 |
| python_dev-01 | jd-b | match_A | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 45.800 |
| python_dev-02 | jd-a | match_A | succeeded | None | 0.35 | insufficient_coverage | 48.57 | 60.322 |
| python_dev-02 | jd-b | match_A | succeeded | 75.62 | 0.8 | scored | 75.62 | 52.382 |
| python_dev-03 | jd-a | match_A | succeeded | None | 0.35 | insufficient_coverage | 48.57 | 33.524 |
| python_dev-03 | jd-b | match_A | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 30.775 |
| devops-01 | jd-a | partial_A | succeeded | None | 0.75 | insufficient_coverage | 78.0 | 48.029 |
| devops-01 | jd-b | partial_A | succeeded | None | 0.25 | insufficient_coverage | 52.0 | 42.452 |
| database-01 | jd-a | partial_A | succeeded | None | 0.35 | insufficient_coverage | 48.57 | 34.593 |
| database-01 | jd-b | partial_A | succeeded | None | 0.65 | insufficient_coverage | 49.23 | 34.153 |
| hr-01 | jd-a | match_B | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 19.707 |
| hr-01 | jd-b | match_B | succeeded | 81.67 | 0.9 | scored | 81.67 | 55.858 |
| hr-02 | jd-a | match_B | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 30.228 |
| hr-02 | jd-b | match_B | succeeded | 96.67 | 0.9 | scored | 96.67 | 33.251 |
| hr-03 | jd-a | match_B | succeeded | None | 0.0 | insufficient_coverage | None | 80.883 |
| hr-03 | jd-b | match_B | succeeded | 71.5 | 1.0 | scored | 71.5 | 35.963 |
| finance-01 | jd-a | none | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 99.737 |
| finance-01 | jd-b | none | succeeded | None | 0.55 | insufficient_coverage | 61.82 | 38.282 |
| designer-01 | jd-a | none | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 23.356 |
| designer-01 | jd-b | none | succeeded | None | 0.0 | insufficient_coverage | None | 10.663 |

## Group sanity check (not accuracy)

| Group | JD | Count | Published mean | Published median | Coverage mean | Coverage median | Known-only mean | Known-only median |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| match_A | jd-a | 3 | 91.0 | 91.0 | 0.5666666666666667 | 0.35 | 62.71333333333333 | 48.57 |
| match_A | jd-b | 3 | 75.62 | 75.62 | 0.33333333333333337 | 0.1 | 71.87333333333333 | 70.0 |
| match_B | jd-a | 3 | None | None | 0.06666666666666667 | 0.1 | 70.0 | 70.0 |
| match_B | jd-b | 3 | 83.28 | 81.67 | 0.9333333333333333 | 0.9 | 83.28 | 81.67 |
| none | jd-a | 2 | None | None | 0.1 | 0.1 | 70.0 | 70.0 |
| none | jd-b | 2 | None | None | 0.275 | 0.275 | 61.82 | 61.82 |
| partial_A | jd-a | 2 | None | None | 0.55 | 0.55 | 63.285 | 63.285 |
| partial_A | jd-b | 2 | None | None | 0.45 | 0.45 | 50.614999999999995 | 50.614999999999995 |

## Failures

[]
