# Screening experiment

Sanity check only, not accuracy: expected groups are not ground truth.
Null scores mean insufficient coverage; excluded from group means/medians.
Coverage is known criterion weight / total weight; the published score is available only at min_coverage 0.8. Known-only score is a diagnostic weighted score over known criteria, even below that threshold.
Latency includes input verification and screening; excludes queue and persistence time.

Succeeded: 20/20
Latency seconds: {"population": "successful pairs; excludes queue and persistence time", "percentile_method": "linear interpolation at (n - 1) * quantile", "p50": 11.180313042001217, "p95": 75.19377693302087, "max": 102.82629108300898, "within_40_s": 18}
Tokens: {"input": 97220, "output": 12747, "total": 109967, "missing_usage_pairs": 0, "scope": "successful calls only; failed/retried call usage may be unreported"}
Quote verification: {"valid": 165, "total": 166, "rate": 0.9939759036144579}

| CV | JD | Group | Status | Score | Coverage | Score state | Known-only diagnostic | Latency (s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| python_dev-01 | jd-py-real | match_A | succeeded | 55.0 | 0.9 | scored | 55.0 | 11.557 |
| python_dev-01 | jd-hr-real | match_A | succeeded | None | 0.75 | insufficient_coverage | 0.0 | 9.713 |
| python_dev-02 | jd-py-real | match_A | succeeded | None | 0.3 | insufficient_coverage | 13.33 | 11.803 |
| python_dev-02 | jd-hr-real | match_A | succeeded | 28.0 | 1.0 | scored | 28.0 | 10.874 |
| python_dev-03 | jd-py-real | match_A | succeeded | None | 0.65 | insufficient_coverage | 46.92 | 11.336 |
| python_dev-03 | jd-hr-real | match_A | succeeded | None | 0.65 | insufficient_coverage | 6.15 | 8.954 |
| devops-01 | jd-py-real | partial_A | succeeded | None | 0.6 | insufficient_coverage | 55.0 | 9.293 |
| devops-01 | jd-hr-real | partial_A | succeeded | 4.71 | 0.85 | scored | 4.71 | 10.212 |
| database-01 | jd-py-real | partial_A | succeeded | None | 0.3 | insufficient_coverage | 25.0 | 11.228 |
| database-01 | jd-hr-real | partial_A | succeeded | 12.94 | 0.85 | scored | 12.94 | 10.284 |
| hr-01 | jd-py-real | match_B | succeeded | None | 0.3 | insufficient_coverage | 13.33 | 11.133 |
| hr-01 | jd-hr-real | match_B | succeeded | 60.0 | 1.0 | scored | 60.0 | 11.336 |
| hr-02 | jd-py-real | match_B | succeeded | None | 0.3 | insufficient_coverage | 23.33 | 9.695 |
| hr-02 | jd-hr-real | match_B | succeeded | 82.0 | 1.0 | scored | 82.0 | 13.442 |
| hr-03 | jd-py-real | match_B | succeeded | None | 0.2 | insufficient_coverage | 0.0 | 10.613 |
| hr-03 | jd-hr-real | match_B | succeeded | 56.67 | 0.9 | scored | 56.67 | 13.542 |
| finance-01 | jd-py-real | none | succeeded | None | 0.25 | insufficient_coverage | 16.0 | 8.223 |
| finance-01 | jd-hr-real | none | succeeded | None | 0.55 | insufficient_coverage | 21.82 | 73.739 |
| designer-01 | jd-py-real | none | succeeded | None | 0.2 | insufficient_coverage | 0.0 | 102.826 |
| designer-01 | jd-hr-real | none | succeeded | None | 0.65 | insufficient_coverage | 6.15 | 13.213 |

## Group sanity check (not accuracy)

| Group | JD | Count | Published mean | Published median | Coverage mean | Coverage median | Known-only mean | Known-only median |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| match_A | jd-hr-real | 3 | 28.0 | 28.0 | 0.8 | 0.75 | 11.383333333333333 | 6.15 |
| match_A | jd-py-real | 3 | 55.0 | 55.0 | 0.6166666666666667 | 0.65 | 38.416666666666664 | 46.92 |
| match_B | jd-hr-real | 3 | 66.22333333333333 | 60.0 | 0.9666666666666667 | 1.0 | 66.22333333333333 | 60.0 |
| match_B | jd-py-real | 3 | None | None | 0.26666666666666666 | 0.3 | 12.219999999999999 | 13.33 |
| none | jd-hr-real | 2 | None | None | 0.6000000000000001 | 0.6000000000000001 | 13.985 | 13.985 |
| none | jd-py-real | 2 | None | None | 0.225 | 0.225 | 8.0 | 8.0 |
| partial_A | jd-hr-real | 2 | 8.825 | 8.825 | 0.85 | 0.85 | 8.825 | 8.825 |
| partial_A | jd-py-real | 2 | None | None | 0.44999999999999996 | 0.44999999999999996 | 40.0 | 40.0 |

## Failures

[]
