# Screening experiment

Sanity check only, not accuracy: expected groups are not ground truth.
Null scores mean insufficient coverage; excluded from group means/medians.
Coverage is known criterion weight / total weight; the published score is available only at min_coverage 0.8. Known-only score is a diagnostic weighted score over known criteria, even below that threshold.
Latency includes input verification and screening; excludes queue and persistence time.

Succeeded: 20/20
Latency seconds: {"population": "successful pairs; excludes queue and persistence time", "percentile_method": "linear interpolation at (n - 1) * quantile", "p50": 22.071836437506136, "p95": 33.97514694199345, "max": 39.09745716699399, "within_40_s": 20}
Tokens: {"input": 117536, "output": 14786, "total": 132322, "missing_usage_pairs": 0, "scope": "successful calls only; failed/retried call usage may be unreported"}
Quote verification: {"valid": 99, "total": 130, "rate": 0.7615384615384615}

| CV | JD | Group | Status | Score | Coverage | Score state | Known-only diagnostic | Latency (s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| python_dev-01 | jd-a | match_A | succeeded | None | 0.75 | insufficient_coverage | 88.0 | 21.014 |
| python_dev-01 | jd-b | match_A | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 26.398 |
| python_dev-02 | jd-a | match_A | succeeded | None | 0.0 | insufficient_coverage | None | 33.706 |
| python_dev-02 | jd-b | match_A | succeeded | None | 0.4 | insufficient_coverage | 62.5 | 39.097 |
| python_dev-03 | jd-a | match_A | succeeded | None | 0.35 | insufficient_coverage | 48.57 | 21.108 |
| python_dev-03 | jd-b | match_A | succeeded | None | 0.55 | insufficient_coverage | 45.45 | 23.036 |
| devops-01 | jd-a | partial_A | succeeded | None | 0.65 | insufficient_coverage | 79.23 | 18.841 |
| devops-01 | jd-b | partial_A | succeeded | None | 0.25 | insufficient_coverage | 52.0 | 26.689 |
| database-01 | jd-a | partial_A | succeeded | None | 0.35 | insufficient_coverage | 48.57 | 31.153 |
| database-01 | jd-b | partial_A | succeeded | None | 0.65 | insufficient_coverage | 49.23 | 23.754 |
| hr-01 | jd-a | match_B | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 13.450 |
| hr-01 | jd-b | match_B | succeeded | 88.33 | 0.9 | scored | 88.33 | 24.930 |
| hr-02 | jd-a | match_B | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 14.649 |
| hr-02 | jd-b | match_B | succeeded | 94.0 | 1.0 | scored | 94.0 | 25.304 |
| hr-03 | jd-a | match_B | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 16.749 |
| hr-03 | jd-b | match_B | succeeded | 82.0 | 1.0 | scored | 82.0 | 25.005 |
| finance-01 | jd-a | none | succeeded | None | 0.0 | insufficient_coverage | None | 15.429 |
| finance-01 | jd-b | none | succeeded | None | 0.15 | insufficient_coverage | 70.0 | 14.563 |
| designer-01 | jd-a | none | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 18.863 |
| designer-01 | jd-b | none | succeeded | None | 0.25 | insufficient_coverage | 52.0 | 14.843 |

## Group sanity check (not accuracy)

| Group | JD | Count | Published mean | Published median | Coverage mean | Coverage median | Known-only mean | Known-only median |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| match_A | jd-a | 3 | None | None | 0.36666666666666664 | 0.35 | 68.285 | 68.285 |
| match_A | jd-b | 3 | None | None | 0.35000000000000003 | 0.4 | 59.31666666666667 | 62.5 |
| match_B | jd-a | 3 | None | None | 0.1 | 0.1 | 70.0 | 70.0 |
| match_B | jd-b | 3 | 88.11 | 88.33 | 0.9666666666666667 | 1.0 | 88.11 | 88.33 |
| none | jd-a | 2 | None | None | 0.05 | 0.05 | 70.0 | 70.0 |
| none | jd-b | 2 | None | None | 0.2 | 0.2 | 61.0 | 61.0 |
| partial_A | jd-a | 2 | None | None | 0.5 | 0.5 | 63.900000000000006 | 63.900000000000006 |
| partial_A | jd-b | 2 | None | None | 0.45 | 0.45 | 50.614999999999995 | 50.614999999999995 |

## Failures

[]
