# Screening experiment

Sanity check only, not accuracy: expected groups are not ground truth.
Null scores mean insufficient coverage; excluded from group means/medians.
Coverage is known criterion weight / total weight; the published score is available only at min_coverage 0.8. Known-only score is a diagnostic weighted score over known criteria, even below that threshold.
Latency includes input verification and screening; excludes queue and persistence time.

Succeeded: 20/20
Latency seconds: {"population": "successful pairs; excludes queue and persistence time", "percentile_method": "linear interpolation at (n - 1) * quantile", "p50": 59.12139631250466, "p95": 175.64129806076386, "max": 236.83113091698033, "within_40_s": 3}
Tokens: {"input": 199047, "output": 20918, "total": 219965, "missing_usage_pairs": 0, "scope": "successful calls only; failed/retried call usage may be unreported"}
Quote verification: {"valid": 139, "total": 145, "rate": 0.9586206896551724}

| CV | JD | Group | Status | Score | Coverage | Score state | Known-only diagnostic | Latency (s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| python_dev-h1 | jd-py-real | match_A | succeeded | 58.75 | 0.8 | scored | 58.75 | 53.067 |
| python_dev-h1 | jd-hr-real | match_A | succeeded | None | 0.1 | insufficient_coverage | 40.0 | 38.886 |
| python_dev-h2 | jd-py-real | match_A | succeeded | 51.67 | 0.9 | scored | 51.67 | 236.831 |
| python_dev-h2 | jd-hr-real | match_A | succeeded | None | 0.1 | insufficient_coverage | 40.0 | 88.315 |
| python_dev-h3 | jd-py-real | match_A | succeeded | 62.5 | 0.8 | scored | 62.5 | 53.519 |
| python_dev-h3 | jd-hr-real | match_A | succeeded | None | 0.35 | insufficient_coverage | 40.0 | 58.929 |
| devops-h1 | jd-py-real | partial_A | succeeded | None | 0.55 | insufficient_coverage | 40.0 | 50.934 |
| devops-h1 | jd-hr-real | partial_A | succeeded | None | 0.0 | insufficient_coverage | None | 24.265 |
| database-h1 | jd-py-real | partial_A | succeeded | None | 0.35 | insufficient_coverage | 74.29 | 172.421 |
| database-h1 | jd-hr-real | partial_A | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 54.910 |
| hr-h1 | jd-py-real | match_B | succeeded | None | 0.15 | insufficient_coverage | 40.0 | 115.151 |
| hr-h1 | jd-hr-real | match_B | succeeded | 88.0 | 1.0 | scored | 88.0 | 59.314 |
| hr-h2 | jd-py-real | match_B | succeeded | None | 0.0 | insufficient_coverage | None | 33.464 |
| hr-h2 | jd-hr-real | match_B | succeeded | 48.82 | 0.85 | scored | 48.82 | 68.800 |
| hr-h3 | jd-py-real | match_B | succeeded | None | 0.1 | insufficient_coverage | 40.0 | 72.514 |
| hr-h3 | jd-hr-real | match_B | succeeded | None | 0.75 | insufficient_coverage | 40.0 | 65.484 |
| finance-h1 | jd-py-real | none | succeeded | None | 0.1 | insufficient_coverage | 40.0 | 50.275 |
| finance-h1 | jd-hr-real | none | succeeded | None | 0.35 | insufficient_coverage | 48.57 | 46.843 |
| designer-h1 | jd-py-real | none | succeeded | None | 0.1 | insufficient_coverage | 40.0 | 62.226 |
| designer-h1 | jd-hr-real | none | succeeded | None | 0.6 | insufficient_coverage | 65.0 | 72.986 |

## Group sanity check (not accuracy)

| Group | JD | Count | Published mean | Published median | Coverage mean | Coverage median | Known-only mean | Known-only median |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| match_A | jd-hr-real | 3 | None | None | 0.18333333333333332 | 0.1 | 40.0 | 40.0 |
| match_A | jd-py-real | 3 | 57.64 | 58.75 | 0.8333333333333334 | 0.8 | 57.64 | 58.75 |
| match_B | jd-hr-real | 3 | 68.41 | 68.41 | 0.8666666666666667 | 0.85 | 58.94 | 48.82 |
| match_B | jd-py-real | 3 | None | None | 0.08333333333333333 | 0.1 | 40.0 | 40.0 |
| none | jd-hr-real | 2 | None | None | 0.475 | 0.475 | 56.785 | 56.785 |
| none | jd-py-real | 2 | None | None | 0.1 | 0.1 | 40.0 | 40.0 |
| partial_A | jd-hr-real | 2 | None | None | 0.05 | 0.05 | 70.0 | 70.0 |
| partial_A | jd-py-real | 2 | None | None | 0.45 | 0.45 | 57.145 | 57.145 |

## Failures

[]
