# Screening accuracy against silver labels

System level: result.criteria[].validation.level, the post-quote-verification level in ScreenedCriterion/AssessmentValidation (app/pipelines/screening/models.py and app/assessment/evidence.py). assessment.level and validation.raw_level are pre-validation and are not evaluated.
Six exact classes: strong, adequate, partial, absent, unknown, needs_review. Unweighted κ keeps unknown and needs_review as distinct nominal classes. Macro-F1 averages the union of classes present in labels or predictions. Undefined κ (zero expected disagreement) and constant-rank Spearman are null; no-positive binary precision/recall/F1 are 0.
Linear-weighted κ uses the fixed absent < partial < adequate < strong scale; pairs with either unknown or needs_review are excluded, with retained criterion n reported. Three-class mapping: strong/adequate/partial → evidence, absent → absent, unknown/needs_review → unknown. Binary positive = evidence; all other levels are negative.
System overall_fit: GUIDELINES v1.1 rule 5 applied to validated must_have levels (none with evidence → poor; all adequate/strong → good; otherwise partial). Labelled fit is used as recorded and checked against rule 5 for final labels.
Coverage = sum(JD weights with a validated ordinal level)/sum(all JD weights). Known-only score = 100 × sum(weight × configured rubric[level])/known weight, independent of the min_coverage threshold; null if no known weight. Spearman uses average ranks for ties and pairwise exclusion of null scores, with n reported.
95% percentile bootstrap: 2000 resamples of CV×JD pairs retaining all their criteria, NumPy default_rng seed=20261122, restarted per scope/run for comparable draws; undefined κ draws are omitted and their counts reported. JD scopes resample within JD; priority scopes resample full pairs then select criteria. Fit/correlations in priority scopes still use whole-pair fit and scores, so are identical to all-pair metrics.
Every run must have exactly the labelled pair set and successful records with exactly the JD criterion set; failures are rejected rather than silently dropped. Criteria have equal weight in classification metrics; JD weights affect coverage and known-only score only. No LLM calls.

## Headline results

Cells show estimate (n), then the 95% pair-bootstrap interval where available.

| Run | Exact accuracy | Exact κ | Collapsed κ | Evidence F1 | Fit accuracy |
| --- | --- | --- | --- | --- | --- |
| 20261122T054842Z-real-lexical-high-c1 | 0.6714 (n=140) [0.6214, 0.7214] | 0.5222 (n=140) [0.4271, 0.5942] | 0.6639 (n=140) [0.5620, 0.7461] | 0.9333 (n=140) [0.8837, 0.9697] | 0.9000 (n=20) [0.7500, 1.0000] |
| 20261122T061003Z-real-lexical-medium-c1 | 0.6786 (n=140) [0.6214, 0.7357] | 0.5311 (n=140) [0.4190, 0.6269] | 0.6151 (n=140) [0.5151, 0.6941] | 0.9027 (n=140) [0.8372, 0.9524] | 0.9000 (n=20) [0.7500, 1.0000] |

## 20261122T054842Z-real-lexical-high-c1

### all (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.6714 (n=140) [0.6214, 0.7214] | 2000/2000 |
| exact | macro_f1 | 0.5467 (n=140) | — |
| exact | kappa | 0.5222 (n=140) [0.4271, 0.5942] | 2000/2000 |
| exact | linear_weighted_kappa | 0.5578 (n=57) | — |
| collapsed | accuracy | 0.8071 (n=140) | — |
| collapsed | macro_f1 | 0.5825 (n=140) | — |
| collapsed | kappa | 0.6639 (n=140) [0.5620, 0.7461] | 2000/2000 |
| evidence | accuracy | 0.9429 (n=140) | — |
| evidence | macro_f1 | 0.9417 (n=140) | — |
| evidence | kappa | 0.8834 (n=140) | — |
| evidence | precision | 0.9655 (n=140) | — |
| evidence | recall | 0.9032 (n=140) | — |
| evidence | f1 | 0.9333 (n=140) [0.8837, 0.9697] | 2000/2000 |
| fit | accuracy | 0.9000 (n=20) [0.7500, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.6296 (n=20) | — |
| fit | kappa | 0.8182 (n=20) | — |
| fit | coverage_spearman | 0.9069 (n=20) | — |
| fit | known_only_score_spearman | 0.8759 (n=18) | — |

exact confusion (n=140; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 6 | 2 | 0 | 0 | 0 | 0 |
| adequate | 2 | 11 | 15 | 0 | 1 | 0 |
| partial | 0 | 0 | 20 | 0 | 5 | 0 |
| absent | 0 | 0 | 1 | 0 | 19 | 0 |
| unknown | 0 | 0 | 1 | 0 | 57 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 10 | 0 | 0 |
| partial | 0 | 8 | 0 |
| good | 0 | 2 | 0 |

### jd/jd-hr-real (10 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.6857 (n=70) [0.6000, 0.7571] | 2000/2000 |
| exact | macro_f1 | 0.5658 (n=70) | — |
| exact | kappa | 0.5696 (n=70) [0.4444, 0.6559] | 2000/2000 |
| exact | linear_weighted_kappa | 0.5985 (n=35) | — |
| collapsed | accuracy | 0.8429 (n=70) | — |
| collapsed | macro_f1 | 0.5970 (n=70) | — |
| collapsed | kappa | 0.7206 (n=70) [0.5933, 0.8265] | 2000/2000 |
| evidence | accuracy | 0.9571 (n=70) | — |
| evidence | macro_f1 | 0.9571 (n=70) | — |
| evidence | kappa | 0.9143 (n=70) | — |
| evidence | precision | 0.9444 (n=70) | — |
| evidence | recall | 0.9714 (n=70) | — |
| evidence | f1 | 0.9577 (n=70) [0.8966, 1.0000] | 2000/2000 |
| fit | accuracy | 0.8000 (n=10) [0.5000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.6000 (n=10) | — |
| fit | kappa | 0.6667 (n=10) | — |
| fit | coverage_spearman | 0.9232 (n=10) | — |
| fit | known_only_score_spearman | 0.8681 (n=10) | — |

exact confusion (n=70; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 5 | 2 | 0 | 0 | 0 | 0 |
| adequate | 1 | 7 | 8 | 0 | 0 | 0 |
| partial | 0 | 0 | 11 | 0 | 1 | 0 |
| absent | 0 | 0 | 1 | 0 | 8 | 0 |
| unknown | 0 | 0 | 1 | 0 | 25 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=10; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 4 | 0 | 0 |
| partial | 0 | 4 | 0 |
| good | 0 | 2 | 0 |

### jd/jd-py-real (10 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.6571 (n=70) [0.6000, 0.7143] | 2000/2000 |
| exact | macro_f1 | 0.5116 (n=70) | — |
| exact | kappa | 0.4584 (n=70) [0.2747, 0.5714] | 2000/2000 |
| exact | linear_weighted_kappa | 0.4568 (n=22) | — |
| collapsed | accuracy | 0.7714 (n=70) | — |
| collapsed | macro_f1 | 0.5660 (n=70) | — |
| collapsed | kappa | 0.5957 (n=70) [0.3906, 0.7222] | 2000/2000 |
| evidence | accuracy | 0.9286 (n=70) | — |
| evidence | macro_f1 | 0.9215 (n=70) | — |
| evidence | kappa | 0.8439 (n=70) | — |
| evidence | precision | 1.0000 (n=70) | — |
| evidence | recall | 0.8148 (n=70) | — |
| evidence | f1 | 0.8980 (n=70) [0.7857, 0.9565] | 2000/2000 |
| fit | accuracy | 1.0000 (n=10) [1.0000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 1.0000 (n=10) | — |
| fit | kappa | 1.0000 (n=10) | — |
| fit | coverage_spearman | 0.8827 (n=10) | — |
| fit | known_only_score_spearman | 0.9300 (n=8) | — |

exact confusion (n=70; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 1 | 0 | 0 | 0 | 0 | 0 |
| adequate | 1 | 4 | 7 | 0 | 1 | 0 |
| partial | 0 | 0 | 9 | 0 | 4 | 0 |
| absent | 0 | 0 | 0 | 0 | 11 | 0 |
| unknown | 0 | 0 | 0 | 0 | 32 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=10; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 6 | 0 | 0 |
| partial | 0 | 4 | 0 |
| good | 0 | 0 | 0 |

### priority/must_have (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.7750 (n=80) [0.7500, 0.8125] | 2000/2000 |
| exact | macro_f1 | 0.6460 (n=80) | — |
| exact | kappa | 0.6246 (n=80) [0.4739, 0.7033] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7525 (n=25) | — |
| collapsed | accuracy | 0.8375 (n=80) | — |
| collapsed | macro_f1 | 0.6092 (n=80) | — |
| collapsed | kappa | 0.6955 (n=80) [0.5192, 0.7980] | 2000/2000 |
| evidence | accuracy | 0.9750 (n=80) | — |
| evidence | macro_f1 | 0.9715 (n=80) | — |
| evidence | kappa | 0.9431 (n=80) | — |
| evidence | precision | 1.0000 (n=80) | — |
| evidence | recall | 0.9259 (n=80) | — |
| evidence | f1 | 0.9615 (n=80) [0.8889, 1.0000] | 2000/2000 |
| fit | accuracy | 0.9000 (n=20) [0.7500, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.6296 (n=20) | — |
| fit | kappa | 0.8182 (n=20) | — |
| fit | coverage_spearman | 0.9069 (n=20) | — |
| fit | known_only_score_spearman | 0.8759 (n=18) | — |

exact confusion (n=80; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 4 | 0 | 0 | 0 | 0 | 0 |
| adequate | 1 | 6 | 4 | 0 | 0 | 0 |
| partial | 0 | 0 | 10 | 0 | 2 | 0 |
| absent | 0 | 0 | 0 | 0 | 11 | 0 |
| unknown | 0 | 0 | 0 | 0 | 42 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 10 | 0 | 0 |
| partial | 0 | 8 | 0 |
| good | 0 | 2 | 0 |

### priority/nice_to_have (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.5333 (n=60) [0.4333, 0.6333] | 2000/2000 |
| exact | macro_f1 | 0.4449 (n=60) | — |
| exact | kappa | 0.3848 (n=60) [0.2621, 0.4960] | 2000/2000 |
| exact | linear_weighted_kappa | 0.4030 (n=32) | — |
| collapsed | accuracy | 0.7667 (n=60) | — |
| collapsed | macro_f1 | 0.5365 (n=60) | — |
| collapsed | kappa | 0.5827 (n=60) [0.4571, 0.7137] | 2000/2000 |
| evidence | accuracy | 0.9000 (n=60) | — |
| evidence | macro_f1 | 0.8982 (n=60) | — |
| evidence | kappa | 0.7966 (n=60) | — |
| evidence | precision | 0.9394 (n=60) | — |
| evidence | recall | 0.8857 (n=60) | — |
| evidence | f1 | 0.9118 (n=60) [0.8364, 0.9684] | 2000/2000 |
| fit | accuracy | 0.9000 (n=20) [0.7500, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.6296 (n=20) | — |
| fit | kappa | 0.8182 (n=20) | — |
| fit | coverage_spearman | 0.9069 (n=20) | — |
| fit | known_only_score_spearman | 0.8759 (n=18) | — |

exact confusion (n=60; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 2 | 2 | 0 | 0 | 0 | 0 |
| adequate | 1 | 5 | 11 | 0 | 1 | 0 |
| partial | 0 | 0 | 10 | 0 | 3 | 0 |
| absent | 0 | 0 | 1 | 0 | 8 | 0 |
| unknown | 0 | 0 | 1 | 0 | 15 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 10 | 0 | 0 |
| partial | 0 | 8 | 0 |
| good | 0 | 2 | 0 |

### Error patterns

Of 20 labelled absent criteria, 19 became unknown. Adequate → partial accounts for 15 errors. The absent/unknown distinction reflects a material v1.1 convention difference; evidence detection ignores that distinction, so its F1 can be high despite exact-level errors.

Known-only score correlation has n=18; 2 pairs have zero known weight and no score. Coverage correlation retains all pairs. Fit errors below identify which classes drive the headline accuracy; the full 3×3 matrix should be read alongside it.

| Label → system | Count |
| --- | --- |
| absent → unknown | 19 |
| adequate → partial | 15 |
| partial → unknown | 5 |
| adequate → strong | 2 |
| strong → adequate | 2 |
| adequate → unknown | 1 |
| unknown → partial | 1 |
| absent → partial | 1 |

| JD / criterion | Errors | n |
| --- | --- | --- |
| jd-py-real/communication_collaboration | 8 | 10 |
| jd-hr-real/education_hr_business | 7 | 10 |
| jd-hr-real/interpersonal_communication | 6 | 10 |
| jd-py-real/backend_experience | 6 | 10 |
| jd-py-real/education_cs | 6 | 10 |
| jd-hr-real/hr_experience | 5 | 10 |
| jd-py-real/postgresql_database | 2 | 10 |
| jd-hr-real/talent_acquisition | 1 | 10 |
| jd-hr-real/employee_relations_compliance | 1 | 10 |
| jd-hr-real/hris_office_tools | 1 | 10 |
| jd-hr-real/hr_programs | 1 | 10 |
| jd-py-real/python_frameworks | 1 | 10 |
| jd-py-real/cloud_docker_linux | 1 | 10 |
| jd-py-real/software_architecture | 0 | 10 |

| Pair | Label fit | System fit |
| --- | --- | --- |
| hr-01__jd-hr-real | good | partial |
| hr-02__jd-hr-real | good | partial |

Quote-validation level changes: 0 criterion assessments.


## 20261122T061003Z-real-lexical-medium-c1

### all (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.6786 (n=140) [0.6214, 0.7357] | 2000/2000 |
| exact | macro_f1 | 0.4630 (n=140) | — |
| exact | kappa | 0.5311 (n=140) [0.4190, 0.6269] | 2000/2000 |
| exact | linear_weighted_kappa | 0.6441 (n=51) | — |
| collapsed | accuracy | 0.7786 (n=140) | — |
| collapsed | macro_f1 | 0.5639 (n=140) | — |
| collapsed | kappa | 0.6151 (n=140) [0.5151, 0.6941] | 2000/2000 |
| evidence | accuracy | 0.9214 (n=140) | — |
| evidence | macro_f1 | 0.9184 (n=140) | — |
| evidence | kappa | 0.8378 (n=140) | — |
| evidence | precision | 1.0000 (n=140) | — |
| evidence | recall | 0.8226 (n=140) | — |
| evidence | f1 | 0.9027 (n=140) [0.8372, 0.9524] | 2000/2000 |
| fit | accuracy | 0.9000 (n=20) [0.7500, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.9221 (n=20) | — |
| fit | kappa | 0.8246 (n=20) | — |
| fit | coverage_spearman | 0.8748 (n=20) | — |
| fit | known_only_score_spearman | 0.8688 (n=18) | — |

exact confusion (n=140; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 6 | 2 | 0 | 0 | 0 | 0 |
| adequate | 4 | 16 | 8 | 0 | 1 | 0 |
| partial | 0 | 0 | 15 | 0 | 7 | 3 |
| absent | 0 | 0 | 0 | 0 | 20 | 0 |
| unknown | 0 | 0 | 0 | 0 | 58 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 10 | 0 | 0 |
| partial | 2 | 6 | 0 |
| good | 0 | 0 | 2 |

### jd/jd-hr-real (10 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.6571 (n=70) [0.5714, 0.7429] | 2000/2000 |
| exact | macro_f1 | 0.4581 (n=70) | — |
| exact | kappa | 0.5268 (n=70) [0.3873, 0.6379] | 2000/2000 |
| exact | linear_weighted_kappa | 0.6110 (n=29) | — |
| collapsed | accuracy | 0.7857 (n=70) | — |
| collapsed | macro_f1 | 0.5608 (n=70) | — |
| collapsed | kappa | 0.6275 (n=70) [0.5070, 0.7059] | 2000/2000 |
| evidence | accuracy | 0.9143 (n=70) | — |
| evidence | macro_f1 | 0.9137 (n=70) | — |
| evidence | kappa | 0.8286 (n=70) | — |
| evidence | precision | 1.0000 (n=70) | — |
| evidence | recall | 0.8286 (n=70) | — |
| evidence | f1 | 0.9062 (n=70) [0.8000, 0.9815] | 2000/2000 |
| fit | accuracy | 0.8000 (n=10) [0.5000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.8222 (n=10) | — |
| fit | kappa | 0.6875 (n=10) | — |
| fit | coverage_spearman | 0.8681 (n=10) | — |
| fit | known_only_score_spearman | 0.8858 (n=10) | — |

exact confusion (n=70; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 5 | 2 | 0 | 0 | 0 | 0 |
| adequate | 1 | 9 | 6 | 0 | 0 | 0 |
| partial | 0 | 0 | 6 | 0 | 3 | 3 |
| absent | 0 | 0 | 0 | 0 | 9 | 0 |
| unknown | 0 | 0 | 0 | 0 | 26 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=10; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 4 | 0 | 0 |
| partial | 2 | 2 | 0 |
| good | 0 | 0 | 2 |

### jd/jd-py-real (10 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.7000 (n=70) [0.6286, 0.7714] | 2000/2000 |
| exact | macro_f1 | 0.5300 (n=70) | — |
| exact | kappa | 0.5298 (n=70) [0.2991, 0.6735] | 2000/2000 |
| exact | linear_weighted_kappa | 0.6802 (n=22) | — |
| collapsed | accuracy | 0.7714 (n=70) | — |
| collapsed | macro_f1 | 0.5660 (n=70) | — |
| collapsed | kappa | 0.5957 (n=70) [0.3906, 0.7222] | 2000/2000 |
| evidence | accuracy | 0.9286 (n=70) | — |
| evidence | macro_f1 | 0.9215 (n=70) | — |
| evidence | kappa | 0.8439 (n=70) | — |
| evidence | precision | 1.0000 (n=70) | — |
| evidence | recall | 0.8148 (n=70) | — |
| evidence | f1 | 0.8980 (n=70) [0.7857, 0.9565] | 2000/2000 |
| fit | accuracy | 1.0000 (n=10) [1.0000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 1.0000 (n=10) | — |
| fit | kappa | 1.0000 (n=10) | — |
| fit | coverage_spearman | 0.8827 (n=10) | — |
| fit | known_only_score_spearman | 0.9300 (n=8) | — |

exact confusion (n=70; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 1 | 0 | 0 | 0 | 0 | 0 |
| adequate | 3 | 7 | 2 | 0 | 1 | 0 |
| partial | 0 | 0 | 9 | 0 | 4 | 0 |
| absent | 0 | 0 | 0 | 0 | 11 | 0 |
| unknown | 0 | 0 | 0 | 0 | 32 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=10; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 6 | 0 | 0 |
| partial | 0 | 4 | 0 |
| good | 0 | 0 | 0 |

### priority/must_have (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.7625 (n=80) [0.7000, 0.8250] | 2000/2000 |
| exact | macro_f1 | 0.5373 (n=80) | — |
| exact | kappa | 0.6055 (n=80) [0.3909, 0.7476] | 2000/2000 |
| exact | linear_weighted_kappa | 0.8772 (n=21) | — |
| collapsed | accuracy | 0.7875 (n=80) | — |
| collapsed | macro_f1 | 0.5689 (n=80) | — |
| collapsed | kappa | 0.5946 (n=80) [0.3710, 0.7325] | 2000/2000 |
| evidence | accuracy | 0.9250 (n=80) | — |
| evidence | macro_f1 | 0.9107 (n=80) | — |
| evidence | kappa | 0.8226 (n=80) | — |
| evidence | precision | 1.0000 (n=80) | — |
| evidence | recall | 0.7778 (n=80) | — |
| evidence | f1 | 0.8750 (n=80) [0.6923, 0.9706] | 2000/2000 |
| fit | accuracy | 0.9000 (n=20) [0.7500, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.9221 (n=20) | — |
| fit | kappa | 0.8246 (n=20) | — |
| fit | coverage_spearman | 0.8748 (n=20) | — |
| fit | known_only_score_spearman | 0.8688 (n=18) | — |

exact confusion (n=80; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 4 | 0 | 0 | 0 | 0 | 0 |
| adequate | 2 | 9 | 0 | 0 | 0 | 0 |
| partial | 0 | 0 | 6 | 0 | 3 | 3 |
| absent | 0 | 0 | 0 | 0 | 11 | 0 |
| unknown | 0 | 0 | 0 | 0 | 42 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 10 | 0 | 0 |
| partial | 2 | 6 | 0 |
| good | 0 | 0 | 2 |

### priority/nice_to_have (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.5667 (n=60) [0.4500, 0.6833] | 2000/2000 |
| exact | macro_f1 | 0.4628 (n=60) | — |
| exact | kappa | 0.4267 (n=60) [0.2821, 0.5609] | 2000/2000 |
| exact | linear_weighted_kappa | 0.4721 (n=30) | — |
| collapsed | accuracy | 0.7667 (n=60) | — |
| collapsed | macro_f1 | 0.5396 (n=60) | — |
| collapsed | kappa | 0.5942 (n=60) [0.4643, 0.7298] | 2000/2000 |
| evidence | accuracy | 0.9167 (n=60) | — |
| evidence | macro_f1 | 0.9161 (n=60) | — |
| evidence | kappa | 0.8333 (n=60) | — |
| evidence | precision | 1.0000 (n=60) | — |
| evidence | recall | 0.8571 (n=60) | — |
| evidence | f1 | 0.9231 (n=60) [0.8571, 0.9787] | 2000/2000 |
| fit | accuracy | 0.9000 (n=20) [0.7500, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.9221 (n=20) | — |
| fit | kappa | 0.8246 (n=20) | — |
| fit | coverage_spearman | 0.8748 (n=20) | — |
| fit | known_only_score_spearman | 0.8688 (n=18) | — |

exact confusion (n=60; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 2 | 2 | 0 | 0 | 0 | 0 |
| adequate | 2 | 7 | 8 | 0 | 1 | 0 |
| partial | 0 | 0 | 9 | 0 | 4 | 0 |
| absent | 0 | 0 | 0 | 0 | 9 | 0 |
| unknown | 0 | 0 | 0 | 0 | 16 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 10 | 0 | 0 |
| partial | 2 | 6 | 0 |
| good | 0 | 0 | 2 |

### Error patterns

Of 20 labelled absent criteria, 20 became unknown. Adequate → partial accounts for 8 errors. The absent/unknown distinction reflects a material v1.1 convention difference; evidence detection ignores that distinction, so its F1 can be high despite exact-level errors.

Known-only score correlation has n=18; 2 pairs have zero known weight and no score. Coverage correlation retains all pairs. Fit errors below identify which classes drive the headline accuracy; the full 3×3 matrix should be read alongside it.

| Label → system | Count |
| --- | --- |
| absent → unknown | 20 |
| adequate → partial | 8 |
| partial → unknown | 7 |
| adequate → strong | 4 |
| partial → needs_review | 3 |
| strong → adequate | 2 |
| adequate → unknown | 1 |

| JD / criterion | Errors | n |
| --- | --- | --- |
| jd-hr-real/hr_experience | 7 | 10 |
| jd-py-real/backend_experience | 7 | 10 |
| jd-py-real/education_cs | 7 | 10 |
| jd-hr-real/education_hr_business | 6 | 10 |
| jd-hr-real/interpersonal_communication | 5 | 10 |
| jd-py-real/communication_collaboration | 5 | 10 |
| jd-hr-real/hr_programs | 3 | 10 |
| jd-py-real/postgresql_database | 2 | 10 |
| jd-hr-real/talent_acquisition | 1 | 10 |
| jd-hr-real/employee_relations_compliance | 1 | 10 |
| jd-hr-real/hris_office_tools | 1 | 10 |
| jd-py-real/python_frameworks | 0 | 10 |
| jd-py-real/cloud_docker_linux | 0 | 10 |
| jd-py-real/software_architecture | 0 | 10 |

| Pair | Label fit | System fit |
| --- | --- | --- |
| database-01__jd-hr-real | partial | poor |
| finance-01__jd-hr-real | partial | poor |

Quote-validation level changes: 3 criterion assessments.

## Inter-annotator agreement

Raw overall_fit is used as recorded, not recomputed under v1.1; changes reflect both annotation and guideline differences.

| Comparison | Accuracy | κ | Collapsed κ | Evidence κ | Fit κ |
| --- | --- | --- | --- | --- | --- |
| claude vs gpt | 0.7071 (n=140) | 0.5799 (n=140) | 0.6778 (n=140) | 0.9128 (n=140) | 0.1176 (n=20) |
| claude vs final | 0.9500 (n=140) | 0.9317 (n=140) | 0.9884 (n=140) | 0.9855 (n=140) | 0.5652 (n=20) |
| gpt vs final | 0.7500 (n=140) | 0.6409 (n=140) | 0.6885 (n=140) | 0.9275 (n=140) | 0.2063 (n=20) |

## Limitations

- Silver (LLM) labels are not human ground truth.
- The adjudicator was Claude, the same model family as one annotator; agreement is not independent validation.
- GUIDELINES v1.1 codifies that annotator's absent/poor conventions, potentially favoring its decisions.
- Small n: 10 CVs × 2 JDs (20 pairs, 140 criteria); criteria within a pair are dependent, and the same CV occurs under both JDs.
- expected_group is sampling metadata, not ground truth; it is never used in evaluation.
- Latency was measured on a shared gateway and is not an accuracy measure or a controlled speed comparison.
- Bootstrap resamples CV×JD pairs, as specified, not CVs; cross-JD dependence for the same CV is not preserved. Intervals are descriptive percentile intervals, not a test of run differences.
- Illustrative JD weights and configured rubric values are not calibrated. Fit is a deterministic rule-5 proxy, not a hiring recommendation.
