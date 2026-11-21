# Screening experiment

Sanity check only, not accuracy: expected groups are not ground truth.
Null scores mean insufficient coverage; excluded from group means/medians.
Coverage is known criterion weight / total weight; the published score is available only at min_coverage 0.8. Known-only score is a diagnostic weighted score over known criteria, even below that threshold.
Latency includes input verification and screening; excludes queue and persistence time.

Succeeded: 20/20
Latency seconds: {"population": "successful pairs; excludes queue and persistence time", "percentile_method": "linear interpolation at (n - 1) * quantile", "p50": 43.65131670847768, "p95": 82.52475239585769, "max": 129.42445016701822, "within_40_s": 7}
Tokens: {"input": 184509, "output": 16326, "total": 200835, "missing_usage_pairs": 0, "scope": "successful calls only; failed/retried call usage may be unreported"}
Quote verification: {"valid": 142, "total": 148, "rate": 0.9594594594594594}

| CV | JD | Group | Status | Score | Coverage | Score state | Known-only diagnostic | Latency (s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| python_dev-01 | jd-a | match_A | succeeded | 91.0 | 1.0 | scored | 91.0 | 48.901 |
| python_dev-01 | jd-b | match_A | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 80.056 |
| python_dev-02 | jd-a | match_A | succeeded | None | 0.35 | insufficient_coverage | 57.14 | 64.933 |
| python_dev-02 | jd-b | match_A | succeeded | 64.38 | 0.8 | scored | 64.38 | 44.309 |
| python_dev-03 | jd-a | match_A | succeeded | None | 0.35 | insufficient_coverage | 48.57 | 42.206 |
| python_dev-03 | jd-b | match_A | succeeded | None | 0.55 | insufficient_coverage | 45.45 | 129.424 |
| devops-01 | jd-a | partial_A | succeeded | None | 0.75 | insufficient_coverage | 78.0 | 42.993 |
| devops-01 | jd-b | partial_A | succeeded | None | 0.25 | insufficient_coverage | 52.0 | 31.278 |
| database-01 | jd-a | partial_A | succeeded | None | 0.35 | insufficient_coverage | 48.57 | 33.638 |
| database-01 | jd-b | partial_A | succeeded | None | 0.65 | insufficient_coverage | 49.23 | 30.510 |
| hr-01 | jd-a | match_B | succeeded | None | 0.2 | insufficient_coverage | 70.0 | 32.259 |
| hr-01 | jd-b | match_B | succeeded | 93.33 | 0.9 | scored | 93.33 | 47.558 |
| hr-02 | jd-a | match_B | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 75.202 |
| hr-02 | jd-b | match_B | succeeded | 94.0 | 1.0 | scored | 94.0 | 52.235 |
| hr-03 | jd-a | match_B | succeeded | None | 0.2 | insufficient_coverage | 55.0 | 47.998 |
| hr-03 | jd-b | match_B | succeeded | 76.0 | 1.0 | scored | 76.0 | 34.532 |
| finance-01 | jd-a | none | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 56.828 |
| finance-01 | jd-b | none | succeeded | None | 0.55 | insufficient_coverage | 70.0 | 42.672 |
| designer-01 | jd-a | none | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 22.913 |
| designer-01 | jd-b | none | succeeded | None | 0.25 | insufficient_coverage | 52.0 | 34.757 |

## Group sanity check (not accuracy)

| Group | JD | Count | Published mean | Published median | Coverage mean | Coverage median | Known-only mean | Known-only median |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| match_A | jd-a | 3 | 91.0 | 91.0 | 0.5666666666666667 | 0.35 | 65.57 | 57.14 |
| match_A | jd-b | 3 | 64.38 | 64.38 | 0.4833333333333334 | 0.55 | 59.943333333333335 | 64.38 |
| match_B | jd-a | 3 | None | None | 0.16666666666666669 | 0.2 | 65.0 | 70.0 |
| match_B | jd-b | 3 | 87.77666666666667 | 93.33 | 0.9666666666666667 | 1.0 | 87.77666666666667 | 93.33 |
| none | jd-a | 2 | None | None | 0.1 | 0.1 | 70.0 | 70.0 |
| none | jd-b | 2 | None | None | 0.4 | 0.4 | 61.0 | 61.0 |
| partial_A | jd-a | 2 | None | None | 0.55 | 0.55 | 63.285 | 63.285 |
| partial_A | jd-b | 2 | None | None | 0.45 | 0.45 | 50.614999999999995 | 50.614999999999995 |

## Failures

[]
