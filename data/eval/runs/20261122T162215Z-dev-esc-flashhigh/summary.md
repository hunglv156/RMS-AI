# Screening experiment

Sanity check only, not accuracy: expected groups are not ground truth.
Null scores mean insufficient coverage; excluded from group means/medians.
Coverage is known criterion weight / total weight; the published score is available only at min_coverage 0.8. Known-only score is a diagnostic weighted score over known criteria, even below that threshold.
Latency includes input verification and screening; excludes queue and persistence time.

Succeeded: 20/20
Latency seconds: {"population": "successful pairs; excludes queue and persistence time", "percentile_method": "linear interpolation at (n - 1) * quantile", "p50": 7.828747708001174, "p95": 173.29329120894982, "max": 194.9452779580024, "within_40_s": 16}
Tokens: {"input": 177669, "output": 18456, "total": 196125, "missing_usage_pairs": 0, "scope": "successful calls only; failed/retried call usage may be unreported"}
Quote verification: {"valid": 147, "total": 148, "rate": 0.9932432432432432}

| CV | JD | Group | Status | Score | Coverage | Score state | Known-only diagnostic | Latency (s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| python_dev-01 | jd-py-real | match_A | succeeded | 68.33 | 0.9 | scored | 68.33 | 22.064 |
| python_dev-01 | jd-hr-real | match_A | succeeded | None | 0.55 | insufficient_coverage | 0.0 | 172.154 |
| python_dev-02 | jd-py-real | match_A | succeeded | None | 0.3 | insufficient_coverage | 23.33 | 17.436 |
| python_dev-02 | jd-hr-real | match_A | succeeded | 16.25 | 0.8 | scored | 16.25 | 194.945 |
| python_dev-03 | jd-py-real | match_A | succeeded | None | 0.65 | insufficient_coverage | 46.92 | 7.784 |
| python_dev-03 | jd-hr-real | match_A | succeeded | None | 0.65 | insufficient_coverage | 6.15 | 39.937 |
| devops-01 | jd-py-real | partial_A | succeeded | None | 0.4 | insufficient_coverage | 72.5 | 6.048 |
| devops-01 | jd-hr-real | partial_A | succeeded | None | 0.6 | insufficient_coverage | 6.67 | 5.560 |
| database-01 | jd-py-real | partial_A | succeeded | None | 0.3 | insufficient_coverage | 40.0 | 7.501 |
| database-01 | jd-hr-real | partial_A | succeeded | None | 0.65 | insufficient_coverage | 16.92 | 128.530 |
| hr-01 | jd-py-real | match_B | succeeded | None | 0.3 | insufficient_coverage | 13.33 | 7.269 |
| hr-01 | jd-hr-real | match_B | succeeded | 63.0 | 1.0 | scored | 63.0 | 7.061 |
| hr-02 | jd-py-real | match_B | succeeded | None | 0.3 | insufficient_coverage | 23.33 | 6.681 |
| hr-02 | jd-hr-real | match_B | succeeded | 91.0 | 1.0 | scored | 91.0 | 7.874 |
| hr-03 | jd-py-real | match_B | succeeded | None | 0.3 | insufficient_coverage | 13.33 | 5.639 |
| hr-03 | jd-hr-real | match_B | succeeded | 80.0 | 0.9 | scored | 80.0 | 7.210 |
| finance-01 | jd-py-real | none | succeeded | None | 0.25 | insufficient_coverage | 16.0 | 6.302 |
| finance-01 | jd-hr-real | none | succeeded | None | 0.55 | insufficient_coverage | 21.82 | 56.192 |
| designer-01 | jd-py-real | none | succeeded | None | 0.2 | insufficient_coverage | 0.0 | 19.509 |
| designer-01 | jd-hr-real | none | succeeded | None | 0.6 | insufficient_coverage | 6.67 | 12.726 |

## Group sanity check (not accuracy)

| Group | JD | Count | Published mean | Published median | Coverage mean | Coverage median | Known-only mean | Known-only median |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| match_A | jd-hr-real | 3 | 16.25 | 16.25 | 0.6666666666666667 | 0.65 | 7.466666666666667 | 6.15 |
| match_A | jd-py-real | 3 | 68.33 | 68.33 | 0.6166666666666667 | 0.65 | 46.193333333333335 | 46.92 |
| match_B | jd-hr-real | 3 | 78.0 | 80.0 | 0.9666666666666667 | 1.0 | 78.0 | 80.0 |
| match_B | jd-py-real | 3 | None | None | 0.3 | 0.3 | 16.663333333333334 | 13.33 |
| none | jd-hr-real | 2 | None | None | 0.575 | 0.575 | 14.245000000000001 | 14.245000000000001 |
| none | jd-py-real | 2 | None | None | 0.225 | 0.225 | 8.0 | 8.0 |
| partial_A | jd-hr-real | 2 | None | None | 0.625 | 0.625 | 11.795000000000002 | 11.795000000000002 |
| partial_A | jd-py-real | 2 | None | None | 0.35 | 0.35 | 56.25 | 56.25 |

## Failures

[]

## Escalation

{"escalated_pairs": 5, "failed_pairs": 0, "reasons": {"needs_review": 1, "coverage_band": 5}, "latency_s": {"primary_latency_s": 192.93216779295471, "escalation_latency_s": 545.4709366680181, "total_latency_s": 738.4031044609728}}
