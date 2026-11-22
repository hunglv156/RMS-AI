# Screening experiment

Sanity check only, not accuracy: expected groups are not ground truth.
Null scores mean insufficient coverage; excluded from group means/medians.
Coverage is known criterion weight / total weight; the published score is available only at min_coverage 0.8. Known-only score is a diagnostic weighted score over known criteria, even below that threshold.
Latency includes input verification and screening; excludes queue and persistence time.

Succeeded: 20/20
Latency seconds: {"population": "successful pairs; excludes queue and persistence time", "percentile_method": "linear interpolation at (n - 1) * quantile", "p50": 7.214452667001751, "p95": 26.518317848183525, "max": 53.697267915995326, "within_40_s": 19}
Tokens: {"input": 97428, "output": 12538, "total": 109966, "missing_usage_pairs": 0, "scope": "successful calls only; failed/retried call usage may be unreported"}
Quote verification: {"valid": 131, "total": 139, "rate": 0.9424460431654677}

| CV | JD | Group | Status | Score | Coverage | Score state | Known-only diagnostic | Latency (s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| python_dev-01 | jd-py-real | match_A | succeeded | None | 0.55 | insufficient_coverage | 78.18 | 7.270 |
| python_dev-01 | jd-hr-real | match_A | succeeded | None | 0.7 | insufficient_coverage | 0.0 | 7.427 |
| python_dev-02 | jd-py-real | match_A | succeeded | None | 0.3 | insufficient_coverage | 23.33 | 6.522 |
| python_dev-02 | jd-hr-real | match_A | succeeded | None | 0.75 | insufficient_coverage | 17.33 | 7.602 |
| python_dev-03 | jd-py-real | match_A | succeeded | None | 0.55 | insufficient_coverage | 64.55 | 6.037 |
| python_dev-03 | jd-hr-real | match_A | succeeded | None | 0.65 | insufficient_coverage | 6.15 | 6.242 |
| devops-01 | jd-py-real | partial_A | succeeded | None | 0.4 | insufficient_coverage | 72.5 | 6.995 |
| devops-01 | jd-hr-real | partial_A | succeeded | None | 0.6 | insufficient_coverage | 6.67 | 6.217 |
| database-01 | jd-py-real | partial_A | succeeded | None | 0.3 | insufficient_coverage | 40.0 | 7.248 |
| database-01 | jd-hr-real | partial_A | succeeded | None | 0.75 | insufficient_coverage | 26.67 | 7.673 |
| hr-01 | jd-py-real | match_B | succeeded | None | 0.2 | insufficient_coverage | 0.0 | 6.299 |
| hr-01 | jd-hr-real | match_B | succeeded | 63.0 | 1.0 | scored | 63.0 | 6.920 |
| hr-02 | jd-py-real | match_B | succeeded | None | 0.3 | insufficient_coverage | 23.33 | 7.363 |
| hr-02 | jd-hr-real | match_B | succeeded | 94.0 | 1.0 | scored | 94.0 | 8.309 |
| hr-03 | jd-py-real | match_B | succeeded | None | 0.3 | insufficient_coverage | 13.33 | 6.101 |
| hr-03 | jd-hr-real | match_B | succeeded | 70.0 | 0.9 | scored | 70.0 | 7.181 |
| finance-01 | jd-py-real | none | succeeded | None | 0.25 | insufficient_coverage | 16.0 | 6.835 |
| finance-01 | jd-hr-real | none | succeeded | None | 0.7 | insufficient_coverage | 32.86 | 7.405 |
| designer-01 | jd-py-real | none | succeeded | None | 0.2 | insufficient_coverage | 0.0 | 25.088 |
| designer-01 | jd-hr-real | none | succeeded | None | 0.6 | insufficient_coverage | 6.67 | 53.697 |

## Group sanity check (not accuracy)

| Group | JD | Count | Published mean | Published median | Coverage mean | Coverage median | Known-only mean | Known-only median |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| match_A | jd-hr-real | 3 | None | None | 0.7 | 0.7 | 7.826666666666666 | 6.15 |
| match_A | jd-py-real | 3 | None | None | 0.4666666666666667 | 0.55 | 55.35333333333333 | 64.55 |
| match_B | jd-hr-real | 3 | 75.66666666666667 | 70.0 | 0.9666666666666667 | 1.0 | 75.66666666666667 | 70.0 |
| match_B | jd-py-real | 3 | None | None | 0.26666666666666666 | 0.3 | 12.219999999999999 | 13.33 |
| none | jd-hr-real | 2 | None | None | 0.6499999999999999 | 0.6499999999999999 | 19.765 | 19.765 |
| none | jd-py-real | 2 | None | None | 0.225 | 0.225 | 8.0 | 8.0 |
| partial_A | jd-hr-real | 2 | None | None | 0.675 | 0.675 | 16.67 | 16.67 |
| partial_A | jd-py-real | 2 | None | None | 0.35 | 0.35 | 56.25 | 56.25 |

## Failures

[]
