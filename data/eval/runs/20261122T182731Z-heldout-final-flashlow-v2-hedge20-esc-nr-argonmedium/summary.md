# Screening experiment

Sanity check only, not accuracy: expected groups are not ground truth.
Null scores mean insufficient coverage; excluded from group means/medians.
Coverage is known criterion weight / total weight; the published score is available only at min_coverage 0.8. Known-only score is a diagnostic weighted score over known criteria, even below that threshold.
Latency includes input verification and screening; excludes queue and persistence time.

Succeeded: 20/20
Latency seconds: {"population": "successful pairs; excludes queue and persistence time", "percentile_method": "linear interpolation at (n - 1) * quantile", "p50": 8.362615458492655, "p95": 44.84006081043336, "max": 48.681308583996724, "within_40_s": 16}
Tokens: {"input": 98818, "output": 14180, "total": 112998, "missing_usage_pairs": 0, "scope": "successful calls only; failed/retried call usage may be unreported"}
Quote verification: {"valid": 152, "total": 153, "rate": 0.9934640522875817}

| CV | JD | Group | Status | Score | Coverage | Score state | Known-only diagnostic | Latency (s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| python_dev-h1 | jd-py-real | match_A | succeeded | 47.5 | 0.8 | scored | 47.5 | 20.490 |
| python_dev-h1 | jd-hr-real | match_A | succeeded | None | 0.6 | insufficient_coverage | 6.67 | 6.198 |
| python_dev-h2 | jd-py-real | match_A | succeeded | None | 0.7 | insufficient_coverage | 44.29 | 7.145 |
| python_dev-h2 | jd-hr-real | match_A | succeeded | None | 0.6 | insufficient_coverage | 25.0 | 6.936 |
| python_dev-h3 | jd-py-real | match_A | succeeded | 68.0 | 1.0 | scored | 68.0 | 8.048 |
| python_dev-h3 | jd-hr-real | match_A | succeeded | 13.0 | 1.0 | scored | 13.0 | 8.677 |
| devops-h1 | jd-py-real | partial_A | succeeded | None | 0.45 | insufficient_coverage | 62.22 | 6.716 |
| devops-h1 | jd-hr-real | partial_A | succeeded | None | 0.4 | insufficient_coverage | 0.0 | 5.904 |
| database-h1 | jd-py-real | partial_A | succeeded | None | 0.65 | insufficient_coverage | 46.15 | 7.459 |
| database-h1 | jd-hr-real | partial_A | succeeded | None | 0.75 | insufficient_coverage | 9.33 | 6.417 |
| hr-h1 | jd-py-real | match_B | succeeded | None | 0.3 | insufficient_coverage | 13.33 | 5.908 |
| hr-h1 | jd-hr-real | match_B | succeeded | 83.5 | 1.0 | scored | 83.5 | 7.524 |
| hr-h2 | jd-py-real | match_B | succeeded | None | 0.2 | insufficient_coverage | 0.0 | 30.542 |
| hr-h2 | jd-hr-real | match_B | succeeded | 70.0 | 0.85 | scored | 70.0 | 39.256 |
| hr-h3 | jd-py-real | match_B | succeeded | None | 0.2 | insufficient_coverage | 0.0 | 44.638 |
| hr-h3 | jd-hr-real | match_B | succeeded | 39.47 | 0.95 | scored | 39.47 | 37.704 |
| finance-h1 | jd-py-real | none | succeeded | None | 0.3 | insufficient_coverage | 23.33 | 48.681 |
| finance-h1 | jd-hr-real | none | succeeded | 20.0 | 1.0 | scored | 20.0 | 43.022 |
| designer-h1 | jd-py-real | none | succeeded | None | 0.3 | insufficient_coverage | 13.33 | 41.247 |
| designer-h1 | jd-hr-real | none | succeeded | None | 0.6 | insufficient_coverage | 61.67 | 39.241 |

## Group sanity check (not accuracy)

| Group | JD | Count | Published mean | Published median | Coverage mean | Coverage median | Known-only mean | Known-only median |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| match_A | jd-hr-real | 3 | 13.0 | 13.0 | 0.7333333333333333 | 0.6 | 14.89 | 13.0 |
| match_A | jd-py-real | 3 | 57.75 | 57.75 | 0.8333333333333334 | 0.8 | 53.263333333333335 | 47.5 |
| match_B | jd-hr-real | 3 | 64.32333333333334 | 70.0 | 0.9333333333333333 | 0.95 | 64.32333333333334 | 70.0 |
| match_B | jd-py-real | 3 | None | None | 0.23333333333333334 | 0.2 | 4.443333333333333 | 0.0 |
| none | jd-hr-real | 2 | 20.0 | 20.0 | 0.8 | 0.8 | 40.835 | 40.835 |
| none | jd-py-real | 2 | None | None | 0.3 | 0.3 | 18.33 | 18.33 |
| partial_A | jd-hr-real | 2 | None | None | 0.575 | 0.575 | 4.665 | 4.665 |
| partial_A | jd-py-real | 2 | None | None | 0.55 | 0.55 | 54.185 | 54.185 |

## Failures

[]

## Escalation

{"escalated_pairs": 1, "failed_pairs": 0, "reasons": {"needs_review": 1, "coverage_band": 0}, "latency_s": {"primary_latency_s": 408.66904325105133, "escalation_latency_s": 13.05817841697717, "total_latency_s": 421.7272216680285}}
