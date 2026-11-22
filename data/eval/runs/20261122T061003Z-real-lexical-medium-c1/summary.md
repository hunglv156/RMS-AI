# Screening experiment

Sanity check only, not accuracy: expected groups are not ground truth.
Null scores mean insufficient coverage; excluded from group means/medians.
Coverage is known criterion weight / total weight; the published score is available only at min_coverage 0.8. Known-only score is a diagnostic weighted score over known criteria, even below that threshold.
Latency includes input verification and screening; excludes queue and persistence time.

Succeeded: 20/20
Latency seconds: {"population": "successful pairs; excludes queue and persistence time", "percentile_method": "linear interpolation at (n - 1) * quantile", "p50": 43.28745025000535, "p95": 99.1036609080199, "max": 225.1873322080064, "within_40_s": 10}
Tokens: {"input": 118690, "output": 19695, "total": 138385, "missing_usage_pairs": 0, "scope": "successful calls only; failed/retried call usage may be unreported"}
Quote verification: {"valid": 119, "total": 141, "rate": 0.8439716312056738}

| CV | JD | Group | Status | Score | Coverage | Score state | Known-only diagnostic | Latency (s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| python_dev-01 | jd-py-real | match_A | succeeded | 68.33 | 0.9 | scored | 68.33 | 25.372 |
| python_dev-01 | jd-hr-real | match_A | succeeded | None | 0.1 | insufficient_coverage | 40.0 | 27.908 |
| python_dev-02 | jd-py-real | match_A | succeeded | None | 0.1 | insufficient_coverage | 40.0 | 31.882 |
| python_dev-02 | jd-hr-real | match_A | succeeded | None | 0.35 | insufficient_coverage | 57.14 | 60.211 |
| python_dev-03 | jd-py-real | match_A | succeeded | None | 0.65 | insufficient_coverage | 60.77 | 48.042 |
| python_dev-03 | jd-hr-real | match_A | succeeded | None | 0.1 | insufficient_coverage | 40.0 | 47.186 |
| devops-01 | jd-py-real | partial_A | succeeded | None | 0.4 | insufficient_coverage | 70.0 | 32.795 |
| devops-01 | jd-hr-real | partial_A | succeeded | None | 0.1 | insufficient_coverage | 40.0 | 56.476 |
| database-01 | jd-py-real | partial_A | succeeded | None | 0.3 | insufficient_coverage | 60.0 | 61.298 |
| database-01 | jd-hr-real | partial_A | succeeded | None | 0.2 | insufficient_coverage | 55.0 | 69.161 |
| hr-01 | jd-py-real | match_B | succeeded | None | 0.1 | insufficient_coverage | 40.0 | 68.704 |
| hr-01 | jd-hr-real | match_B | succeeded | 66.67 | 0.9 | scored | 66.67 | 92.468 |
| hr-02 | jd-py-real | match_B | succeeded | None | 0.1 | insufficient_coverage | 40.0 | 225.187 |
| hr-02 | jd-hr-real | match_B | succeeded | 89.5 | 1.0 | scored | 89.5 | 39.389 |
| hr-03 | jd-py-real | match_B | succeeded | None | 0.0 | insufficient_coverage | None | 48.718 |
| hr-03 | jd-hr-real | match_B | succeeded | 61.67 | 0.9 | scored | 61.67 | 26.119 |
| finance-01 | jd-py-real | none | succeeded | None | 0.1 | insufficient_coverage | 40.0 | 18.650 |
| finance-01 | jd-hr-real | none | succeeded | None | 0.1 | insufficient_coverage | 40.0 | 26.297 |
| designer-01 | jd-py-real | none | succeeded | None | 0.0 | insufficient_coverage | None | 15.572 |
| designer-01 | jd-hr-real | none | succeeded | None | 0.1 | insufficient_coverage | 40.0 | 20.358 |

## Group sanity check (not accuracy)

| Group | JD | Count | Published mean | Published median | Coverage mean | Coverage median | Known-only mean | Known-only median |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| match_A | jd-hr-real | 3 | None | None | 0.18333333333333332 | 0.1 | 45.71333333333333 | 40.0 |
| match_A | jd-py-real | 3 | 68.33 | 68.33 | 0.55 | 0.65 | 56.36666666666667 | 60.77 |
| match_B | jd-hr-real | 3 | 72.61333333333333 | 66.67 | 0.9333333333333333 | 0.9 | 72.61333333333333 | 66.67 |
| match_B | jd-py-real | 3 | None | None | 0.06666666666666667 | 0.1 | 40.0 | 40.0 |
| none | jd-hr-real | 2 | None | None | 0.1 | 0.1 | 40.0 | 40.0 |
| none | jd-py-real | 2 | None | None | 0.05 | 0.05 | 40.0 | 40.0 |
| partial_A | jd-hr-real | 2 | None | None | 0.15000000000000002 | 0.15000000000000002 | 47.5 | 47.5 |
| partial_A | jd-py-real | 2 | None | None | 0.35 | 0.35 | 65.0 | 65.0 |

## Failures

[]
