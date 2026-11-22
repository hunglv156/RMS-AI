# Latency comparison (not accuracy)

Diagnostics only, not accuracy: no human labels are used. Coverage, quote verification, agreement and known-only scores do not establish correctness.

Latency population: successful pairs; includes provider retries, excludes local semaphore queue and persistence. Token totals cover successful calls only; failed attempts may be unreported. Context means use successful pairs with available context lengths; reduction is 1 - run mean / baseline mean. Missing measurements remain null.

| Run | Success | p50 s | p95 s | Max s | ≤40 s | Input tokens | Output tokens | Reasoning tokens | Quote verification | Mean coverage | Mean context chars | Context reduction | State agreement | Known-only MAD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 20261122T054842Z-real-lexical-high-c1 | 20/20 | 61.489 | 103.790 | 109.103 | 2 | 199625 | 21152 | null | 0.942 | 0.375 | 5462.350 | 0.000 | 1 | 0.000 |
| 20261122T061003Z-real-lexical-medium-c1 | 20/20 | 43.287 | 99.104 | 225.187 | 10 | 118690 | 19695 | null | 0.844 | 0.325 | 5462.350 | 0.000 | 1 | 4.349 |

## 20261122T054842Z-real-lexical-high-c1 versus baseline (not accuracy)

Context characters: {"mean": 5462.35, "available_pairs": 20, "measured_pairs": 20, "reconstructed_full_pairs": 0, "reduction_vs_baseline": 0.0, "definition": "Unicode characters in cv_context sent to the LLM; historical full input recovered only when source content hash matches"}
Prompt characters: {"mean": 9623.9, "min": 5554, "max": 14396, "measured_pairs": 20, "definition": "pipeline system + user characters; excludes provider-added schema/formatting"}
Score-state agreement: {"count": 20, "compared": 20, "rate": 1}
Known-only diagnostic: {"both_known_pairs": 18, "mean_absolute_difference": 0.0}

| CV | JD | Both succeeded | Coverage delta | State agrees | Known-only absolute difference |
| --- | --- | --- | --- | --- | --- |
| database-01 | jd-hr-real | True | 0.000 | True | 0.000 |
| database-01 | jd-py-real | True | 0.000 | True | 0.000 |
| designer-01 | jd-hr-real | True | 0.000 | True | 0.000 |
| designer-01 | jd-py-real | True | 0.000 | True | null |
| devops-01 | jd-hr-real | True | 0.000 | True | 0.000 |
| devops-01 | jd-py-real | True | 0.000 | True | 0.000 |
| finance-01 | jd-hr-real | True | 0.000 | True | 0.000 |
| finance-01 | jd-py-real | True | 0.000 | True | 0.000 |
| hr-01 | jd-hr-real | True | 0.000 | True | 0.000 |
| hr-01 | jd-py-real | True | 0.000 | True | 0.000 |
| hr-02 | jd-hr-real | True | 0.000 | True | 0.000 |
| hr-02 | jd-py-real | True | 0.000 | True | 0.000 |
| hr-03 | jd-hr-real | True | 0.000 | True | 0.000 |
| hr-03 | jd-py-real | True | 0.000 | True | null |
| python_dev-01 | jd-hr-real | True | 0.000 | True | 0.000 |
| python_dev-01 | jd-py-real | True | 0.000 | True | 0.000 |
| python_dev-02 | jd-hr-real | True | 0.000 | True | 0.000 |
| python_dev-02 | jd-py-real | True | 0.000 | True | 0.000 |
| python_dev-03 | jd-hr-real | True | 0.000 | True | 0.000 |
| python_dev-03 | jd-py-real | True | 0.000 | True | 0.000 |

## 20261122T061003Z-real-lexical-medium-c1 versus baseline (not accuracy)

Context characters: {"mean": 5462.35, "available_pairs": 20, "measured_pairs": 20, "reconstructed_full_pairs": 0, "reduction_vs_baseline": 0.0, "definition": "Unicode characters in cv_context sent to the LLM; historical full input recovered only when source content hash matches"}
Prompt characters: {"mean": 9623.9, "min": 5554, "max": 14396, "measured_pairs": 20, "definition": "pipeline system + user characters; excludes provider-added schema/formatting"}
Score-state agreement: {"count": 20, "compared": 20, "rate": 1}
Known-only diagnostic: {"both_known_pairs": 18, "mean_absolute_difference": 4.348888888888889}

| CV | JD | Both succeeded | Coverage delta | State agrees | Known-only absolute difference |
| --- | --- | --- | --- | --- | --- |
| database-01 | jd-hr-real | True | -0.150 | True | 6.430 |
| database-01 | jd-py-real | True | 0.000 | True | 10.000 |
| designer-01 | jd-hr-real | True | 0.000 | True | 0.000 |
| designer-01 | jd-py-real | True | 0.000 | True | null |
| devops-01 | jd-hr-real | True | 0.000 | True | 0.000 |
| devops-01 | jd-py-real | True | 0.000 | True | 18.750 |
| finance-01 | jd-hr-real | True | -0.400 | True | 0.000 |
| finance-01 | jd-py-real | True | 0.000 | True | 0.000 |
| hr-01 | jd-hr-real | True | 0.000 | True | 5.000 |
| hr-01 | jd-py-real | True | 0.000 | True | 0.000 |
| hr-02 | jd-hr-real | True | 0.000 | True | 7.500 |
| hr-02 | jd-py-real | True | 0.000 | True | 0.000 |
| hr-03 | jd-hr-real | True | 0.000 | True | 0.000 |
| hr-03 | jd-py-real | True | 0.000 | True | null |
| python_dev-01 | jd-hr-real | True | -0.100 | True | 0.000 |
| python_dev-01 | jd-py-real | True | 0.000 | True | 5.000 |
| python_dev-02 | jd-hr-real | True | -0.250 | True | 7.140 |
| python_dev-02 | jd-py-real | True | 0.000 | True | 0.000 |
| python_dev-03 | jd-hr-real | True | -0.100 | True | 0.000 |
| python_dev-03 | jd-py-real | True | 0.000 | True | 18.460 |
