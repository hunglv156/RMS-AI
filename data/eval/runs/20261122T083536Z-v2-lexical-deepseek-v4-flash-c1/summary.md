# Screening experiment

Sanity check only, not accuracy: expected groups are not ground truth.
Null scores mean insufficient coverage; excluded from group means/medians.
Coverage is known criterion weight / total weight; the published score is available only at min_coverage 0.8. Known-only score is a diagnostic weighted score over known criteria, even below that threshold.
Latency includes input verification and screening; excludes queue and persistence time.

Succeeded: 20/20
Latency seconds: {"population": "successful pairs; excludes queue and persistence time", "percentile_method": "linear interpolation at (n - 1) * quantile", "p50": 20.28614085399022, "p95": 48.67290590594494, "max": 51.26889391700388, "within_40_s": 17}
Tokens: {"input": 96234, "output": 110197, "total": 206431, "missing_usage_pairs": 0, "scope": "successful calls only; failed/retried call usage may be unreported"}
Quote verification: {"valid": 162, "total": 185, "rate": 0.8756756756756757}

| CV | JD | Group | Status | Score | Coverage | Score state | Known-only diagnostic | Latency (s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| python_dev-01 | jd-py-real | match_A | succeeded | 66.25 | 0.8 | scored | 66.25 | 48.428 |
| python_dev-01 | jd-hr-real | match_A | succeeded | None | 0.75 | insufficient_coverage | 0.0 | 5.734 |
| python_dev-02 | jd-py-real | match_A | succeeded | None | 0.2 | insufficient_coverage | 0.0 | 17.143 |
| python_dev-02 | jd-hr-real | match_A | succeeded | 27.5 | 0.8 | scored | 27.5 | 51.269 |
| python_dev-03 | jd-py-real | match_A | succeeded | None | 0.65 | insufficient_coverage | 60.77 | 32.035 |
| python_dev-03 | jd-hr-real | match_A | succeeded | None | 0.75 | insufficient_coverage | 0.0 | 6.661 |
| devops-01 | jd-py-real | partial_A | succeeded | None | 0.2 | insufficient_coverage | 52.5 | 23.429 |
| devops-01 | jd-hr-real | partial_A | succeeded | 4.71 | 0.85 | scored | 4.71 | 27.497 |
| database-01 | jd-py-real | partial_A | succeeded | None | 0.3 | insufficient_coverage | 40.0 | 27.956 |
| database-01 | jd-hr-real | partial_A | succeeded | 17.0 | 1.0 | scored | 17.0 | 10.239 |
| hr-01 | jd-py-real | match_B | succeeded | None | 0.3 | insufficient_coverage | 13.33 | 13.989 |
| hr-01 | jd-hr-real | match_B | succeeded | 58.5 | 1.0 | scored | 58.5 | 31.966 |
| hr-02 | jd-py-real | match_B | succeeded | None | 0.2 | insufficient_coverage | 0.0 | 3.979 |
| hr-02 | jd-hr-real | match_B | succeeded | 79.0 | 1.0 | scored | 79.0 | 27.064 |
| hr-03 | jd-py-real | match_B | succeeded | None | 0.3 | insufficient_coverage | 13.33 | 9.559 |
| hr-03 | jd-hr-real | match_B | succeeded | 55.0 | 0.9 | scored | 55.0 | 48.536 |
| finance-01 | jd-py-real | none | succeeded | None | 0.15 | insufficient_coverage | 0.0 | 3.810 |
| finance-01 | jd-hr-real | none | succeeded | None | 0.45 | insufficient_coverage | 17.78 | 28.886 |
| designer-01 | jd-py-real | none | succeeded | None | 0.3 | insufficient_coverage | 13.33 | 8.699 |
| designer-01 | jd-hr-real | none | succeeded | 4.71 | 0.85 | scored | 4.71 | 12.972 |

## Group sanity check (not accuracy)

| Group | JD | Count | Published mean | Published median | Coverage mean | Coverage median | Known-only mean | Known-only median |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| match_A | jd-hr-real | 3 | 27.5 | 27.5 | 0.7666666666666667 | 0.75 | 9.166666666666666 | 0.0 |
| match_A | jd-py-real | 3 | 66.25 | 66.25 | 0.55 | 0.65 | 42.34 | 60.77 |
| match_B | jd-hr-real | 3 | 64.16666666666667 | 58.5 | 0.9666666666666667 | 1.0 | 64.16666666666667 | 58.5 |
| match_B | jd-py-real | 3 | None | None | 0.26666666666666666 | 0.3 | 8.886666666666667 | 13.33 |
| none | jd-hr-real | 2 | 4.71 | 4.71 | 0.65 | 0.65 | 11.245000000000001 | 11.245000000000001 |
| none | jd-py-real | 2 | None | None | 0.22499999999999998 | 0.22499999999999998 | 6.665 | 6.665 |
| partial_A | jd-hr-real | 2 | 10.855 | 10.855 | 0.925 | 0.925 | 10.855 | 10.855 |
| partial_A | jd-py-real | 2 | None | None | 0.25 | 0.25 | 46.25 | 46.25 |

## Failures

[]
