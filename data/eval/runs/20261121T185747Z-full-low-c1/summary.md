# Screening experiment

Sanity check only, not accuracy: expected groups are not ground truth.
Null scores mean insufficient coverage; excluded from group means/medians.
Coverage is known criterion weight / total weight; the published score is available only at min_coverage 0.8. Known-only score is a diagnostic weighted score over known criteria, even below that threshold.
Latency includes input verification and screening; excludes queue and persistence time.

Succeeded: 20/20
Latency seconds: {"population": "successful pairs; excludes queue and persistence time", "percentile_method": "linear interpolation at (n - 1) * quantile", "p50": 6.722980958496919, "p95": 8.577231256531377, "max": 8.959778958000243, "within_40_s": 20}
Tokens: {"input": 88454, "output": 11848, "total": 100302, "missing_usage_pairs": 0, "scope": "successful calls only; failed/retried call usage may be unreported"}
Quote verification: {"valid": 118, "total": 138, "rate": 0.855072463768116}

| CV | JD | Group | Status | Score | Coverage | Score state | Known-only diagnostic | Latency (s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| python_dev-01 | jd-a | match_A | succeeded | None | 0.75 | insufficient_coverage | 88.0 | 8.557 |
| python_dev-01 | jd-b | match_A | succeeded | None | 0.1 | insufficient_coverage | 100.0 | 6.122 |
| python_dev-02 | jd-a | match_A | succeeded | None | 0.0 | insufficient_coverage | None | 6.736 |
| python_dev-02 | jd-b | match_A | succeeded | 55.0 | 0.8 | scored | 55.0 | 6.899 |
| python_dev-03 | jd-a | match_A | succeeded | None | 0.35 | insufficient_coverage | 48.57 | 6.344 |
| python_dev-03 | jd-b | match_A | succeeded | None | 0.55 | insufficient_coverage | 45.45 | 7.975 |
| devops-01 | jd-a | partial_A | succeeded | None | 0.75 | insufficient_coverage | 78.0 | 7.274 |
| devops-01 | jd-b | partial_A | succeeded | None | 0.25 | insufficient_coverage | 52.0 | 6.316 |
| database-01 | jd-a | partial_A | succeeded | None | 0.35 | insufficient_coverage | 48.57 | 5.554 |
| database-01 | jd-b | partial_A | succeeded | None | 0.65 | insufficient_coverage | 53.85 | 6.040 |
| hr-01 | jd-a | match_B | succeeded | None | 0.1 | insufficient_coverage | 100.0 | 5.630 |
| hr-01 | jd-b | match_B | succeeded | 93.33 | 0.9 | scored | 93.33 | 7.700 |
| hr-02 | jd-a | match_B | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 5.809 |
| hr-02 | jd-b | match_B | succeeded | 96.67 | 0.9 | scored | 96.67 | 7.065 |
| hr-03 | jd-a | match_B | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 5.117 |
| hr-03 | jd-b | match_B | succeeded | 80.5 | 1.0 | scored | 80.5 | 7.942 |
| finance-01 | jd-a | none | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 5.224 |
| finance-01 | jd-b | none | succeeded | None | 0.55 | insufficient_coverage | 59.09 | 8.960 |
| designer-01 | jd-a | none | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 6.710 |
| designer-01 | jd-b | none | succeeded | None | 0.25 | insufficient_coverage | 52.0 | 8.526 |

## Group sanity check (not accuracy)

| Group | JD | Count | Published mean | Published median | Coverage mean | Coverage median | Known-only mean | Known-only median |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| match_A | jd-a | 3 | None | None | 0.36666666666666664 | 0.35 | 68.285 | 68.285 |
| match_A | jd-b | 3 | 55.0 | 55.0 | 0.4833333333333334 | 0.55 | 66.81666666666666 | 55.0 |
| match_B | jd-a | 3 | None | None | 0.1 | 0.1 | 80.0 | 70.0 |
| match_B | jd-b | 3 | 90.16666666666667 | 93.33 | 0.9333333333333333 | 0.9 | 90.16666666666667 | 93.33 |
| none | jd-a | 2 | None | None | 0.1 | 0.1 | 70.0 | 70.0 |
| none | jd-b | 2 | None | None | 0.4 | 0.4 | 55.545 | 55.545 |
| partial_A | jd-a | 2 | None | None | 0.55 | 0.55 | 63.285 | 63.285 |
| partial_A | jd-b | 2 | None | None | 0.45 | 0.45 | 52.925 | 52.925 |

## Failures

[]
