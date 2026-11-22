# Screening experiment

Sanity check only, not accuracy: expected groups are not ground truth.
Null scores mean insufficient coverage; excluded from group means/medians.
Coverage is known criterion weight / total weight; the published score is available only at min_coverage 0.8. Known-only score is a diagnostic weighted score over known criteria, even below that threshold.
Latency includes input verification and screening; excludes queue and persistence time.

Succeeded: 20/20
Latency seconds: {"population": "successful pairs; excludes queue and persistence time", "percentile_method": "linear interpolation at (n - 1) * quantile", "p50": 61.4886172710103, "p95": 103.7904745389591, "max": 109.10302174999379, "within_40_s": 2}
Tokens: {"input": 199625, "output": 21152, "total": 220777, "missing_usage_pairs": 0, "scope": "successful calls only; failed/retried call usage may be unreported"}
Quote verification: {"valid": 147, "total": 156, "rate": 0.9423076923076923}

| CV | JD | Group | Status | Score | Coverage | Score state | Known-only diagnostic | Latency (s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| python_dev-01 | jd-py-real | match_A | succeeded | 63.33 | 0.9 | scored | 63.33 | 63.987 |
| python_dev-01 | jd-hr-real | match_A | succeeded | None | 0.2 | insufficient_coverage | 40.0 | 42.545 |
| python_dev-02 | jd-py-real | match_A | succeeded | None | 0.1 | insufficient_coverage | 40.0 | 37.166 |
| python_dev-02 | jd-hr-real | match_A | succeeded | None | 0.6 | insufficient_coverage | 50.0 | 76.673 |
| python_dev-03 | jd-py-real | match_A | succeeded | None | 0.65 | insufficient_coverage | 42.31 | 55.494 |
| python_dev-03 | jd-hr-real | match_A | succeeded | None | 0.2 | insufficient_coverage | 40.0 | 103.511 |
| devops-01 | jd-py-real | partial_A | succeeded | None | 0.4 | insufficient_coverage | 51.25 | 109.103 |
| devops-01 | jd-hr-real | partial_A | succeeded | None | 0.1 | insufficient_coverage | 40.0 | 37.231 |
| database-01 | jd-py-real | partial_A | succeeded | None | 0.3 | insufficient_coverage | 50.0 | 48.632 |
| database-01 | jd-hr-real | partial_A | succeeded | None | 0.35 | insufficient_coverage | 48.57 | 48.278 |
| hr-01 | jd-py-real | match_B | succeeded | None | 0.1 | insufficient_coverage | 40.0 | 62.972 |
| hr-01 | jd-hr-real | match_B | succeeded | 61.67 | 0.9 | scored | 61.67 | 60.005 |
| hr-02 | jd-py-real | match_B | succeeded | None | 0.1 | insufficient_coverage | 40.0 | 42.138 |
| hr-02 | jd-hr-real | match_B | succeeded | 82.0 | 1.0 | scored | 82.0 | 58.513 |
| hr-03 | jd-py-real | match_B | succeeded | None | 0.0 | insufficient_coverage | None | 63.689 |
| hr-03 | jd-hr-real | match_B | succeeded | 61.67 | 0.9 | scored | 61.67 | 47.070 |
| finance-01 | jd-py-real | none | succeeded | None | 0.1 | insufficient_coverage | 40.0 | 75.021 |
| finance-01 | jd-hr-real | none | succeeded | None | 0.5 | insufficient_coverage | 40.0 | 101.130 |
| designer-01 | jd-py-real | none | succeeded | None | 0.0 | insufficient_coverage | None | 70.402 |
| designer-01 | jd-hr-real | none | succeeded | None | 0.1 | insufficient_coverage | 40.0 | 68.951 |

## Group sanity check (not accuracy)

| Group | JD | Count | Published mean | Published median | Coverage mean | Coverage median | Known-only mean | Known-only median |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| match_A | jd-hr-real | 3 | None | None | 0.3333333333333333 | 0.2 | 43.333333333333336 | 40.0 |
| match_A | jd-py-real | 3 | 63.33 | 63.33 | 0.55 | 0.65 | 48.54666666666667 | 42.31 |
| match_B | jd-hr-real | 3 | 68.44666666666667 | 61.67 | 0.9333333333333333 | 0.9 | 68.44666666666667 | 61.67 |
| match_B | jd-py-real | 3 | None | None | 0.06666666666666667 | 0.1 | 40.0 | 40.0 |
| none | jd-hr-real | 2 | None | None | 0.3 | 0.3 | 40.0 | 40.0 |
| none | jd-py-real | 2 | None | None | 0.05 | 0.05 | 40.0 | 40.0 |
| partial_A | jd-hr-real | 2 | None | None | 0.22499999999999998 | 0.22499999999999998 | 44.285 | 44.285 |
| partial_A | jd-py-real | 2 | None | None | 0.35 | 0.35 | 50.625 | 50.625 |

## Failures

[]
