# Screening experiment

Sanity check only, not accuracy: expected groups are not ground truth.
Null scores mean insufficient coverage; excluded from group means/medians.
Coverage is known criterion weight / total weight; the published score is available only at min_coverage 0.8. Known-only score is a diagnostic weighted score over known criteria, even below that threshold.
Latency includes input verification and screening; excludes queue and persistence time.

Succeeded: 6/20
Latency seconds: {"population": "successful pairs; excludes queue and persistence time", "percentile_method": "linear interpolation at (n - 1) * quantile", "p50": 44.349773104520864, "p95": 83.23435792700911, "max": 90.97626108300756, "within_40_s": 3}
Tokens: {"input": 37954, "output": 3799, "total": 41753, "missing_usage_pairs": 0, "scope": "successful calls only; failed/retried call usage may be unreported"}
Quote verification: {"valid": 7, "total": 11, "rate": 0.6363636363636364}

| CV | JD | Group | Status | Score | Coverage | Score state | Known-only diagnostic | Latency (s) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| database-01 | jd-a | partial_A | failed | None | None | None | None | 91.383 |
| database-01 | jd-b | partial_A | failed | None | None | None | None | 91.126 |
| designer-01 | jd-a | none | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 26.310 |
| designer-01 | jd-b | none | failed | None | None | None | None | 91.288 |
| devops-01 | jd-a | partial_A | failed | None | None | None | None | 91.183 |
| devops-01 | jd-b | partial_A | failed | None | None | None | None | 90.946 |
| finance-01 | jd-a | none | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 29.586 |
| finance-01 | jd-b | none | succeeded | None | 0.0 | insufficient_coverage | None | 90.976 |
| hr-01 | jd-a | match_B | failed | None | None | None | None | 90.918 |
| hr-01 | jd-b | match_B | failed | None | None | None | None | 91.431 |
| hr-02 | jd-a | match_B | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 60.009 |
| hr-02 | jd-b | match_B | failed | None | None | None | None | 91.324 |
| hr-03 | jd-a | match_B | succeeded | None | 0.1 | insufficient_coverage | 70.0 | 59.113 |
| hr-03 | jd-b | match_B | failed | None | None | None | None | 91.182 |
| python_dev-01 | jd-a | match_A | failed | None | None | None | None | 91.076 |
| python_dev-01 | jd-b | match_A | failed | None | None | None | None | 91.016 |
| python_dev-02 | jd-a | match_A | failed | None | None | None | None | 91.108 |
| python_dev-02 | jd-b | match_A | failed | None | None | None | None | 91.009 |
| python_dev-03 | jd-a | match_A | succeeded | None | 0.35 | insufficient_coverage | 48.57 | 28.475 |
| python_dev-03 | jd-b | match_A | failed | None | None | None | None | 91.297 |

## Group sanity check (not accuracy)

| Group | JD | Count | Published mean | Published median | Coverage mean | Coverage median | Known-only mean | Known-only median |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| match_A | jd-a | 1 | None | None | 0.35 | 0.35 | 48.57 | 48.57 |
| match_A | jd-b | 0 | None | None | None | None | None | None |
| match_B | jd-a | 2 | None | None | 0.1 | 0.1 | 70.0 | 70.0 |
| match_B | jd-b | 0 | None | None | None | None | None | None |
| none | jd-a | 2 | None | None | 0.1 | 0.1 | 70.0 | 70.0 |
| none | jd-b | 1 | None | None | 0.0 | 0.0 | None | None |
| partial_A | jd-a | 0 | None | None | None | None | None | None |
| partial_A | jd-b | 0 | None | None | None | None | None | None |

## Failures

[{"sheet_id": "database-01", "jd_id": "jd-a", "class": "LLMTimeoutError", "message": "LLM gateway call timed out"}, {"sheet_id": "database-01", "jd_id": "jd-b", "class": "LLMTimeoutError", "message": "LLM gateway call timed out"}, {"sheet_id": "designer-01", "jd_id": "jd-b", "class": "LLMTimeoutError", "message": "LLM gateway call timed out"}, {"sheet_id": "devops-01", "jd_id": "jd-a", "class": "LLMTimeoutError", "message": "LLM gateway call timed out"}, {"sheet_id": "devops-01", "jd_id": "jd-b", "class": "LLMTimeoutError", "message": "LLM gateway call timed out"}, {"sheet_id": "hr-01", "jd_id": "jd-a", "class": "LLMTimeoutError", "message": "LLM gateway call timed out"}, {"sheet_id": "hr-01", "jd_id": "jd-b", "class": "LLMTimeoutError", "message": "LLM gateway call timed out"}, {"sheet_id": "hr-02", "jd_id": "jd-b", "class": "LLMTimeoutError", "message": "LLM gateway call timed out"}, {"sheet_id": "hr-03", "jd_id": "jd-b", "class": "LLMTimeoutError", "message": "LLM gateway call timed out"}, {"sheet_id": "python_dev-01", "jd_id": "jd-a", "class": "LLMTimeoutError", "message": "LLM gateway call timed out"}, {"sheet_id": "python_dev-01", "jd_id": "jd-b", "class": "LLMTimeoutError", "message": "LLM gateway call timed out"}, {"sheet_id": "python_dev-02", "jd_id": "jd-a", "class": "LLMTimeoutError", "message": "LLM gateway call timed out"}, {"sheet_id": "python_dev-02", "jd_id": "jd-b", "class": "LLMTimeoutError", "message": "LLM gateway call timed out"}, {"sheet_id": "python_dev-03", "jd_id": "jd-b", "class": "LLMTimeoutError", "message": "LLM gateway call timed out"}]
