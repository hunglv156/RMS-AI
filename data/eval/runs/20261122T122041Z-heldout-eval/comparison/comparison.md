# Latency comparison (not accuracy)

Diagnostics only, not accuracy: no human labels are used. Coverage, quote verification, agreement and known-only scores do not establish correctness.

Latency population: successful pairs; includes provider retries, excludes local semaphore queue and persistence. Token totals cover successful calls only; failed attempts may be unreported. Context means use successful pairs with available context lengths; reduction is 1 - run mean / baseline mean. Missing measurements remain null.

| Run | Success | p50 s | p95 s | Max s | ≤40 s | Input tokens | Output tokens | Reasoning tokens | Quote verification | Mean coverage | Mean context chars | Context reduction | State agreement | Known-only MAD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 20261122T122041Z-heldout-baseline-flashhigh-v1 | 20/20 | 59.121 | 175.641 | 236.831 | 3 | 199047 | 20918 | null | 0.959 | 0.403 | 4528.850 | 0.000 | 1 | 0.000 |
| 20261122T122041Z-heldout-final-flashlow-v2-hedge20 | 20/20 | 8.190 | 33.637 | 41.069 | 19 | 93847 | 13191 | null | 0.986 | 0.595 | 4528.850 | 0.000 | 0.950 | 21.648 |

## 20261122T122041Z-heldout-baseline-flashhigh-v1 versus baseline (not accuracy)

Context characters: {"mean": 4528.85, "available_pairs": 20, "measured_pairs": 20, "reconstructed_full_pairs": 0, "reduction_vs_baseline": 0.0, "definition": "Unicode characters in cv_context sent to the LLM; historical full input recovered only when source content hash matches"}
Prompt characters: {"mean": 8659.7, "min": 5163, "max": 13344, "measured_pairs": 20, "definition": "pipeline system + user characters; excludes provider-added schema/formatting"}
Score-state agreement: {"count": 20, "compared": 20, "rate": 1}
Known-only diagnostic: {"both_known_pairs": 18, "mean_absolute_difference": 0.0}

| CV | JD | Both succeeded | Coverage delta | State agrees | Known-only absolute difference |
| --- | --- | --- | --- | --- | --- |
| database-h1 | jd-hr-real | True | 0.000 | True | 0.000 |
| database-h1 | jd-py-real | True | 0.000 | True | 0.000 |
| designer-h1 | jd-hr-real | True | 0.000 | True | 0.000 |
| designer-h1 | jd-py-real | True | 0.000 | True | 0.000 |
| devops-h1 | jd-hr-real | True | 0.000 | True | null |
| devops-h1 | jd-py-real | True | 0.000 | True | 0.000 |
| finance-h1 | jd-hr-real | True | 0.000 | True | 0.000 |
| finance-h1 | jd-py-real | True | 0.000 | True | 0.000 |
| hr-h1 | jd-hr-real | True | 0.000 | True | 0.000 |
| hr-h1 | jd-py-real | True | 0.000 | True | 0.000 |
| hr-h2 | jd-hr-real | True | 0.000 | True | 0.000 |
| hr-h2 | jd-py-real | True | 0.000 | True | null |
| hr-h3 | jd-hr-real | True | 0.000 | True | 0.000 |
| hr-h3 | jd-py-real | True | 0.000 | True | 0.000 |
| python_dev-h1 | jd-hr-real | True | 0.000 | True | 0.000 |
| python_dev-h1 | jd-py-real | True | 0.000 | True | 0.000 |
| python_dev-h2 | jd-hr-real | True | 0.000 | True | 0.000 |
| python_dev-h2 | jd-py-real | True | 0.000 | True | 0.000 |
| python_dev-h3 | jd-hr-real | True | 0.000 | True | 0.000 |
| python_dev-h3 | jd-py-real | True | 0.000 | True | 0.000 |

## 20261122T122041Z-heldout-final-flashlow-v2-hedge20 versus baseline (not accuracy)

Context characters: {"mean": 4528.85, "available_pairs": 20, "measured_pairs": 20, "reconstructed_full_pairs": 0, "reduction_vs_baseline": 0.0, "definition": "Unicode characters in cv_context sent to the LLM; historical full input recovered only when source content hash matches"}
Prompt characters: {"mean": 10434.7, "min": 6938, "max": 15119, "measured_pairs": 20, "definition": "pipeline system + user characters; excludes provider-added schema/formatting"}
Score-state agreement: {"count": 19, "compared": 20, "rate": 0.95}
Known-only diagnostic: {"both_known_pairs": 18, "mean_absolute_difference": 21.648333333333333}

| CV | JD | Both succeeded | Coverage delta | State agrees | Known-only absolute difference |
| --- | --- | --- | --- | --- | --- |
| database-h1 | jd-hr-real | True | 0.400 | True | 56.000 |
| database-h1 | jd-py-real | True | 0.200 | True | 27.020 |
| designer-h1 | jd-hr-real | True | 0.000 | True | 1.670 |
| designer-h1 | jd-py-real | True | 0.200 | True | 26.670 |
| devops-h1 | jd-hr-real | True | 0.650 | True | null |
| devops-h1 | jd-py-real | True | -0.150 | True | 17.500 |
| finance-h1 | jd-hr-real | True | 0.400 | True | 25.900 |
| finance-h1 | jd-py-real | True | 0.200 | True | 16.670 |
| hr-h1 | jd-hr-real | True | 0.000 | True | 16.500 |
| hr-h1 | jd-py-real | True | 0.150 | True | 26.670 |
| hr-h2 | jd-hr-real | True | 0.000 | True | 22.940 |
| hr-h2 | jd-py-real | True | 0.300 | True | null |
| hr-h3 | jd-hr-real | True | 0.000 | True | 10.000 |
| hr-h3 | jd-py-real | True | 0.100 | True | 40.000 |
| python_dev-h1 | jd-hr-real | True | 0.500 | True | 28.330 |
| python_dev-h1 | jd-py-real | True | 0.000 | True | 11.250 |
| python_dev-h2 | jd-hr-real | True | 0.500 | True | 20.000 |
| python_dev-h2 | jd-py-real | True | -0.200 | False | 7.380 |
| python_dev-h3 | jd-hr-real | True | 0.400 | True | 22.670 |
| python_dev-h3 | jd-py-real | True | 0.200 | True | 12.500 |
