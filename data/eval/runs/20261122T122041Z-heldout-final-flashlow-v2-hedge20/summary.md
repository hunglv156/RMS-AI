# Screening experiment

Sanity check only, not accuracy: expected groups are not ground truth.
Null scores mean insufficient coverage; excluded from group means/medians.
Coverage is known criterion weight / total weight; the published score is available only at min_coverage 0.8. Known-only score is a diagnostic weighted score over known criteria, even below that threshold.
Latency includes input verification and screening; excludes queue and persistence time.

Succeeded: 20/20
Latency seconds: {"population": "successful pairs; excludes queue and persistence time", "percentile_method": "linear interpolation at (n - 1) * quantile", "p50": 8.190227645507548, "p95": 33.63748003603542, "max": 41.06948112498503, "within_40_s": 19}
Tokens: {"input": 93847, "output": 13191, "total": 107038, "missing_usage_pairs": 0, "scope": "successful calls only; failed/retried call usage may be unreported"}
Quote verification: {"valid": 143, "total": 145, "rate": 0.9862068965517241}

| CV | JD | Group | Status | Score | Coverage | Score state | Known-only diagnostic | Latency (s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| python_dev-h1 | jd-py-real | match_A | succeeded | 70.0 | 0.8 | scored | 70.0 | 31.161 |
| python_dev-h1 | jd-hr-real | match_A | succeeded | None | 0.6 | insufficient_coverage | 11.67 | 23.062 |
| python_dev-h2 | jd-py-real | match_A | succeeded | None | 0.7 | insufficient_coverage | 44.29 | 29.093 |
| python_dev-h2 | jd-hr-real | match_A | succeeded | None | 0.6 | insufficient_coverage | 20.0 | 24.342 |
| python_dev-h3 | jd-py-real | match_A | succeeded | 50.0 | 1.0 | scored | 50.0 | 19.069 |
| python_dev-h3 | jd-hr-real | match_A | succeeded | None | 0.75 | insufficient_coverage | 17.33 | 33.246 |
| devops-h1 | jd-py-real | partial_A | succeeded | None | 0.4 | insufficient_coverage | 57.5 | 21.802 |
| devops-h1 | jd-hr-real | partial_A | succeeded | None | 0.65 | insufficient_coverage | 0.0 | 26.326 |
| database-h1 | jd-py-real | partial_A | succeeded | None | 0.55 | insufficient_coverage | 47.27 | 41.069 |
| database-h1 | jd-hr-real | partial_A | succeeded | None | 0.5 | insufficient_coverage | 14.0 | 6.421 |
| hr-h1 | jd-py-real | match_B | succeeded | None | 0.3 | insufficient_coverage | 13.33 | 6.742 |
| hr-h1 | jd-hr-real | match_B | succeeded | 71.5 | 1.0 | scored | 71.5 | 7.796 |
| hr-h2 | jd-py-real | match_B | succeeded | None | 0.3 | insufficient_coverage | 13.33 | 8.584 |
| hr-h2 | jd-hr-real | match_B | succeeded | 71.76 | 0.85 | scored | 71.76 | 7.318 |
| hr-h3 | jd-py-real | match_B | succeeded | None | 0.2 | insufficient_coverage | 0.0 | 6.654 |
| hr-h3 | jd-hr-real | match_B | succeeded | None | 0.75 | insufficient_coverage | 50.0 | 7.057 |
| finance-h1 | jd-py-real | none | succeeded | None | 0.3 | insufficient_coverage | 23.33 | 6.106 |
| finance-h1 | jd-hr-real | none | succeeded | None | 0.75 | insufficient_coverage | 22.67 | 6.499 |
| designer-h1 | jd-py-real | none | succeeded | None | 0.3 | insufficient_coverage | 13.33 | 5.944 |
| designer-h1 | jd-hr-real | none | succeeded | None | 0.6 | insufficient_coverage | 66.67 | 7.500 |

## Group sanity check (not accuracy)

| Group | JD | Count | Published mean | Published median | Coverage mean | Coverage median | Known-only mean | Known-only median |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| match_A | jd-hr-real | 3 | None | None | 0.65 | 0.6 | 16.333333333333332 | 17.33 |
| match_A | jd-py-real | 3 | 60.0 | 60.0 | 0.8333333333333334 | 0.8 | 54.763333333333335 | 50.0 |
| match_B | jd-hr-real | 3 | 71.63 | 71.63 | 0.8666666666666667 | 0.85 | 64.42 | 71.5 |
| match_B | jd-py-real | 3 | None | None | 0.26666666666666666 | 0.3 | 8.886666666666667 | 13.33 |
| none | jd-hr-real | 2 | None | None | 0.675 | 0.675 | 44.67 | 44.67 |
| none | jd-py-real | 2 | None | None | 0.3 | 0.3 | 18.33 | 18.33 |
| partial_A | jd-hr-real | 2 | None | None | 0.575 | 0.575 | 7.0 | 7.0 |
| partial_A | jd-py-real | 2 | None | None | 0.47500000000000003 | 0.47500000000000003 | 52.385000000000005 | 52.385000000000005 |

## Failures

[]
