# Screening experiment

Sanity check only, not accuracy: expected groups are not ground truth.
Null scores mean insufficient coverage; excluded from group means/medians.
Coverage is known criterion weight / total weight; the published score is available only at min_coverage 0.8. Known-only score is a diagnostic weighted score over known criteria, even below that threshold.
Latency includes input verification and screening; excludes queue and persistence time.

Succeeded: 20/20
Latency seconds: {"population": "successful pairs; excludes queue and persistence time", "percentile_method": "linear interpolation at (n - 1) * quantile", "p50": 52.200542562495684, "p95": 119.10496359586115, "max": 261.7871279169922, "within_40_s": 8}
Tokens: {"input": 164685, "output": 17719, "total": 182404, "missing_usage_pairs": 0, "scope": "successful calls only; failed/retried call usage may be unreported"}
Quote verification: {"valid": 127, "total": 149, "rate": 0.8523489932885906}

| CV | JD | Group | Status | Score | Coverage | Score state | Known-only diagnostic | Latency (s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| python_dev-01 | jd-py-real | match_A | succeeded | None | 0.55 | insufficient_coverage | 64.55 | 50.001 |
| python_dev-01 | jd-hr-real | match_A | succeeded | None | 0.55 | insufficient_coverage | 0.0 | 82.396 |
| python_dev-02 | jd-py-real | match_A | succeeded | None | 0.2 | insufficient_coverage | 0.0 | 36.835 |
| python_dev-02 | jd-hr-real | match_A | succeeded | None | 0.7 | insufficient_coverage | 8.57 | 57.512 |
| python_dev-03 | jd-py-real | match_A | succeeded | None | 0.55 | insufficient_coverage | 64.55 | 84.212 |
| python_dev-03 | jd-hr-real | match_A | succeeded | 4.71 | 0.85 | scored | 4.71 | 53.846 |
| devops-01 | jd-py-real | partial_A | succeeded | None | 0.4 | insufficient_coverage | 53.75 | 100.050 |
| devops-01 | jd-hr-real | partial_A | succeeded | None | 0.65 | insufficient_coverage | 6.15 | 56.009 |
| database-01 | jd-py-real | partial_A | succeeded | None | 0.2 | insufficient_coverage | 17.5 | 68.413 |
| database-01 | jd-hr-real | partial_A | succeeded | 21.25 | 0.8 | scored | 21.25 | 111.595 |
| hr-01 | jd-py-real | match_B | succeeded | None | 0.3 | insufficient_coverage | 13.33 | 86.326 |
| hr-01 | jd-hr-real | match_B | succeeded | 60.0 | 1.0 | scored | 60.0 | 26.008 |
| hr-02 | jd-py-real | match_B | succeeded | None | 0.3 | insufficient_coverage | 13.33 | 27.523 |
| hr-02 | jd-hr-real | match_B | succeeded | 81.05 | 0.95 | scored | 81.05 | 50.555 |
| hr-03 | jd-py-real | match_B | succeeded | None | 0.2 | insufficient_coverage | 0.0 | 31.992 |
| hr-03 | jd-hr-real | match_B | succeeded | None | 0.7 | insufficient_coverage | 59.29 | 20.252 |
| finance-01 | jd-py-real | none | succeeded | None | 0.15 | insufficient_coverage | 0.0 | 27.920 |
| finance-01 | jd-hr-real | none | succeeded | None | 0.55 | insufficient_coverage | 21.82 | 261.787 |
| designer-01 | jd-py-real | none | succeeded | None | 0.2 | insufficient_coverage | 0.0 | 23.041 |
| designer-01 | jd-hr-real | none | succeeded | None | 0.65 | insufficient_coverage | 6.15 | 16.374 |

## Group sanity check (not accuracy)

| Group | JD | Count | Published mean | Published median | Coverage mean | Coverage median | Known-only mean | Known-only median |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| match_A | jd-hr-real | 3 | 4.71 | 4.71 | 0.7 | 0.7 | 4.426666666666667 | 4.71 |
| match_A | jd-py-real | 3 | None | None | 0.43333333333333335 | 0.55 | 43.03333333333333 | 64.55 |
| match_B | jd-hr-real | 3 | 70.525 | 70.525 | 0.8833333333333333 | 0.95 | 66.78 | 60.0 |
| match_B | jd-py-real | 3 | None | None | 0.26666666666666666 | 0.3 | 8.886666666666667 | 13.33 |
| none | jd-hr-real | 2 | None | None | 0.6000000000000001 | 0.6000000000000001 | 13.985 | 13.985 |
| none | jd-py-real | 2 | None | None | 0.175 | 0.175 | 0.0 | 0.0 |
| partial_A | jd-hr-real | 2 | 21.25 | 21.25 | 0.7250000000000001 | 0.7250000000000001 | 13.7 | 13.7 |
| partial_A | jd-py-real | 2 | None | None | 0.30000000000000004 | 0.30000000000000004 | 35.625 | 35.625 |

## Failures

[]
