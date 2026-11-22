# Screening experiment

Sanity check only, not accuracy: expected groups are not ground truth.
Null scores mean insufficient coverage; excluded from group means/medians.
Coverage is known criterion weight / total weight; the published score is available only at min_coverage 0.8. Known-only score is a diagnostic weighted score over known criteria, even below that threshold.
Latency includes input verification and screening; excludes queue and persistence time.

Succeeded: 20/20
Latency seconds: {"population": "successful pairs; excludes queue and persistence time", "percentile_method": "linear interpolation at (n - 1) * quantile", "p50": 92.04775856249034, "p95": 187.0338715527034, "max": 459.6620352079917, "within_40_s": 4}
Tokens: {"input": 97220, "output": 13239, "total": 110459, "missing_usage_pairs": 0, "scope": "successful calls only; failed/retried call usage may be unreported"}
Quote verification: {"valid": 163, "total": 163, "rate": 1.0}

| CV | JD | Group | Status | Score | Coverage | Score state | Known-only diagnostic | Latency (s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| python_dev-01 | jd-py-real | match_A | succeeded | 55.0 | 0.9 | scored | 55.0 | 92.420 |
| python_dev-01 | jd-hr-real | match_A | succeeded | None | 0.75 | insufficient_coverage | 0.0 | 95.790 |
| python_dev-02 | jd-py-real | match_A | succeeded | None | 0.3 | insufficient_coverage | 13.33 | 76.161 |
| python_dev-02 | jd-hr-real | match_A | succeeded | 28.0 | 1.0 | scored | 28.0 | 87.296 |
| python_dev-03 | jd-py-real | match_A | succeeded | None | 0.65 | insufficient_coverage | 46.92 | 459.662 |
| python_dev-03 | jd-hr-real | match_A | succeeded | None | 0.65 | insufficient_coverage | 6.15 | 128.845 |
| devops-01 | jd-py-real | partial_A | succeeded | None | 0.6 | insufficient_coverage | 52.5 | 46.918 |
| devops-01 | jd-hr-real | partial_A | succeeded | None | 0.65 | insufficient_coverage | 6.15 | 91.676 |
| database-01 | jd-py-real | partial_A | succeeded | None | 0.3 | insufficient_coverage | 25.0 | 145.124 |
| database-01 | jd-hr-real | partial_A | succeeded | 12.94 | 0.85 | scored | 12.94 | 138.625 |
| hr-01 | jd-py-real | match_B | succeeded | None | 0.3 | insufficient_coverage | 13.33 | 68.668 |
| hr-01 | jd-hr-real | match_B | succeeded | 60.0 | 1.0 | scored | 60.0 | 172.685 |
| hr-02 | jd-py-real | match_B | succeeded | None | 0.3 | insufficient_coverage | 23.33 | 148.040 |
| hr-02 | jd-hr-real | match_B | succeeded | 82.0 | 1.0 | scored | 82.0 | 142.915 |
| hr-03 | jd-py-real | match_B | succeeded | None | 0.2 | insufficient_coverage | 0.0 | 45.381 |
| hr-03 | jd-hr-real | match_B | succeeded | 63.33 | 0.9 | scored | 63.33 | 96.686 |
| finance-01 | jd-py-real | none | succeeded | None | 0.25 | insufficient_coverage | 16.0 | 15.569 |
| finance-01 | jd-hr-real | none | succeeded | None | 0.55 | insufficient_coverage | 36.36 | 11.011 |
| designer-01 | jd-py-real | none | succeeded | None | 0.2 | insufficient_coverage | 0.0 | 9.098 |
| designer-01 | jd-hr-real | none | succeeded | None | 0.65 | insufficient_coverage | 6.15 | 10.873 |

## Group sanity check (not accuracy)

| Group | JD | Count | Published mean | Published median | Coverage mean | Coverage median | Known-only mean | Known-only median |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| match_A | jd-hr-real | 3 | 28.0 | 28.0 | 0.8 | 0.75 | 11.383333333333333 | 6.15 |
| match_A | jd-py-real | 3 | 55.0 | 55.0 | 0.6166666666666667 | 0.65 | 38.416666666666664 | 46.92 |
| match_B | jd-hr-real | 3 | 68.44333333333333 | 63.33 | 0.9666666666666667 | 1.0 | 68.44333333333333 | 63.33 |
| match_B | jd-py-real | 3 | None | None | 0.26666666666666666 | 0.3 | 12.219999999999999 | 13.33 |
| none | jd-hr-real | 2 | None | None | 0.6000000000000001 | 0.6000000000000001 | 21.255 | 21.255 |
| none | jd-py-real | 2 | None | None | 0.225 | 0.225 | 8.0 | 8.0 |
| partial_A | jd-hr-real | 2 | 12.94 | 12.94 | 0.75 | 0.75 | 9.545 | 9.545 |
| partial_A | jd-py-real | 2 | None | None | 0.44999999999999996 | 0.44999999999999996 | 38.75 | 38.75 |

## Failures

[]
