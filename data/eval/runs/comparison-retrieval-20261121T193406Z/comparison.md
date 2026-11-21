# Latency comparison (not accuracy)

Diagnostics only, not accuracy: no human labels are used. Coverage, quote verification, agreement and known-only scores do not establish correctness.

Latency population: successful pairs; includes provider retries, excludes local semaphore queue and persistence. Token totals cover successful calls only; failed attempts may be unreported. Context means use successful pairs with available context lengths; reduction is 1 - run mean / baseline mean. Missing measurements remain null.

| Run | Success | p50 s | p95 s | Max s | ≤40 s | Input tokens | Output tokens | Reasoning tokens | Quote verification | Mean coverage | Mean context chars | Context reduction | State agreement | Known-only MAD |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 20261121T185747Z-full-high-c1 | 20/20 | 43.651 | 82.525 | 129.424 | 7 | 184509 | 16326 | null | 0.959 | 0.478 | 6253.200 | 0.000 | 1 | 0.000 |
| 20261121T193406Z-retrieved-lexical-high-c1 | 20/20 | 35.784 | 81.826 | 99.737 | 12 | 147243 | 15138 | null | 0.992 | 0.422 | 3826.700 | 0.388 | 1 | 3.965 |
| 20261121T193406Z-retrieved-dense-high-c1 | 20/20 | 46.852 | 225.320 | 469.372 | 8 | 196296 | 15910 | null | 0.985 | 0.445 | 4995.300 | 0.201 | 0.950 | 3.536 |
| 20261121T193406Z-retrieved-hybrid-high-c1 | 20/20 | 38.781 | 96.044 | 101.476 | 12 | 175600 | 16062 | null | 0.910 | 0.453 | 5492.750 | 0.122 | 0.950 | 2.802 |

## 20261121T185747Z-full-high-c1 versus baseline (not accuracy)

Context characters: {"mean": 6253.2, "available_pairs": 20, "measured_pairs": 0, "reconstructed_full_pairs": 20, "reduction_vs_baseline": 0.0, "definition": "Unicode characters in cv_context sent to the LLM; historical full input recovered only when source content hash matches"}
Prompt characters: {"mean": 9220.9, "min": 4446, "max": 15291, "measured_pairs": 20, "definition": "pipeline system + user characters; excludes provider-added schema/formatting"}
Score-state agreement: {"count": 20, "compared": 20, "rate": 1}
Known-only diagnostic: {"both_known_pairs": 20, "mean_absolute_difference": 0.0}

| CV | JD | Both succeeded | Coverage delta | State agrees | Known-only absolute difference |
| --- | --- | --- | --- | --- | --- |
| database-01 | jd-a | True | 0.000 | True | 0.000 |
| database-01 | jd-b | True | 0.000 | True | 0.000 |
| designer-01 | jd-a | True | 0.000 | True | 0.000 |
| designer-01 | jd-b | True | 0.000 | True | 0.000 |
| devops-01 | jd-a | True | 0.000 | True | 0.000 |
| devops-01 | jd-b | True | 0.000 | True | 0.000 |
| finance-01 | jd-a | True | 0.000 | True | 0.000 |
| finance-01 | jd-b | True | 0.000 | True | 0.000 |
| hr-01 | jd-a | True | 0.000 | True | 0.000 |
| hr-01 | jd-b | True | 0.000 | True | 0.000 |
| hr-02 | jd-a | True | 0.000 | True | 0.000 |
| hr-02 | jd-b | True | 0.000 | True | 0.000 |
| hr-03 | jd-a | True | 0.000 | True | 0.000 |
| hr-03 | jd-b | True | 0.000 | True | 0.000 |
| python_dev-01 | jd-a | True | 0.000 | True | 0.000 |
| python_dev-01 | jd-b | True | 0.000 | True | 0.000 |
| python_dev-02 | jd-a | True | 0.000 | True | 0.000 |
| python_dev-02 | jd-b | True | 0.000 | True | 0.000 |
| python_dev-03 | jd-a | True | 0.000 | True | 0.000 |
| python_dev-03 | jd-b | True | 0.000 | True | 0.000 |

## 20261121T193406Z-retrieved-lexical-high-c1 versus baseline (not accuracy)

Context characters: {"mean": 3826.7, "available_pairs": 20, "measured_pairs": 20, "reconstructed_full_pairs": 0, "reduction_vs_baseline": 0.38804132284270454, "definition": "Unicode characters in cv_context sent to the LLM; historical full input recovered only when source content hash matches"}
Prompt characters: {"mean": 6740.05, "min": 2951, "max": 11543, "measured_pairs": 20, "definition": "pipeline system + user characters; excludes provider-added schema/formatting"}
Score-state agreement: {"count": 20, "compared": 20, "rate": 1}
Known-only diagnostic: {"both_known_pairs": 18, "mean_absolute_difference": 3.9650000000000003}

| CV | JD | Both succeeded | Coverage delta | State agrees | Known-only absolute difference |
| --- | --- | --- | --- | --- | --- |
| database-01 | jd-a | True | 0.000 | True | 0.000 |
| database-01 | jd-b | True | 0.000 | True | 0.000 |
| designer-01 | jd-a | True | 0.000 | True | 0.000 |
| designer-01 | jd-b | True | -0.250 | True | null |
| devops-01 | jd-a | True | 0.000 | True | 0.000 |
| devops-01 | jd-b | True | 0.000 | True | 0.000 |
| finance-01 | jd-a | True | 0.000 | True | 0.000 |
| finance-01 | jd-b | True | 0.000 | True | 8.180 |
| hr-01 | jd-a | True | -0.100 | True | 0.000 |
| hr-01 | jd-b | True | 0.000 | True | 11.660 |
| hr-02 | jd-a | True | 0.000 | True | 0.000 |
| hr-02 | jd-b | True | -0.100 | True | 2.670 |
| hr-03 | jd-a | True | -0.200 | True | null |
| hr-03 | jd-b | True | 0.000 | True | 4.500 |
| python_dev-01 | jd-a | True | 0.000 | True | 0.000 |
| python_dev-01 | jd-b | True | 0.000 | True | 0.000 |
| python_dev-02 | jd-a | True | 0.000 | True | 8.570 |
| python_dev-02 | jd-b | True | 0.000 | True | 11.240 |
| python_dev-03 | jd-a | True | 0.000 | True | 0.000 |
| python_dev-03 | jd-b | True | -0.450 | True | 24.550 |

## 20261121T193406Z-retrieved-dense-high-c1 versus baseline (not accuracy)

Context characters: {"mean": 4995.3, "available_pairs": 20, "measured_pairs": 20, "reconstructed_full_pairs": 0, "reduction_vs_baseline": 0.2011610055651506, "definition": "Unicode characters in cv_context sent to the LLM; historical full input recovered only when source content hash matches"}
Prompt characters: {"mean": 7936.5, "min": 4446, "max": 13892, "measured_pairs": 20, "definition": "pipeline system + user characters; excludes provider-added schema/formatting"}
Score-state agreement: {"count": 19, "compared": 20, "rate": 0.95}
Known-only diagnostic: {"both_known_pairs": 20, "mean_absolute_difference": 3.5364999999999993}

| CV | JD | Both succeeded | Coverage delta | State agrees | Known-only absolute difference |
| --- | --- | --- | --- | --- | --- |
| database-01 | jd-a | True | 0.000 | True | 0.000 |
| database-01 | jd-b | True | 0.000 | True | 0.000 |
| designer-01 | jd-a | True | 0.000 | True | 0.000 |
| designer-01 | jd-b | True | -0.150 | True | 18.000 |
| devops-01 | jd-a | True | 0.000 | True | 0.000 |
| devops-01 | jd-b | True | 0.000 | True | 0.000 |
| finance-01 | jd-a | True | 0.000 | True | 0.000 |
| finance-01 | jd-b | True | 0.150 | True | 6.430 |
| hr-01 | jd-a | True | 0.000 | True | 0.000 |
| hr-01 | jd-b | True | 0.000 | True | 11.660 |
| hr-02 | jd-a | True | 0.000 | True | 0.000 |
| hr-02 | jd-b | True | -0.100 | True | 2.670 |
| hr-03 | jd-a | True | -0.100 | True | 15.000 |
| hr-03 | jd-b | True | 0.000 | True | 4.500 |
| python_dev-01 | jd-a | True | 0.000 | True | 0.000 |
| python_dev-01 | jd-b | True | 0.000 | True | 0.000 |
| python_dev-02 | jd-a | True | 0.000 | True | 0.000 |
| python_dev-02 | jd-b | True | -0.150 | False | 5.920 |
| python_dev-03 | jd-a | True | 0.000 | True | 0.000 |
| python_dev-03 | jd-b | True | -0.300 | True | 6.550 |

## 20261121T193406Z-retrieved-hybrid-high-c1 versus baseline (not accuracy)

Context characters: {"mean": 5492.75, "available_pairs": 20, "measured_pairs": 20, "reconstructed_full_pairs": 0, "reduction_vs_baseline": 0.12160973581526258, "definition": "Unicode characters in cv_context sent to the LLM; historical full input recovered only when source content hash matches"}
Prompt characters: {"mean": 8445.8, "min": 4446, "max": 14458, "measured_pairs": 20, "definition": "pipeline system + user characters; excludes provider-added schema/formatting"}
Score-state agreement: {"count": 19, "compared": 20, "rate": 0.95}
Known-only diagnostic: {"both_known_pairs": 20, "mean_absolute_difference": 2.8024999999999998}

| CV | JD | Both succeeded | Coverage delta | State agrees | Known-only absolute difference |
| --- | --- | --- | --- | --- | --- |
| database-01 | jd-a | True | 0.000 | True | 0.000 |
| database-01 | jd-b | True | 0.000 | True | 0.000 |
| designer-01 | jd-a | True | 0.000 | True | 0.000 |
| designer-01 | jd-b | True | 0.000 | True | 0.000 |
| devops-01 | jd-a | True | -0.100 | True | 1.230 |
| devops-01 | jd-b | True | 0.000 | True | 0.000 |
| finance-01 | jd-a | True | 0.000 | True | 0.000 |
| finance-01 | jd-b | True | 0.000 | True | 0.000 |
| hr-01 | jd-a | True | 0.000 | True | 0.000 |
| hr-01 | jd-b | True | 0.000 | True | 16.660 |
| hr-02 | jd-a | True | 0.000 | True | 0.000 |
| hr-02 | jd-b | True | 0.000 | True | 3.000 |
| hr-03 | jd-a | True | -0.100 | True | 15.000 |
| hr-03 | jd-b | True | 0.000 | True | 6.000 |
| python_dev-01 | jd-a | True | 0.000 | True | 0.000 |
| python_dev-01 | jd-b | True | 0.000 | True | 0.000 |
| python_dev-02 | jd-a | True | -0.150 | True | 12.860 |
| python_dev-02 | jd-b | True | -0.150 | False | 1.300 |
| python_dev-03 | jd-a | True | 0.000 | True | 0.000 |
| python_dev-03 | jd-b | True | 0.000 | True | 0.000 |
