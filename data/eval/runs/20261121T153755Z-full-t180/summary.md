# Screening experiment

Sanity check only, not accuracy: expected groups are not ground truth.
Null scores mean insufficient coverage; excluded from group means/medians.
Coverage is known criterion weight / total weight; the published score is available only at min_coverage 0.8. Known-only score is a diagnostic weighted score over known criteria, even below that threshold.
Latency includes input verification and screening; excludes queue and persistence time.

Succeeded: 20/20
Latency seconds: {"population": "successful pairs; excludes queue and persistence time", "percentile_method": "linear interpolation at (n - 1) * quantile", "p50": 76.3799025210028, "p95": 266.51877293301806, "max": 290.176622458006, "within_40_s": 1}
Tokens: {"input": 198341, "output": 15874, "total": 214215, "missing_usage_pairs": 0, "scope": "successful calls only; failed/retried call usage may be unreported"}
Quote verification: {"valid": 131, "total": 140, "rate": 0.9357142857142857}

| CV | JD | Group | Status | Score | Coverage | Score state | Known-only diagnostic | Latency (s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| python_dev-01 | jd-a | match_A | succeeded | 91.0 | 1.0 | scored | 91.0 | 83.128 |
| python_dev-01 | jd-b | match_A | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 74.951 |
| python_dev-02 | jd-a | match_A | succeeded | None | 0.35 | insufficient_coverage | 48.57 | 120.190 |
| python_dev-02 | jd-b | match_A | succeeded | 64.38 | 0.8 | scored | 64.38 | 80.840 |
| python_dev-03 | jd-a | match_A | succeeded | None | 0.35 | insufficient_coverage | 48.57 | 78.607 |
| python_dev-03 | jd-b | match_A | succeeded | None | 0.55 | insufficient_coverage | 45.45 | 265.274 |
| devops-01 | jd-a | partial_A | succeeded | None | 0.75 | insufficient_coverage | 78.0 | 62.408 |
| devops-01 | jd-b | partial_A | succeeded | None | 0.25 | insufficient_coverage | 52.0 | 98.345 |
| database-01 | jd-a | partial_A | succeeded | None | 0.25 | insufficient_coverage | 52.0 | 67.041 |
| database-01 | jd-b | partial_A | succeeded | None | 0.65 | insufficient_coverage | 49.23 | 72.119 |
| hr-01 | jd-a | match_B | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 290.177 |
| hr-01 | jd-b | match_B | succeeded | 81.67 | 0.9 | scored | 81.67 | 73.365 |
| hr-02 | jd-a | match_B | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 61.940 |
| hr-02 | jd-b | match_B | succeeded | 94.0 | 1.0 | scored | 94.0 | 82.679 |
| hr-03 | jd-a | match_B | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 73.918 |
| hr-03 | jd-b | match_B | succeeded | 65.5 | 1.0 | scored | 65.5 | 76.566 |
| finance-01 | jd-a | none | succeeded | None | 0.0 | insufficient_coverage | None | 76.194 |
| finance-01 | jd-b | none | succeeded | None | 0.55 | insufficient_coverage | 70.0 | 94.737 |
| designer-01 | jd-a | none | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 21.649 |
| designer-01 | jd-b | none | succeeded | None | 0.25 | insufficient_coverage | 52.0 | 64.293 |

## Group sanity check (not accuracy)

| Group | JD | Count | Published mean | Published median | Coverage mean | Coverage median | Known-only mean | Known-only median |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| match_A | jd-a | 3 | 91.0 | 91.0 | 0.5666666666666667 | 0.35 | 62.71333333333333 | 48.57 |
| match_A | jd-b | 3 | 64.38 | 64.38 | 0.4833333333333334 | 0.55 | 59.943333333333335 | 64.38 |
| match_B | jd-a | 3 | None | None | 0.1 | 0.1 | 70.0 | 70.0 |
| match_B | jd-b | 3 | 80.39 | 81.67 | 0.9666666666666667 | 1.0 | 80.39 | 81.67 |
| none | jd-a | 2 | None | None | 0.05 | 0.05 | 70.0 | 70.0 |
| none | jd-b | 2 | None | None | 0.4 | 0.4 | 61.0 | 61.0 |
| partial_A | jd-a | 2 | None | None | 0.5 | 0.5 | 65.0 | 65.0 |
| partial_A | jd-b | 2 | None | None | 0.45 | 0.45 | 50.614999999999995 | 50.614999999999995 |

## Failures

[]
