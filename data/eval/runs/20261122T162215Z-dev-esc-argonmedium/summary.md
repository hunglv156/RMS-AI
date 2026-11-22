# Screening experiment

Sanity check only, not accuracy: expected groups are not ground truth.
Null scores mean insufficient coverage; excluded from group means/medians.
Coverage is known criterion weight / total weight; the published score is available only at min_coverage 0.8. Known-only score is a diagnostic weighted score over known criteria, even below that threshold.
Latency includes input verification and screening; excludes queue and persistence time.

Succeeded: 20/20
Latency seconds: {"population": "successful pairs; excludes queue and persistence time", "percentile_method": "linear interpolation at (n - 1) * quantile", "p50": 13.758920937514631, "p95": 89.13990316250128, "max": 91.83952599999611, "within_40_s": 18}
Tokens: {"input": 118109, "output": 16093, "total": 134202, "missing_usage_pairs": 0, "scope": "successful calls only; failed/retried call usage may be unreported"}
Quote verification: {"valid": 154, "total": 154, "rate": 1.0}

| CV | JD | Group | Status | Score | Coverage | Score state | Known-only diagnostic | Latency (s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| python_dev-01 | jd-py-real | match_A | succeeded | 50.0 | 0.9 | scored | 50.0 | 88.998 |
| python_dev-01 | jd-hr-real | match_A | succeeded | None | 0.6 | insufficient_coverage | 6.67 | 34.982 |
| python_dev-02 | jd-py-real | match_A | succeeded | None | 0.3 | insufficient_coverage | 13.33 | 18.919 |
| python_dev-02 | jd-hr-real | match_A | succeeded | 28.0 | 1.0 | scored | 28.0 | 91.840 |
| python_dev-03 | jd-py-real | match_A | succeeded | None | 0.65 | insufficient_coverage | 58.46 | 28.366 |
| python_dev-03 | jd-hr-real | match_A | succeeded | None | 0.6 | insufficient_coverage | 6.67 | 28.129 |
| devops-01 | jd-py-real | partial_A | succeeded | None | 0.4 | insufficient_coverage | 70.0 | 22.671 |
| devops-01 | jd-hr-real | partial_A | succeeded | None | 0.6 | insufficient_coverage | 6.67 | 34.630 |
| database-01 | jd-py-real | partial_A | succeeded | None | 0.3 | insufficient_coverage | 40.0 | 8.599 |
| database-01 | jd-hr-real | partial_A | succeeded | 12.94 | 0.85 | scored | 12.94 | 23.127 |
| hr-01 | jd-py-real | match_B | succeeded | None | 0.3 | insufficient_coverage | 13.33 | 6.185 |
| hr-01 | jd-hr-real | match_B | succeeded | 63.0 | 1.0 | scored | 63.0 | 6.481 |
| hr-02 | jd-py-real | match_B | succeeded | None | 0.3 | insufficient_coverage | 23.33 | 7.029 |
| hr-02 | jd-hr-real | match_B | succeeded | 91.0 | 1.0 | scored | 91.0 | 7.502 |
| hr-03 | jd-py-real | match_B | succeeded | None | 0.3 | insufficient_coverage | 13.33 | 7.754 |
| hr-03 | jd-hr-real | match_B | succeeded | 80.0 | 0.9 | scored | 80.0 | 6.663 |
| finance-01 | jd-py-real | none | succeeded | None | 0.25 | insufficient_coverage | 16.0 | 5.663 |
| finance-01 | jd-hr-real | none | succeeded | None | 0.55 | insufficient_coverage | 21.82 | 19.808 |
| designer-01 | jd-py-real | none | succeeded | None | 0.2 | insufficient_coverage | 0.0 | 5.845 |
| designer-01 | jd-hr-real | none | succeeded | None | 0.6 | insufficient_coverage | 6.67 | 5.393 |

## Group sanity check (not accuracy)

| Group | JD | Count | Published mean | Published median | Coverage mean | Coverage median | Known-only mean | Known-only median |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| match_A | jd-hr-real | 3 | 28.0 | 28.0 | 0.7333333333333333 | 0.6 | 13.78 | 6.67 |
| match_A | jd-py-real | 3 | 50.0 | 50.0 | 0.6166666666666667 | 0.65 | 40.596666666666664 | 50.0 |
| match_B | jd-hr-real | 3 | 78.0 | 80.0 | 0.9666666666666667 | 1.0 | 78.0 | 80.0 |
| match_B | jd-py-real | 3 | None | None | 0.3 | 0.3 | 16.663333333333334 | 13.33 |
| none | jd-hr-real | 2 | None | None | 0.575 | 0.575 | 14.245000000000001 | 14.245000000000001 |
| none | jd-py-real | 2 | None | None | 0.225 | 0.225 | 8.0 | 8.0 |
| partial_A | jd-hr-real | 2 | 12.94 | 12.94 | 0.725 | 0.725 | 9.805 | 9.805 |
| partial_A | jd-py-real | 2 | None | None | 0.35 | 0.35 | 55.0 | 55.0 |

## Failures

[]

## Escalation

{"escalated_pairs": 4, "failed_pairs": 0, "reasons": {"needs_review": 1, "coverage_band": 3}, "latency_s": {"primary_latency_s": 291.0069639169669, "escalation_latency_s": 167.55428708301042, "total_latency_s": 458.56125099997735}}
