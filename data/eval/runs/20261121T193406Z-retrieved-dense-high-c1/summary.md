# Screening experiment

Sanity check only, not accuracy: expected groups are not ground truth.
Null scores mean insufficient coverage; excluded from group means/medians.
Coverage is known criterion weight / total weight; the published score is available only at min_coverage 0.8. Known-only score is a diagnostic weighted score over known criteria, even below that threshold.
Latency includes input verification and screening; excludes queue and persistence time.

Succeeded: 20/20
Latency seconds: {"population": "successful pairs; excludes queue and persistence time", "percentile_method": "linear interpolation at (n - 1) * quantile", "p50": 46.85210685450875, "p95": 225.319916740191, "max": 469.37168495799415, "within_40_s": 8}
Tokens: {"input": 196296, "output": 15910, "total": 212206, "missing_usage_pairs": 0, "scope": "successful calls only; failed/retried call usage may be unreported"}
Quote verification: {"valid": 130, "total": 132, "rate": 0.9848484848484849}

| CV | JD | Group | Status | Score | Coverage | Score state | Known-only diagnostic | Latency (s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| python_dev-01 | jd-a | match_A | succeeded | 91.0 | 1.0 | scored | 91.0 | 469.372 |
| python_dev-01 | jd-b | match_A | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 37.193 |
| python_dev-02 | jd-a | match_A | succeeded | None | 0.35 | insufficient_coverage | 57.14 | 94.933 |
| python_dev-02 | jd-b | match_A | succeeded | None | 0.65 | insufficient_coverage | 58.46 | 45.642 |
| python_dev-03 | jd-a | match_A | succeeded | None | 0.35 | insufficient_coverage | 48.57 | 31.111 |
| python_dev-03 | jd-b | match_A | succeeded | None | 0.25 | insufficient_coverage | 52.0 | 171.108 |
| devops-01 | jd-a | partial_A | succeeded | None | 0.75 | insufficient_coverage | 78.0 | 36.139 |
| devops-01 | jd-b | partial_A | succeeded | None | 0.25 | insufficient_coverage | 52.0 | 50.263 |
| database-01 | jd-a | partial_A | succeeded | None | 0.35 | insufficient_coverage | 48.57 | 31.183 |
| database-01 | jd-b | partial_A | succeeded | None | 0.65 | insufficient_coverage | 49.23 | 41.643 |
| hr-01 | jd-a | match_B | succeeded | None | 0.2 | insufficient_coverage | 70.0 | 69.811 |
| hr-01 | jd-b | match_B | succeeded | 81.67 | 0.9 | scored | 81.67 | 49.872 |
| hr-02 | jd-a | match_B | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 29.486 |
| hr-02 | jd-b | match_B | succeeded | 96.67 | 0.9 | scored | 96.67 | 63.388 |
| hr-03 | jd-a | match_B | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 212.475 |
| hr-03 | jd-b | match_B | succeeded | 71.5 | 1.0 | scored | 71.5 | 32.765 |
| finance-01 | jd-a | none | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 32.113 |
| finance-01 | jd-b | none | succeeded | None | 0.7 | insufficient_coverage | 63.57 | 48.063 |
| designer-01 | jd-a | none | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 23.242 |
| designer-01 | jd-b | none | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 66.457 |

## Group sanity check (not accuracy)

| Group | JD | Count | Published mean | Published median | Coverage mean | Coverage median | Known-only mean | Known-only median |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| match_A | jd-a | 3 | 91.0 | 91.0 | 0.5666666666666667 | 0.35 | 65.57 | 57.14 |
| match_A | jd-b | 3 | None | None | 0.33333333333333337 | 0.25 | 60.153333333333336 | 58.46 |
| match_B | jd-a | 3 | None | None | 0.13333333333333333 | 0.1 | 70.0 | 70.0 |
| match_B | jd-b | 3 | 83.28 | 81.67 | 0.9333333333333333 | 0.9 | 83.28 | 81.67 |
| none | jd-a | 2 | None | None | 0.1 | 0.1 | 70.0 | 70.0 |
| none | jd-b | 2 | None | None | 0.39999999999999997 | 0.39999999999999997 | 66.785 | 66.785 |
| partial_A | jd-a | 2 | None | None | 0.55 | 0.55 | 63.285 | 63.285 |
| partial_A | jd-b | 2 | None | None | 0.45 | 0.45 | 50.614999999999995 | 50.614999999999995 |

## Failures

[]
