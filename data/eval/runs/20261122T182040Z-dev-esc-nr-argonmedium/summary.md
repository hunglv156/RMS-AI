# Screening experiment

Sanity check only, not accuracy: expected groups are not ground truth.
Null scores mean insufficient coverage; excluded from group means/medians.
Coverage is known criterion weight / total weight; the published score is available only at min_coverage 0.8. Known-only score is a diagnostic weighted score over known criteria, even below that threshold.
Latency includes input verification and screening; excludes queue and persistence time.

Succeeded: 20/20
Latency seconds: {"population": "successful pairs; excludes queue and persistence time", "percentile_method": "linear interpolation at (n - 1) * quantile", "p50": 21.854329937006696, "p95": 33.0054921517396, "max": 39.58194208299392, "within_40_s": 20}
Tokens: {"input": 103326, "output": 13449, "total": 116775, "missing_usage_pairs": 0, "scope": "successful calls only; failed/retried call usage may be unreported"}
Quote verification: {"valid": 133, "total": 137, "rate": 0.9708029197080292}

| CV | JD | Group | Status | Score | Coverage | Score state | Known-only diagnostic | Latency (s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| python_dev-01 | jd-py-real | match_A | succeeded | 55.0 | 0.9 | scored | 55.0 | 21.485 |
| python_dev-01 | jd-hr-real | match_A | succeeded | None | 0.5 | insufficient_coverage | 0.0 | 7.609 |
| python_dev-02 | jd-py-real | match_A | succeeded | None | 0.3 | insufficient_coverage | 13.33 | 6.635 |
| python_dev-02 | jd-hr-real | match_A | succeeded | None | 0.75 | insufficient_coverage | 17.33 | 25.450 |
| python_dev-03 | jd-py-real | match_A | succeeded | None | 0.65 | insufficient_coverage | 65.38 | 26.279 |
| python_dev-03 | jd-hr-real | match_A | succeeded | None | 0.6 | insufficient_coverage | 6.67 | 27.329 |
| devops-01 | jd-py-real | partial_A | succeeded | None | 0.4 | insufficient_coverage | 65.0 | 32.659 |
| devops-01 | jd-hr-real | partial_A | succeeded | None | 0.6 | insufficient_coverage | 6.67 | 39.582 |
| database-01 | jd-py-real | partial_A | succeeded | None | 0.3 | insufficient_coverage | 40.0 | 22.224 |
| database-01 | jd-hr-real | partial_A | succeeded | None | 0.75 | insufficient_coverage | 30.67 | 16.988 |
| hr-01 | jd-py-real | match_B | succeeded | None | 0.3 | insufficient_coverage | 13.33 | 25.575 |
| hr-01 | jd-hr-real | match_B | succeeded | 63.0 | 1.0 | scored | 63.0 | 26.780 |
| hr-02 | jd-py-real | match_B | succeeded | None | 0.3 | insufficient_coverage | 23.33 | 26.199 |
| hr-02 | jd-hr-real | match_B | succeeded | 91.0 | 1.0 | scored | 91.0 | 28.216 |
| hr-03 | jd-py-real | match_B | succeeded | None | 0.3 | insufficient_coverage | 13.33 | 6.290 |
| hr-03 | jd-hr-real | match_B | succeeded | 78.33 | 0.9 | scored | 78.33 | 7.244 |
| finance-01 | jd-py-real | none | succeeded | None | 0.25 | insufficient_coverage | 16.0 | 5.611 |
| finance-01 | jd-hr-real | none | succeeded | None | 0.5 | insufficient_coverage | 30.0 | 5.094 |
| designer-01 | jd-py-real | none | succeeded | None | 0.2 | insufficient_coverage | 0.0 | 6.623 |
| designer-01 | jd-hr-real | none | succeeded | None | 0.6 | insufficient_coverage | 6.67 | 7.663 |

## Group sanity check (not accuracy)

| Group | JD | Count | Published mean | Published median | Coverage mean | Coverage median | Known-only mean | Known-only median |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| match_A | jd-hr-real | 3 | None | None | 0.6166666666666667 | 0.6 | 7.999999999999999 | 6.67 |
| match_A | jd-py-real | 3 | 55.0 | 55.0 | 0.6166666666666667 | 0.65 | 44.57 | 55.0 |
| match_B | jd-hr-real | 3 | 77.44333333333333 | 78.33 | 0.9666666666666667 | 1.0 | 77.44333333333333 | 78.33 |
| match_B | jd-py-real | 3 | None | None | 0.3 | 0.3 | 16.663333333333334 | 13.33 |
| none | jd-hr-real | 2 | None | None | 0.55 | 0.55 | 18.335 | 18.335 |
| none | jd-py-real | 2 | None | None | 0.225 | 0.225 | 8.0 | 8.0 |
| partial_A | jd-hr-real | 2 | None | None | 0.675 | 0.675 | 18.67 | 18.67 |
| partial_A | jd-py-real | 2 | None | None | 0.35 | 0.35 | 52.5 | 52.5 |

## Failures

[]

## Escalation

{"escalated_pairs": 1, "failed_pairs": 0, "reasons": {"needs_review": 1, "coverage_band": 0}, "latency_s": {"primary_latency_s": 357.12633516601636, "escalation_latency_s": 14.382414374995278, "total_latency_s": 371.50874954101164}}
