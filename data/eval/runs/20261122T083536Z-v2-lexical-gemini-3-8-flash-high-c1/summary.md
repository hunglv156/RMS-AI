# Screening experiment

Sanity check only, not accuracy: expected groups are not ground truth.
Null scores mean insufficient coverage; excluded from group means/medians.
Coverage is known criterion weight / total weight; the published score is available only at min_coverage 0.8. Known-only score is a diagnostic weighted score over known criteria, even below that threshold.
Latency includes input verification and screening; excludes queue and persistence time.

Succeeded: 20/20
Latency seconds: {"population": "successful pairs; excludes queue and persistence time", "percentile_method": "linear interpolation at (n - 1) * quantile", "p50": 82.54929012501088, "p95": 156.63759321845293, "max": 320.4804786669847, "within_40_s": 3}
Tokens: {"input": 245336, "output": 18293, "total": 263629, "missing_usage_pairs": 0, "scope": "successful calls only; failed/retried call usage may be unreported"}
Quote verification: {"valid": 145, "total": 153, "rate": 0.9477124183006536}

| CV | JD | Group | Status | Score | Coverage | Score state | Known-only diagnostic | Latency (s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| python_dev-01 | jd-py-real | match_A | succeeded | None | 0.7 | insufficient_coverage | 65.71 | 83.696 |
| python_dev-01 | jd-hr-real | match_A | succeeded | None | 0.65 | insufficient_coverage | 6.15 | 94.425 |
| python_dev-02 | jd-py-real | match_A | succeeded | None | 0.3 | insufficient_coverage | 13.33 | 34.591 |
| python_dev-02 | jd-hr-real | match_A | succeeded | None | 0.7 | insufficient_coverage | 8.57 | 90.987 |
| python_dev-03 | jd-py-real | match_A | succeeded | None | 0.55 | insufficient_coverage | 61.82 | 134.832 |
| python_dev-03 | jd-hr-real | match_A | succeeded | None | 0.65 | insufficient_coverage | 6.15 | 43.493 |
| devops-01 | jd-py-real | partial_A | succeeded | None | 0.4 | insufficient_coverage | 53.75 | 76.666 |
| devops-01 | jd-hr-real | partial_A | succeeded | None | 0.65 | insufficient_coverage | 6.15 | 85.530 |
| database-01 | jd-py-real | partial_A | succeeded | None | 0.3 | insufficient_coverage | 30.0 | 42.787 |
| database-01 | jd-hr-real | partial_A | succeeded | None | 0.65 | insufficient_coverage | 16.92 | 148.014 |
| hr-01 | jd-py-real | match_B | succeeded | None | 0.3 | insufficient_coverage | 13.33 | 67.896 |
| hr-01 | jd-hr-real | match_B | succeeded | 60.0 | 1.0 | scored | 60.0 | 38.864 |
| hr-02 | jd-py-real | match_B | succeeded | None | 0.3 | insufficient_coverage | 13.33 | 52.222 |
| hr-02 | jd-hr-real | match_B | succeeded | 86.5 | 1.0 | scored | 86.5 | 81.402 |
| hr-03 | jd-py-real | match_B | succeeded | None | 0.2 | insufficient_coverage | 0.0 | 30.515 |
| hr-03 | jd-hr-real | match_B | succeeded | 61.67 | 0.9 | scored | 61.67 | 115.193 |
| finance-01 | jd-py-real | none | succeeded | None | 0.25 | insufficient_coverage | 16.0 | 95.950 |
| finance-01 | jd-hr-real | none | succeeded | None | 0.55 | insufficient_coverage | 21.82 | 320.480 |
| designer-01 | jd-py-real | none | succeeded | None | 0.2 | insufficient_coverage | 0.0 | 41.153 |
| designer-01 | jd-hr-real | none | succeeded | None | 0.65 | insufficient_coverage | 6.15 | 121.578 |

## Group sanity check (not accuracy)

| Group | JD | Count | Published mean | Published median | Coverage mean | Coverage median | Known-only mean | Known-only median |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| match_A | jd-hr-real | 3 | None | None | 0.6666666666666666 | 0.65 | 6.956666666666667 | 6.15 |
| match_A | jd-py-real | 3 | None | None | 0.5166666666666666 | 0.55 | 46.95333333333333 | 61.82 |
| match_B | jd-hr-real | 3 | 69.39 | 61.67 | 0.9666666666666667 | 1.0 | 69.39 | 61.67 |
| match_B | jd-py-real | 3 | None | None | 0.26666666666666666 | 0.3 | 8.886666666666667 | 13.33 |
| none | jd-hr-real | 2 | None | None | 0.6000000000000001 | 0.6000000000000001 | 13.985 | 13.985 |
| none | jd-py-real | 2 | None | None | 0.225 | 0.225 | 8.0 | 8.0 |
| partial_A | jd-hr-real | 2 | None | None | 0.65 | 0.65 | 11.535 | 11.535 |
| partial_A | jd-py-real | 2 | None | None | 0.35 | 0.35 | 41.875 | 41.875 |

## Failures

[]
