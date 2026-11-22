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
| 20261122T083536Z-v2-lexical-gemini-3-8-flash-high-c1 | 0.6929 (n=140) [0.6000, 0.7786] | 0.5876 (n=140) [0.4763, 0.6911] | 0.6823 (n=140) [0.5593, 0.7911] | 0.8519 (n=140) [0.7529, 0.9278] | 0.9000 (n=20) [0.7500, 1.0000] |
| 20261122T083536Z-v2-lexical-gemini-3-8-flash-medium-c1 | 0.6571 (n=140) [0.5643, 0.7429] | 0.5453 (n=140) [0.4408, 0.6422] | 0.6075 (n=140) [0.4762, 0.7146] | 0.7843 (n=140) [0.6593, 0.8738] | 0.9000 (n=20) [0.7500, 1.0000] |
| 20261122T083536Z-v2-lexical-gemini-3-8-flash-low-c1 | 0.7286 (n=140) [0.6286, 0.8143] | 0.6356 (n=140) [0.5113, 0.7448] | 0.7107 (n=140) [0.5816, 0.8280] | 0.8440 (n=140) [0.7473, 0.9247] | 0.9500 (n=20) [0.8500, 1.0000] |
| 20261122T083536Z-v2-lexical-gemini-4-argon-low-c1 | 0.7214 (n=140) [0.6214, 0.8143] | 0.6284 (n=140) [0.4980, 0.7395] | 0.7247 (n=140) [0.5833, 0.8392] | 0.9217 (n=140) [0.8602, 0.9643] | 0.8500 (n=20) [0.7000, 1.0000] |
| 20261122T083536Z-v2-lexical-gemini-4-argon-medium-c1 | 0.7071 (n=140) [0.6071, 0.8000] | 0.6099 (n=140) [0.4820, 0.7267] | 0.7045 (n=140) [0.5641, 0.8236] | 0.9123 (n=140) [0.8453, 0.9573] | 0.8500 (n=20) [0.7000, 1.0000] |
| 20261122T083536Z-v2-lexical-deepseek-v4-flash-c1 | 0.6357 (n=140) [0.5429, 0.7286] | 0.5287 (n=140) [0.4122, 0.6376] | 0.6308 (n=140) [0.4823, 0.7660] | 0.8519 (n=140) [0.7324, 0.9286] | 0.8500 (n=20) [0.7000, 1.0000] |

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


## 20261122T083536Z-v2-lexical-gemini-3-8-flash-high-c1

### all (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.6929 (n=140) [0.6000, 0.7786] | 2000/2000 |
| exact | macro_f1 | 0.5273 (n=140) | — |
| exact | kappa | 0.5876 (n=140) [0.4763, 0.6911] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7318 (n=72) | — |
| collapsed | accuracy | 0.7929 (n=140) | — |
| collapsed | macro_f1 | 0.7754 (n=140) | — |
| collapsed | kappa | 0.6823 (n=140) [0.5593, 0.7911] | 2000/2000 |
| evidence | accuracy | 0.8857 (n=140) | — |
| evidence | macro_f1 | 0.8794 (n=140) | — |
| evidence | kappa | 0.7621 (n=140) | — |
| evidence | precision | 1.0000 (n=140) | — |
| evidence | recall | 0.7419 (n=140) | — |
| evidence | f1 | 0.8519 (n=140) [0.7529, 0.9278] | 2000/2000 |
| fit | accuracy | 0.9000 (n=20) [0.7500, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.9221 (n=20) | — |
| fit | kappa | 0.8246 (n=20) | — |
| fit | coverage_spearman | 0.6162 (n=20) | — |
| fit | known_only_score_spearman | 0.8207 (n=20) | — |

exact confusion (n=140; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 3 | 4 | 0 | 0 | 0 | 1 |
| adequate | 2 | 17 | 8 | 1 | 1 | 0 |
| partial | 0 | 0 | 12 | 5 | 7 | 1 |
| absent | 0 | 0 | 0 | 20 | 0 | 0 |
| unknown | 0 | 0 | 0 | 13 | 45 | 0 |
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
| exact | accuracy | 0.5857 (n=70) [0.4857, 0.6857] | 2000/2000 |
| exact | macro_f1 | 0.4867 (n=70) | — |
| exact | kappa | 0.4811 (n=70) [0.3510, 0.5896] | 2000/2000 |
| exact | linear_weighted_kappa | 0.6953 (n=41) | — |
| collapsed | accuracy | 0.7143 (n=70) | — |
| collapsed | macro_f1 | 0.6741 (n=70) | — |
| collapsed | kappa | 0.5719 (n=70) [0.3952, 0.7104] | 2000/2000 |
| evidence | accuracy | 0.9000 (n=70) | — |
| evidence | macro_f1 | 0.8990 (n=70) | — |
| evidence | kappa | 0.8000 (n=70) | — |
| evidence | precision | 1.0000 (n=70) | — |
| evidence | recall | 0.8000 (n=70) | — |
| evidence | f1 | 0.8889 (n=70) [0.7111, 0.9825] | 2000/2000 |
| fit | accuracy | 0.9000 (n=10) [0.7000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.9153 (n=10) | — |
| fit | kappa | 0.8438 (n=10) | — |
| fit | coverage_spearman | 0.6667 (n=10) | — |
| fit | known_only_score_spearman | 0.9237 (n=10) | — |

exact confusion (n=70; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 3 | 3 | 0 | 0 | 0 | 1 |
| adequate | 1 | 9 | 5 | 1 | 0 | 0 |
| partial | 0 | 0 | 7 | 3 | 2 | 0 |
| absent | 0 | 0 | 0 | 9 | 0 | 0 |
| unknown | 0 | 0 | 0 | 13 | 13 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=10; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 4 | 0 | 0 |
| partial | 1 | 3 | 0 |
| good | 0 | 0 | 2 |

### jd/jd-py-real (10 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.8000 (n=70) [0.6857, 0.9000] | 2000/2000 |
| exact | macro_f1 | 0.5057 (n=70) | — |
| exact | kappa | 0.7047 (n=70) [0.5568, 0.8343] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7765 (n=31) | — |
| collapsed | accuracy | 0.8714 (n=70) | — |
| collapsed | macro_f1 | 0.8727 (n=70) | — |
| collapsed | kappa | 0.7916 (n=70) [0.6602, 0.9036] | 2000/2000 |
| evidence | accuracy | 0.8714 (n=70) | — |
| evidence | macro_f1 | 0.8526 (n=70) | — |
| evidence | kappa | 0.7107 (n=70) | — |
| evidence | precision | 1.0000 (n=70) | — |
| evidence | recall | 0.6667 (n=70) | — |
| evidence | f1 | 0.8000 (n=70) [0.6923, 0.8800] | 2000/2000 |
| fit | accuracy | 0.9000 (n=10) [0.7000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.8901 (n=10) | — |
| fit | kappa | 0.7826 (n=10) | — |
| fit | coverage_spearman | 0.7724 (n=10) | — |
| fit | known_only_score_spearman | 0.8660 (n=10) | — |

exact confusion (n=70; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 0 | 1 | 0 | 0 | 0 | 0 |
| adequate | 1 | 8 | 3 | 0 | 1 | 0 |
| partial | 0 | 0 | 5 | 2 | 5 | 1 |
| absent | 0 | 0 | 0 | 11 | 0 | 0 |
| unknown | 0 | 0 | 0 | 0 | 32 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=10; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 6 | 0 | 0 |
| partial | 1 | 3 | 0 |
| good | 0 | 0 | 0 |

### priority/must_have (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.8125 (n=80) [0.7250, 0.8875] | 2000/2000 |
| exact | macro_f1 | 0.6410 (n=80) | — |
| exact | kappa | 0.7238 (n=80) [0.5990, 0.8381] | 2000/2000 |
| exact | linear_weighted_kappa | 0.8743 (n=34) | — |
| collapsed | accuracy | 0.8375 (n=80) | — |
| collapsed | macro_f1 | 0.8129 (n=80) | — |
| collapsed | kappa | 0.7374 (n=80) [0.6050, 0.8574] | 2000/2000 |
| evidence | accuracy | 0.9125 (n=80) | — |
| evidence | macro_f1 | 0.8946 (n=80) | — |
| evidence | kappa | 0.7910 (n=80) | — |
| evidence | precision | 1.0000 (n=80) | — |
| evidence | recall | 0.7407 (n=80) | — |
| evidence | f1 | 0.8511 (n=80) [0.6667, 0.9538] | 2000/2000 |
| fit | accuracy | 0.9000 (n=20) [0.7500, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.9221 (n=20) | — |
| fit | kappa | 0.8246 (n=20) | — |
| fit | coverage_spearman | 0.6162 (n=20) | — |
| fit | known_only_score_spearman | 0.8207 (n=20) | — |

exact confusion (n=80; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 3 | 1 | 0 | 0 | 0 | 0 |
| adequate | 1 | 10 | 0 | 0 | 0 | 0 |
| partial | 0 | 0 | 5 | 3 | 3 | 1 |
| absent | 0 | 0 | 0 | 11 | 0 | 0 |
| unknown | 0 | 0 | 0 | 6 | 36 | 0 |
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
| exact | accuracy | 0.5333 (n=60) [0.4167, 0.6500] | 2000/2000 |
| exact | macro_f1 | 0.3738 (n=60) | — |
| exact | kappa | 0.4055 (n=60) [0.2683, 0.5398] | 2000/2000 |
| exact | linear_weighted_kappa | 0.5853 (n=38) | — |
| collapsed | accuracy | 0.7333 (n=60) | — |
| collapsed | macro_f1 | 0.6920 (n=60) | — |
| collapsed | kappa | 0.5788 (n=60) [0.4011, 0.7326] | 2000/2000 |
| evidence | accuracy | 0.8500 (n=60) | — |
| evidence | macro_f1 | 0.8500 (n=60) | — |
| evidence | kappa | 0.7065 (n=60) | — |
| evidence | precision | 1.0000 (n=60) | — |
| evidence | recall | 0.7429 (n=60) | — |
| evidence | f1 | 0.8525 (n=60) [0.7333, 0.9429] | 2000/2000 |
| fit | accuracy | 0.9000 (n=20) [0.7500, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.9221 (n=20) | — |
| fit | kappa | 0.8246 (n=20) | — |
| fit | coverage_spearman | 0.6162 (n=20) | — |
| fit | known_only_score_spearman | 0.8207 (n=20) | — |

exact confusion (n=60; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 0 | 3 | 0 | 0 | 0 | 1 |
| adequate | 1 | 7 | 8 | 1 | 1 | 0 |
| partial | 0 | 0 | 7 | 2 | 4 | 0 |
| absent | 0 | 0 | 0 | 9 | 0 | 0 |
| unknown | 0 | 0 | 0 | 7 | 9 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 10 | 0 | 0 |
| partial | 2 | 6 | 0 |
| good | 0 | 0 | 2 |

### Error patterns

Of 20 labelled absent criteria, 0 became unknown. Adequate → partial accounts for 8 errors. The absent/unknown distinction reflects a material v1.1 convention difference; evidence detection ignores that distinction, so its F1 can be high despite exact-level errors.

Known-only score correlation has n=20; 0 pairs have zero known weight and no score. Coverage correlation retains all pairs. Fit errors below identify which classes drive the headline accuracy; the full 3×3 matrix should be read alongside it.

| Label → system | Count |
| --- | --- |
| unknown → absent | 13 |
| adequate → partial | 8 |
| partial → unknown | 7 |
| partial → absent | 5 |
| strong → adequate | 4 |
| adequate → strong | 2 |
| adequate → unknown | 1 |
| partial → needs_review | 1 |
| strong → needs_review | 1 |
| adequate → absent | 1 |

| JD / criterion | Errors | n |
| --- | --- | --- |
| jd-hr-real/hr_programs | 9 | 10 |
| jd-hr-real/interpersonal_communication | 7 | 10 |
| jd-hr-real/talent_acquisition | 6 | 10 |
| jd-py-real/communication_collaboration | 6 | 10 |
| jd-hr-real/hr_experience | 3 | 10 |
| jd-hr-real/education_hr_business | 3 | 10 |
| jd-py-real/postgresql_database | 3 | 10 |
| jd-py-real/education_cs | 2 | 10 |
| jd-hr-real/hris_office_tools | 1 | 10 |
| jd-py-real/python_frameworks | 1 | 10 |
| jd-py-real/backend_experience | 1 | 10 |
| jd-py-real/software_architecture | 1 | 10 |
| jd-hr-real/employee_relations_compliance | 0 | 10 |
| jd-py-real/cloud_docker_linux | 0 | 10 |

| Pair | Label fit | System fit |
| --- | --- | --- |
| database-01__jd-hr-real | partial | poor |
| database-01__jd-py-real | partial | poor |

Quote-validation level changes: 2 criterion assessments.


## 20261122T083536Z-v2-lexical-gemini-3-8-flash-medium-c1

### all (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.6571 (n=140) [0.5643, 0.7429] | 2000/2000 |
| exact | macro_f1 | 0.5123 (n=140) | — |
| exact | kappa | 0.5453 (n=140) [0.4408, 0.6422] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7331 (n=66) | — |
| collapsed | accuracy | 0.7429 (n=140) | — |
| collapsed | macro_f1 | 0.7322 (n=140) | — |
| collapsed | kappa | 0.6075 (n=140) [0.4762, 0.7146] | 2000/2000 |
| evidence | accuracy | 0.8429 (n=140) | — |
| evidence | macro_f1 | 0.8304 (n=140) | — |
| evidence | kappa | 0.6695 (n=140) | — |
| evidence | precision | 1.0000 (n=140) | — |
| evidence | recall | 0.6452 (n=140) | — |
| evidence | f1 | 0.7843 (n=140) [0.6593, 0.8738] | 2000/2000 |
| fit | accuracy | 0.9000 (n=20) [0.7500, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.8313 (n=20) | — |
| fit | kappa | 0.8214 (n=20) | — |
| fit | coverage_spearman | 0.5303 (n=20) | — |
| fit | known_only_score_spearman | 0.8619 (n=20) | — |

exact confusion (n=140; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 3 | 3 | 0 | 0 | 0 | 2 |
| adequate | 1 | 14 | 7 | 1 | 1 | 5 |
| partial | 0 | 1 | 11 | 5 | 7 | 1 |
| absent | 0 | 0 | 0 | 20 | 0 | 0 |
| unknown | 0 | 0 | 0 | 14 | 44 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 10 | 0 | 0 |
| partial | 1 | 7 | 0 |
| good | 0 | 1 | 1 |

### jd/jd-hr-real (10 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.5429 (n=70) [0.4286, 0.6429] | 2000/2000 |
| exact | macro_f1 | 0.4609 (n=70) | — |
| exact | kappa | 0.4351 (n=70) [0.2977, 0.5484] | 2000/2000 |
| exact | linear_weighted_kappa | 0.6792 (n=39) | — |
| collapsed | accuracy | 0.6714 (n=70) | — |
| collapsed | macro_f1 | 0.6369 (n=70) | — |
| collapsed | kappa | 0.5129 (n=70) [0.3396, 0.6472] | 2000/2000 |
| evidence | accuracy | 0.8714 (n=70) | — |
| evidence | macro_f1 | 0.8693 (n=70) | — |
| evidence | kappa | 0.7429 (n=70) | — |
| evidence | precision | 1.0000 (n=70) | — |
| evidence | recall | 0.7429 (n=70) | — |
| evidence | f1 | 0.8525 (n=70) [0.6667, 0.9538] | 2000/2000 |
| fit | accuracy | 0.9000 (n=10) [0.7000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.8519 (n=10) | — |
| fit | kappa | 0.8387 (n=10) | — |
| fit | coverage_spearman | 0.6024 (n=10) | — |
| fit | known_only_score_spearman | 0.9370 (n=10) | — |

exact confusion (n=70; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 3 | 2 | 0 | 0 | 0 | 2 |
| adequate | 1 | 7 | 6 | 1 | 0 | 1 |
| partial | 0 | 0 | 7 | 3 | 2 | 0 |
| absent | 0 | 0 | 0 | 9 | 0 | 0 |
| unknown | 0 | 0 | 0 | 14 | 12 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=10; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 4 | 0 | 0 |
| partial | 0 | 4 | 0 |
| good | 0 | 1 | 1 |

### jd/jd-py-real (10 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.7714 (n=70) [0.6714, 0.8714] | 2000/2000 |
| exact | macro_f1 | 0.4853 (n=70) | — |
| exact | kappa | 0.6666 (n=70) [0.5510, 0.7780] | 2000/2000 |
| exact | linear_weighted_kappa | 0.8107 (n=27) | — |
| collapsed | accuracy | 0.8143 (n=70) | — |
| collapsed | macro_f1 | 0.8176 (n=70) | — |
| collapsed | kappa | 0.6970 (n=70) [0.5484, 0.8293] | 2000/2000 |
| evidence | accuracy | 0.8143 (n=70) | — |
| evidence | macro_f1 | 0.7758 (n=70) | — |
| evidence | kappa | 0.5695 (n=70) | — |
| evidence | precision | 1.0000 (n=70) | — |
| evidence | recall | 0.5185 (n=70) | — |
| evidence | f1 | 0.6829 (n=70) [0.4706, 0.8085] | 2000/2000 |
| fit | accuracy | 0.9000 (n=10) [0.7000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.8901 (n=10) | — |
| fit | kappa | 0.7826 (n=10) | — |
| fit | coverage_spearman | 0.6273 (n=10) | — |
| fit | known_only_score_spearman | 0.8856 (n=10) | — |

exact confusion (n=70; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 0 | 1 | 0 | 0 | 0 | 0 |
| adequate | 0 | 7 | 1 | 0 | 1 | 4 |
| partial | 0 | 1 | 4 | 2 | 5 | 1 |
| absent | 0 | 0 | 0 | 11 | 0 | 0 |
| unknown | 0 | 0 | 0 | 0 | 32 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=10; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 6 | 0 | 0 |
| partial | 1 | 3 | 0 |
| good | 0 | 0 | 0 |

### priority/must_have (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.7625 (n=80) [0.6622, 0.8500] | 2000/2000 |
| exact | macro_f1 | 0.5965 (n=80) | — |
| exact | kappa | 0.6567 (n=80) [0.5320, 0.7706] | 2000/2000 |
| exact | linear_weighted_kappa | 0.8180 (n=33) | — |
| collapsed | accuracy | 0.8125 (n=80) | — |
| collapsed | macro_f1 | 0.7891 (n=80) | — |
| collapsed | kappa | 0.6982 (n=80) [0.5550, 0.8218] | 2000/2000 |
| evidence | accuracy | 0.9000 (n=80) | — |
| evidence | macro_f1 | 0.8780 (n=80) | — |
| evidence | kappa | 0.7589 (n=80) | — |
| evidence | precision | 1.0000 (n=80) | — |
| evidence | recall | 0.7037 (n=80) | — |
| evidence | f1 | 0.8261 (n=80) [0.6667, 0.9375] | 2000/2000 |
| fit | accuracy | 0.9000 (n=20) [0.7500, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.8313 (n=20) | — |
| fit | kappa | 0.8214 (n=20) | — |
| fit | coverage_spearman | 0.5303 (n=20) | — |
| fit | known_only_score_spearman | 0.8619 (n=20) | — |

exact confusion (n=80; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 3 | 1 | 0 | 0 | 0 | 0 |
| adequate | 1 | 7 | 1 | 0 | 0 | 2 |
| partial | 0 | 1 | 5 | 3 | 2 | 1 |
| absent | 0 | 0 | 0 | 11 | 0 | 0 |
| unknown | 0 | 0 | 0 | 7 | 35 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 10 | 0 | 0 |
| partial | 1 | 7 | 0 |
| good | 0 | 1 | 1 |

### priority/nice_to_have (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.5167 (n=60) [0.3833, 0.6333] | 2000/2000 |
| exact | macro_f1 | 0.3703 (n=60) | — |
| exact | kappa | 0.3939 (n=60) [0.2475, 0.5245] | 2000/2000 |
| exact | linear_weighted_kappa | 0.6333 (n=33) | — |
| collapsed | accuracy | 0.6500 (n=60) | — |
| collapsed | macro_f1 | 0.6310 (n=60) | — |
| collapsed | kappa | 0.4693 (n=60) [0.3059, 0.6043] | 2000/2000 |
| evidence | accuracy | 0.7667 (n=60) | — |
| evidence | macro_f1 | 0.7656 (n=60) | — |
| evidence | kappa | 0.5556 (n=60) | — |
| evidence | precision | 1.0000 (n=60) | — |
| evidence | recall | 0.6000 (n=60) | — |
| evidence | f1 | 0.7500 (n=60) [0.6046, 0.8525] | 2000/2000 |
| fit | accuracy | 0.9000 (n=20) [0.7500, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.8313 (n=20) | — |
| fit | kappa | 0.8214 (n=20) | — |
| fit | coverage_spearman | 0.5303 (n=20) | — |
| fit | known_only_score_spearman | 0.8619 (n=20) | — |

exact confusion (n=60; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 0 | 2 | 0 | 0 | 0 | 2 |
| adequate | 0 | 7 | 6 | 1 | 1 | 3 |
| partial | 0 | 0 | 6 | 2 | 5 | 0 |
| absent | 0 | 0 | 0 | 9 | 0 | 0 |
| unknown | 0 | 0 | 0 | 7 | 9 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 10 | 0 | 0 |
| partial | 1 | 7 | 0 |
| good | 0 | 1 | 1 |

### Error patterns

Of 20 labelled absent criteria, 0 became unknown. Adequate → partial accounts for 7 errors. The absent/unknown distinction reflects a material v1.1 convention difference; evidence detection ignores that distinction, so its F1 can be high despite exact-level errors.

Known-only score correlation has n=20; 0 pairs have zero known weight and no score. Coverage correlation retains all pairs. Fit errors below identify which classes drive the headline accuracy; the full 3×3 matrix should be read alongside it.

| Label → system | Count |
| --- | --- |
| unknown → absent | 14 |
| adequate → partial | 7 |
| partial → unknown | 7 |
| partial → absent | 5 |
| adequate → needs_review | 5 |
| strong → adequate | 3 |
| strong → needs_review | 2 |
| adequate → strong | 1 |
| adequate → unknown | 1 |
| partial → needs_review | 1 |
| adequate → absent | 1 |
| partial → adequate | 1 |

| JD / criterion | Errors | n |
| --- | --- | --- |
| jd-hr-real/hr_programs | 9 | 10 |
| jd-hr-real/interpersonal_communication | 8 | 10 |
| jd-py-real/communication_collaboration | 8 | 10 |
| jd-hr-real/talent_acquisition | 7 | 10 |
| jd-hr-real/hr_experience | 3 | 10 |
| jd-hr-real/education_hr_business | 3 | 10 |
| jd-py-real/postgresql_database | 3 | 10 |
| jd-hr-real/employee_relations_compliance | 2 | 10 |
| jd-py-real/backend_experience | 2 | 10 |
| jd-py-real/python_frameworks | 1 | 10 |
| jd-py-real/cloud_docker_linux | 1 | 10 |
| jd-py-real/education_cs | 1 | 10 |
| jd-hr-real/hris_office_tools | 0 | 10 |
| jd-py-real/software_architecture | 0 | 10 |

| Pair | Label fit | System fit |
| --- | --- | --- |
| database-01__jd-py-real | partial | poor |
| hr-02__jd-hr-real | good | partial |

Quote-validation level changes: 8 criterion assessments.


## 20261122T083536Z-v2-lexical-gemini-3-8-flash-low-c1

### all (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.7286 (n=140) [0.6286, 0.8143] | 2000/2000 |
| exact | macro_f1 | 0.5724 (n=140) | — |
| exact | kappa | 0.6356 (n=140) [0.5113, 0.7448] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7708 (n=71) | — |
| collapsed | accuracy | 0.8143 (n=140) | — |
| collapsed | macro_f1 | 0.8018 (n=140) | — |
| collapsed | kappa | 0.7107 (n=140) [0.5816, 0.8280] | 2000/2000 |
| evidence | accuracy | 0.8786 (n=140) | — |
| evidence | macro_f1 | 0.8723 (n=140) | — |
| evidence | kappa | 0.7477 (n=140) | — |
| evidence | precision | 0.9787 (n=140) | — |
| evidence | recall | 0.7419 (n=140) | — |
| evidence | f1 | 0.8440 (n=140) [0.7473, 0.9247] | 2000/2000 |
| fit | accuracy | 0.9500 (n=20) [0.8500, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.9619 (n=20) | — |
| fit | kappa | 0.9130 (n=20) | — |
| fit | coverage_spearman | 0.6346 (n=20) | — |
| fit | known_only_score_spearman | 0.8396 (n=20) | — |

exact confusion (n=140; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 6 | 1 | 1 | 0 | 0 | 0 |
| adequate | 5 | 18 | 3 | 1 | 0 | 2 |
| partial | 0 | 2 | 10 | 4 | 8 | 1 |
| absent | 0 | 0 | 0 | 20 | 0 | 0 |
| unknown | 0 | 0 | 1 | 9 | 48 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 10 | 0 | 0 |
| partial | 1 | 7 | 0 |
| good | 0 | 0 | 2 |

### jd/jd-hr-real (10 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.6714 (n=70) [0.5286, 0.8000] | 2000/2000 |
| exact | macro_f1 | 0.6654 (n=70) | — |
| exact | kappa | 0.5821 (n=70) [0.3877, 0.7341] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7535 (n=41) | — |
| collapsed | accuracy | 0.7714 (n=70) | — |
| collapsed | macro_f1 | 0.7345 (n=70) | — |
| collapsed | kappa | 0.6464 (n=70) [0.4578, 0.7963] | 2000/2000 |
| evidence | accuracy | 0.9000 (n=70) | — |
| evidence | macro_f1 | 0.8995 (n=70) | — |
| evidence | kappa | 0.8000 (n=70) | — |
| evidence | precision | 0.9667 (n=70) | — |
| evidence | recall | 0.8286 (n=70) | — |
| evidence | f1 | 0.8923 (n=70) [0.7586, 0.9762] | 2000/2000 |
| fit | accuracy | 1.0000 (n=10) [1.0000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 1.0000 (n=10) | — |
| fit | kappa | 1.0000 (n=10) | — |
| fit | coverage_spearman | 0.9195 (n=10) | — |
| fit | known_only_score_spearman | 0.8980 (n=10) | — |

exact confusion (n=70; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 5 | 1 | 1 | 0 | 0 | 0 |
| adequate | 3 | 10 | 2 | 1 | 0 | 0 |
| partial | 0 | 0 | 7 | 2 | 3 | 0 |
| absent | 0 | 0 | 0 | 9 | 0 | 0 |
| unknown | 0 | 0 | 1 | 9 | 16 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=10; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 4 | 0 | 0 |
| partial | 0 | 4 | 0 |
| good | 0 | 0 | 2 |

### jd/jd-py-real (10 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.7857 (n=70) [0.6571, 0.9000] | 2000/2000 |
| exact | macro_f1 | 0.5655 (n=70) | — |
| exact | kappa | 0.6901 (n=70) [0.5441, 0.8384] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7870 (n=30) | — |
| collapsed | accuracy | 0.8571 (n=70) | — |
| collapsed | macro_f1 | 0.8594 (n=70) | — |
| collapsed | kappa | 0.7681 (n=70) [0.6178, 0.9014] | 2000/2000 |
| evidence | accuracy | 0.8571 (n=70) | — |
| evidence | macro_f1 | 0.8343 (n=70) | — |
| evidence | kappa | 0.6762 (n=70) | — |
| evidence | precision | 1.0000 (n=70) | — |
| evidence | recall | 0.6296 (n=70) | — |
| evidence | f1 | 0.7727 (n=70) [0.6667, 0.8718] | 2000/2000 |
| fit | accuracy | 0.9000 (n=10) [0.7000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.8901 (n=10) | — |
| fit | kappa | 0.7826 (n=10) | — |
| fit | coverage_spearman | 0.7749 (n=10) | — |
| fit | known_only_score_spearman | 0.8580 (n=10) | — |

exact confusion (n=70; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 1 | 0 | 0 | 0 | 0 | 0 |
| adequate | 2 | 8 | 1 | 0 | 0 | 2 |
| partial | 0 | 2 | 3 | 2 | 5 | 1 |
| absent | 0 | 0 | 0 | 11 | 0 | 0 |
| unknown | 0 | 0 | 0 | 0 | 32 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=10; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 6 | 0 | 0 |
| partial | 1 | 3 | 0 |
| good | 0 | 0 | 0 |

### priority/must_have (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.7500 (n=80) [0.6625, 0.8375] | 2000/2000 |
| exact | macro_f1 | 0.5747 (n=80) | — |
| exact | kappa | 0.6425 (n=80) [0.5191, 0.7551] | 2000/2000 |
| exact | linear_weighted_kappa | 0.8127 (n=34) | — |
| collapsed | accuracy | 0.8125 (n=80) | — |
| collapsed | macro_f1 | 0.7903 (n=80) | — |
| collapsed | kappa | 0.7004 (n=80) [0.5524, 0.8379] | 2000/2000 |
| evidence | accuracy | 0.9000 (n=80) | — |
| evidence | macro_f1 | 0.8810 (n=80) | — |
| evidence | kappa | 0.7635 (n=80) | — |
| evidence | precision | 0.9524 (n=80) | — |
| evidence | recall | 0.7407 (n=80) | — |
| evidence | f1 | 0.8333 (n=80) [0.6486, 0.9630] | 2000/2000 |
| fit | accuracy | 0.9500 (n=20) [0.8500, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.9619 (n=20) | — |
| fit | kappa | 0.9130 (n=20) | — |
| fit | coverage_spearman | 0.6346 (n=20) | — |
| fit | known_only_score_spearman | 0.8396 (n=20) | — |

exact confusion (n=80; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 4 | 0 | 0 | 0 | 0 | 0 |
| adequate | 4 | 6 | 0 | 0 | 0 | 1 |
| partial | 0 | 1 | 5 | 3 | 2 | 1 |
| absent | 0 | 0 | 0 | 11 | 0 | 0 |
| unknown | 0 | 0 | 1 | 7 | 34 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 10 | 0 | 0 |
| partial | 1 | 7 | 0 |
| good | 0 | 0 | 2 |

### priority/nice_to_have (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.7000 (n=60) [0.5667, 0.8167] | 2000/2000 |
| exact | macro_f1 | 0.5620 (n=60) | — |
| exact | kappa | 0.6118 (n=60) [0.4367, 0.7556] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7229 (n=37) | — |
| collapsed | accuracy | 0.8167 (n=60) | — |
| collapsed | macro_f1 | 0.8091 (n=60) | — |
| collapsed | kappa | 0.7050 (n=60) [0.5294, 0.8538] | 2000/2000 |
| evidence | accuracy | 0.8500 (n=60) | — |
| evidence | macro_f1 | 0.8500 (n=60) | — |
| evidence | kappa | 0.7065 (n=60) | — |
| evidence | precision | 1.0000 (n=60) | — |
| evidence | recall | 0.7429 (n=60) | — |
| evidence | f1 | 0.8525 (n=60) [0.7541, 0.9310] | 2000/2000 |
| fit | accuracy | 0.9500 (n=20) [0.8500, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.9619 (n=20) | — |
| fit | kappa | 0.9130 (n=20) | — |
| fit | coverage_spearman | 0.6346 (n=20) | — |
| fit | known_only_score_spearman | 0.8396 (n=20) | — |

exact confusion (n=60; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 2 | 1 | 1 | 0 | 0 | 0 |
| adequate | 1 | 12 | 3 | 1 | 0 | 1 |
| partial | 0 | 1 | 5 | 1 | 6 | 0 |
| absent | 0 | 0 | 0 | 9 | 0 | 0 |
| unknown | 0 | 0 | 0 | 2 | 14 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 10 | 0 | 0 |
| partial | 1 | 7 | 0 |
| good | 0 | 0 | 2 |

### Error patterns

Of 20 labelled absent criteria, 0 became unknown. Adequate → partial accounts for 3 errors. The absent/unknown distinction reflects a material v1.1 convention difference; evidence detection ignores that distinction, so its F1 can be high despite exact-level errors.

Known-only score correlation has n=20; 0 pairs have zero known weight and no score. Coverage correlation retains all pairs. Fit errors below identify which classes drive the headline accuracy; the full 3×3 matrix should be read alongside it.

| Label → system | Count |
| --- | --- |
| unknown → absent | 9 |
| partial → unknown | 8 |
| adequate → strong | 5 |
| partial → absent | 4 |
| adequate → partial | 3 |
| partial → adequate | 2 |
| adequate → needs_review | 2 |
| unknown → partial | 1 |
| strong → partial | 1 |
| partial → needs_review | 1 |
| strong → adequate | 1 |
| adequate → absent | 1 |

| JD / criterion | Errors | n |
| --- | --- | --- |
| jd-hr-real/talent_acquisition | 7 | 10 |
| jd-py-real/communication_collaboration | 5 | 10 |
| jd-hr-real/education_hr_business | 4 | 10 |
| jd-hr-real/hr_experience | 3 | 10 |
| jd-hr-real/employee_relations_compliance | 3 | 10 |
| jd-hr-real/interpersonal_communication | 3 | 10 |
| jd-hr-real/hr_programs | 3 | 10 |
| jd-py-real/postgresql_database | 3 | 10 |
| jd-py-real/backend_experience | 3 | 10 |
| jd-py-real/education_cs | 2 | 10 |
| jd-py-real/cloud_docker_linux | 1 | 10 |
| jd-py-real/software_architecture | 1 | 10 |
| jd-hr-real/hris_office_tools | 0 | 10 |
| jd-py-real/python_frameworks | 0 | 10 |

| Pair | Label fit | System fit |
| --- | --- | --- |
| database-01__jd-py-real | partial | poor |

Quote-validation level changes: 3 criterion assessments.


## 20261122T083536Z-v2-lexical-gemini-4-argon-low-c1

### all (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.7214 (n=140) [0.6214, 0.8143] | 2000/2000 |
| exact | macro_f1 | 0.7073 (n=140) | — |
| exact | kappa | 0.6284 (n=140) [0.4980, 0.7395] | 2000/2000 |
| exact | linear_weighted_kappa | 0.8001 (n=75) | — |
| collapsed | accuracy | 0.8214 (n=140) | — |
| collapsed | macro_f1 | 0.7988 (n=140) | — |
| collapsed | kappa | 0.7247 (n=140) [0.5833, 0.8392] | 2000/2000 |
| evidence | accuracy | 0.9357 (n=140) | — |
| evidence | macro_f1 | 0.9336 (n=140) | — |
| evidence | kappa | 0.8678 (n=140) | — |
| evidence | precision | 1.0000 (n=140) | — |
| evidence | recall | 0.8548 (n=140) | — |
| evidence | f1 | 0.9217 (n=140) [0.8602, 0.9643] | 2000/2000 |
| fit | accuracy | 0.8500 (n=20) [0.7000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.7919 (n=20) | — |
| fit | kappa | 0.7297 (n=20) | — |
| fit | coverage_spearman | 0.6590 (n=20) | — |
| fit | known_only_score_spearman | 0.8355 (n=20) | — |

exact confusion (n=140; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 5 | 3 | 0 | 0 | 0 | 0 |
| adequate | 1 | 17 | 10 | 0 | 1 | 0 |
| partial | 0 | 0 | 17 | 2 | 6 | 0 |
| absent | 0 | 0 | 0 | 20 | 0 | 0 |
| unknown | 0 | 0 | 0 | 16 | 42 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 10 | 0 | 0 |
| partial | 2 | 6 | 0 |
| good | 0 | 1 | 1 |

### jd/jd-hr-real (10 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.5857 (n=70) [0.4571, 0.7000] | 2000/2000 |
| exact | macro_f1 | 0.6157 (n=70) | — |
| exact | kappa | 0.4850 (n=70) [0.3276, 0.6144] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7849 (n=41) | — |
| collapsed | accuracy | 0.7143 (n=70) | — |
| collapsed | macro_f1 | 0.6555 (n=70) | — |
| collapsed | kappa | 0.5683 (n=70) [0.3901, 0.7242] | 2000/2000 |
| evidence | accuracy | 0.9429 (n=70) | — |
| evidence | macro_f1 | 0.9427 (n=70) | — |
| evidence | kappa | 0.8857 (n=70) | — |
| evidence | precision | 1.0000 (n=70) | — |
| evidence | recall | 0.8857 (n=70) | — |
| evidence | f1 | 0.9394 (n=70) [0.8696, 0.9846] | 2000/2000 |
| fit | accuracy | 0.8000 (n=10) [0.5000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.7685 (n=10) | — |
| fit | kappa | 0.6774 (n=10) | — |
| fit | coverage_spearman | 0.7050 (n=10) | — |
| fit | known_only_score_spearman | 0.9063 (n=10) | — |

exact confusion (n=70; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 5 | 2 | 0 | 0 | 0 | 0 |
| adequate | 1 | 9 | 6 | 0 | 0 | 0 |
| partial | 0 | 0 | 8 | 1 | 3 | 0 |
| absent | 0 | 0 | 0 | 9 | 0 | 0 |
| unknown | 0 | 0 | 0 | 16 | 10 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=10; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 4 | 0 | 0 |
| partial | 1 | 3 | 0 |
| good | 0 | 1 | 1 |

### jd/jd-py-real (10 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.8571 (n=70) [0.7571, 0.9429] | 2000/2000 |
| exact | macro_f1 | 0.6635 (n=70) | — |
| exact | kappa | 0.7898 (n=70) [0.6476, 0.9134] | 2000/2000 |
| exact | linear_weighted_kappa | 0.8086 (n=34) | — |
| collapsed | accuracy | 0.9286 (n=70) | — |
| collapsed | macro_f1 | 0.9319 (n=70) | — |
| collapsed | kappa | 0.8842 (n=70) [0.7698, 0.9762] | 2000/2000 |
| evidence | accuracy | 0.9286 (n=70) | — |
| evidence | macro_f1 | 0.9215 (n=70) | — |
| evidence | kappa | 0.8439 (n=70) | — |
| evidence | precision | 1.0000 (n=70) | — |
| evidence | recall | 0.8148 (n=70) | — |
| evidence | f1 | 0.8980 (n=70) [0.7500, 0.9744] | 2000/2000 |
| fit | accuracy | 0.9000 (n=10) [0.7000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.8901 (n=10) | — |
| fit | kappa | 0.7826 (n=10) | — |
| fit | coverage_spearman | 0.7724 (n=10) | — |
| fit | known_only_score_spearman | 0.8580 (n=10) | — |

exact confusion (n=70; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 0 | 1 | 0 | 0 | 0 | 0 |
| adequate | 0 | 8 | 4 | 0 | 1 | 0 |
| partial | 0 | 0 | 9 | 1 | 3 | 0 |
| absent | 0 | 0 | 0 | 11 | 0 | 0 |
| unknown | 0 | 0 | 0 | 0 | 32 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=10; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 6 | 0 | 0 |
| partial | 1 | 3 | 0 |
| good | 0 | 0 | 0 |

### priority/must_have (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.7875 (n=80) [0.6875, 0.8750] | 2000/2000 |
| exact | macro_f1 | 0.7563 (n=80) | — |
| exact | kappa | 0.6945 (n=80) [0.5479, 0.8177] | 2000/2000 |
| exact | linear_weighted_kappa | 0.8492 (n=36) | — |
| collapsed | accuracy | 0.8500 (n=80) | — |
| collapsed | macro_f1 | 0.8286 (n=80) | — |
| collapsed | kappa | 0.7630 (n=80) [0.5990, 0.8986] | 2000/2000 |
| evidence | accuracy | 0.9625 (n=80) | — |
| evidence | macro_f1 | 0.9568 (n=80) | — |
| evidence | kappa | 0.9138 (n=80) | — |
| evidence | precision | 1.0000 (n=80) | — |
| evidence | recall | 0.8889 (n=80) | — |
| evidence | f1 | 0.9412 (n=80) [0.8000, 1.0000] | 2000/2000 |
| fit | accuracy | 0.8500 (n=20) [0.7000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.7919 (n=20) | — |
| fit | kappa | 0.7297 (n=20) | — |
| fit | coverage_spearman | 0.6590 (n=20) | — |
| fit | known_only_score_spearman | 0.8355 (n=20) | — |

exact confusion (n=80; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 3 | 1 | 0 | 0 | 0 | 0 |
| adequate | 1 | 7 | 3 | 0 | 0 | 0 |
| partial | 0 | 0 | 9 | 1 | 2 | 0 |
| absent | 0 | 0 | 0 | 11 | 0 | 0 |
| unknown | 0 | 0 | 0 | 9 | 33 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 10 | 0 | 0 |
| partial | 2 | 6 | 0 |
| good | 0 | 1 | 1 |

### priority/nice_to_have (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.6333 (n=60) [0.5000, 0.7500] | 2000/2000 |
| exact | macro_f1 | 0.6394 (n=60) | — |
| exact | kappa | 0.5292 (n=60) [0.3741, 0.6714] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7494 (n=39) | — |
| collapsed | accuracy | 0.7833 (n=60) | — |
| collapsed | macro_f1 | 0.7329 (n=60) | — |
| collapsed | kappa | 0.6467 (n=60) [0.4714, 0.7953] | 2000/2000 |
| evidence | accuracy | 0.9000 (n=60) | — |
| evidence | macro_f1 | 0.8996 (n=60) | — |
| evidence | kappa | 0.8011 (n=60) | — |
| evidence | precision | 1.0000 (n=60) | — |
| evidence | recall | 0.8286 (n=60) | — |
| evidence | f1 | 0.9062 (n=60) [0.8261, 0.9688] | 2000/2000 |
| fit | accuracy | 0.8500 (n=20) [0.7000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.7919 (n=20) | — |
| fit | kappa | 0.7297 (n=20) | — |
| fit | coverage_spearman | 0.6590 (n=20) | — |
| fit | known_only_score_spearman | 0.8355 (n=20) | — |

exact confusion (n=60; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 2 | 2 | 0 | 0 | 0 | 0 |
| adequate | 0 | 10 | 7 | 0 | 1 | 0 |
| partial | 0 | 0 | 8 | 1 | 4 | 0 |
| absent | 0 | 0 | 0 | 9 | 0 | 0 |
| unknown | 0 | 0 | 0 | 7 | 9 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 10 | 0 | 0 |
| partial | 2 | 6 | 0 |
| good | 0 | 1 | 1 |

### Error patterns

Of 20 labelled absent criteria, 0 became unknown. Adequate → partial accounts for 10 errors. The absent/unknown distinction reflects a material v1.1 convention difference; evidence detection ignores that distinction, so its F1 can be high despite exact-level errors.

Known-only score correlation has n=20; 0 pairs have zero known weight and no score. Coverage correlation retains all pairs. Fit errors below identify which classes drive the headline accuracy; the full 3×3 matrix should be read alongside it.

| Label → system | Count |
| --- | --- |
| unknown → absent | 16 |
| adequate → partial | 10 |
| partial → unknown | 6 |
| strong → adequate | 3 |
| partial → absent | 2 |
| adequate → strong | 1 |
| adequate → unknown | 1 |

| JD / criterion | Errors | n |
| --- | --- | --- |
| jd-hr-real/interpersonal_communication | 8 | 10 |
| jd-hr-real/talent_acquisition | 7 | 10 |
| jd-hr-real/hr_programs | 7 | 10 |
| jd-py-real/communication_collaboration | 5 | 10 |
| jd-hr-real/employee_relations_compliance | 3 | 10 |
| jd-hr-real/education_hr_business | 2 | 10 |
| jd-py-real/python_frameworks | 2 | 10 |
| jd-hr-real/hr_experience | 1 | 10 |
| jd-hr-real/hris_office_tools | 1 | 10 |
| jd-py-real/postgresql_database | 1 | 10 |
| jd-py-real/cloud_docker_linux | 1 | 10 |
| jd-py-real/backend_experience | 1 | 10 |
| jd-py-real/software_architecture | 0 | 10 |
| jd-py-real/education_cs | 0 | 10 |

| Pair | Label fit | System fit |
| --- | --- | --- |
| database-01__jd-hr-real | partial | poor |
| database-01__jd-py-real | partial | poor |
| hr-02__jd-hr-real | good | partial |

Quote-validation level changes: 0 criterion assessments.


## 20261122T083536Z-v2-lexical-gemini-4-argon-medium-c1

### all (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.7071 (n=140) [0.6071, 0.8000] | 2000/2000 |
| exact | macro_f1 | 0.7031 (n=140) | — |
| exact | kappa | 0.6099 (n=140) [0.4820, 0.7267] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7868 (n=75) | — |
| collapsed | accuracy | 0.8071 (n=140) | — |
| collapsed | macro_f1 | 0.7842 (n=140) | — |
| collapsed | kappa | 0.7045 (n=140) [0.5641, 0.8236] | 2000/2000 |
| evidence | accuracy | 0.9286 (n=140) | — |
| evidence | macro_f1 | 0.9260 (n=140) | — |
| evidence | kappa | 0.8528 (n=140) | — |
| evidence | precision | 1.0000 (n=140) | — |
| evidence | recall | 0.8387 (n=140) | — |
| evidence | f1 | 0.9123 (n=140) [0.8453, 0.9573] | 2000/2000 |
| fit | accuracy | 0.8500 (n=20) [0.7000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.7919 (n=20) | — |
| fit | kappa | 0.7297 (n=20) | — |
| fit | coverage_spearman | 0.6426 (n=20) | — |
| fit | known_only_score_spearman | 0.8282 (n=20) | — |

exact confusion (n=140; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 5 | 3 | 0 | 0 | 0 | 0 |
| adequate | 0 | 18 | 10 | 0 | 1 | 0 |
| partial | 0 | 1 | 15 | 3 | 6 | 0 |
| absent | 0 | 0 | 0 | 20 | 0 | 0 |
| unknown | 0 | 0 | 0 | 17 | 41 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 10 | 0 | 0 |
| partial | 2 | 6 | 0 |
| good | 0 | 1 | 1 |

### jd/jd-hr-real (10 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.5714 (n=70) [0.4571, 0.7000] | 2000/2000 |
| exact | macro_f1 | 0.6136 (n=70) | — |
| exact | kappa | 0.4688 (n=70) [0.3023, 0.6037] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7844 (n=41) | — |
| collapsed | accuracy | 0.6857 (n=70) | — |
| collapsed | macro_f1 | 0.6277 (n=70) | — |
| collapsed | kappa | 0.5313 (n=70) [0.3699, 0.6785] | 2000/2000 |
| evidence | accuracy | 0.9286 (n=70) | — |
| evidence | macro_f1 | 0.9282 (n=70) | — |
| evidence | kappa | 0.8571 (n=70) | — |
| evidence | precision | 1.0000 (n=70) | — |
| evidence | recall | 0.8571 (n=70) | — |
| evidence | f1 | 0.9231 (n=70) [0.8420, 0.9730] | 2000/2000 |
| fit | accuracy | 0.8000 (n=10) [0.5000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.7685 (n=10) | — |
| fit | kappa | 0.6774 (n=10) | — |
| fit | coverage_spearman | 0.6741 (n=10) | — |
| fit | known_only_score_spearman | 0.9370 (n=10) | — |

exact confusion (n=70; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 5 | 2 | 0 | 0 | 0 | 0 |
| adequate | 0 | 10 | 6 | 0 | 0 | 0 |
| partial | 0 | 0 | 7 | 2 | 3 | 0 |
| absent | 0 | 0 | 0 | 9 | 0 | 0 |
| unknown | 0 | 0 | 0 | 17 | 9 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=10; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 4 | 0 | 0 |
| partial | 1 | 3 | 0 |
| good | 0 | 1 | 1 |

### jd/jd-py-real (10 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.8429 (n=70) [0.7429, 0.9286] | 2000/2000 |
| exact | macro_f1 | 0.6467 (n=70) | — |
| exact | kappa | 0.7688 (n=70) [0.6356, 0.8856] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7784 (n=34) | — |
| collapsed | accuracy | 0.9286 (n=70) | — |
| collapsed | macro_f1 | 0.9319 (n=70) | — |
| collapsed | kappa | 0.8842 (n=70) [0.7698, 0.9762] | 2000/2000 |
| evidence | accuracy | 0.9286 (n=70) | — |
| evidence | macro_f1 | 0.9215 (n=70) | — |
| evidence | kappa | 0.8439 (n=70) | — |
| evidence | precision | 1.0000 (n=70) | — |
| evidence | recall | 0.8148 (n=70) | — |
| evidence | f1 | 0.8980 (n=70) [0.7500, 0.9744] | 2000/2000 |
| fit | accuracy | 0.9000 (n=10) [0.7000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.8901 (n=10) | — |
| fit | kappa | 0.7826 (n=10) | — |
| fit | coverage_spearman | 0.7724 (n=10) | — |
| fit | known_only_score_spearman | 0.8607 (n=10) | — |

exact confusion (n=70; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 0 | 1 | 0 | 0 | 0 | 0 |
| adequate | 0 | 8 | 4 | 0 | 1 | 0 |
| partial | 0 | 1 | 8 | 1 | 3 | 0 |
| absent | 0 | 0 | 0 | 11 | 0 | 0 |
| unknown | 0 | 0 | 0 | 0 | 32 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=10; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 6 | 0 | 0 |
| partial | 1 | 3 | 0 |
| good | 0 | 0 | 0 |

### priority/must_have (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.7750 (n=80) [0.6625, 0.8750] | 2000/2000 |
| exact | macro_f1 | 0.7684 (n=80) | — |
| exact | kappa | 0.6783 (n=80) [0.5229, 0.8120] | 2000/2000 |
| exact | linear_weighted_kappa | 0.8477 (n=36) | — |
| collapsed | accuracy | 0.8250 (n=80) | — |
| collapsed | macro_f1 | 0.8031 (n=80) | — |
| collapsed | kappa | 0.7267 (n=80) [0.5593, 0.8678] | 2000/2000 |
| evidence | accuracy | 0.9500 (n=80) | — |
| evidence | macro_f1 | 0.9418 (n=80) | — |
| evidence | kappa | 0.8840 (n=80) | — |
| evidence | precision | 1.0000 (n=80) | — |
| evidence | recall | 0.8519 (n=80) | — |
| evidence | f1 | 0.9200 (n=80) [0.7692, 1.0000] | 2000/2000 |
| fit | accuracy | 0.8500 (n=20) [0.7000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.7919 (n=20) | — |
| fit | kappa | 0.7297 (n=20) | — |
| fit | coverage_spearman | 0.6426 (n=20) | — |
| fit | known_only_score_spearman | 0.8282 (n=20) | — |

exact confusion (n=80; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 3 | 1 | 0 | 0 | 0 | 0 |
| adequate | 0 | 8 | 3 | 0 | 0 | 0 |
| partial | 0 | 0 | 8 | 2 | 2 | 0 |
| absent | 0 | 0 | 0 | 11 | 0 | 0 |
| unknown | 0 | 0 | 0 | 10 | 32 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 10 | 0 | 0 |
| partial | 2 | 6 | 0 |
| good | 0 | 1 | 1 |

### priority/nice_to_have (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.6167 (n=60) [0.5000, 0.7333] | 2000/2000 |
| exact | macro_f1 | 0.6245 (n=60) | — |
| exact | kappa | 0.5070 (n=60) [0.3555, 0.6461] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7238 (n=39) | — |
| collapsed | accuracy | 0.7833 (n=60) | — |
| collapsed | macro_f1 | 0.7329 (n=60) | — |
| collapsed | kappa | 0.6467 (n=60) [0.4714, 0.7953] | 2000/2000 |
| evidence | accuracy | 0.9000 (n=60) | — |
| evidence | macro_f1 | 0.8996 (n=60) | — |
| evidence | kappa | 0.8011 (n=60) | — |
| evidence | precision | 1.0000 (n=60) | — |
| evidence | recall | 0.8286 (n=60) | — |
| evidence | f1 | 0.9062 (n=60) [0.8261, 0.9688] | 2000/2000 |
| fit | accuracy | 0.8500 (n=20) [0.7000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.7919 (n=20) | — |
| fit | kappa | 0.7297 (n=20) | — |
| fit | coverage_spearman | 0.6426 (n=20) | — |
| fit | known_only_score_spearman | 0.8282 (n=20) | — |

exact confusion (n=60; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 2 | 2 | 0 | 0 | 0 | 0 |
| adequate | 0 | 10 | 7 | 0 | 1 | 0 |
| partial | 0 | 1 | 7 | 1 | 4 | 0 |
| absent | 0 | 0 | 0 | 9 | 0 | 0 |
| unknown | 0 | 0 | 0 | 7 | 9 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 10 | 0 | 0 |
| partial | 2 | 6 | 0 |
| good | 0 | 1 | 1 |

### Error patterns

Of 20 labelled absent criteria, 0 became unknown. Adequate → partial accounts for 10 errors. The absent/unknown distinction reflects a material v1.1 convention difference; evidence detection ignores that distinction, so its F1 can be high despite exact-level errors.

Known-only score correlation has n=20; 0 pairs have zero known weight and no score. Coverage correlation retains all pairs. Fit errors below identify which classes drive the headline accuracy; the full 3×3 matrix should be read alongside it.

| Label → system | Count |
| --- | --- |
| unknown → absent | 17 |
| adequate → partial | 10 |
| partial → unknown | 6 |
| partial → absent | 3 |
| strong → adequate | 3 |
| partial → adequate | 1 |
| adequate → unknown | 1 |

| JD / criterion | Errors | n |
| --- | --- | --- |
| jd-hr-real/interpersonal_communication | 8 | 10 |
| jd-hr-real/talent_acquisition | 7 | 10 |
| jd-hr-real/hr_programs | 7 | 10 |
| jd-py-real/communication_collaboration | 5 | 10 |
| jd-hr-real/employee_relations_compliance | 4 | 10 |
| jd-hr-real/education_hr_business | 2 | 10 |
| jd-py-real/python_frameworks | 2 | 10 |
| jd-hr-real/hr_experience | 1 | 10 |
| jd-hr-real/hris_office_tools | 1 | 10 |
| jd-py-real/postgresql_database | 1 | 10 |
| jd-py-real/cloud_docker_linux | 1 | 10 |
| jd-py-real/backend_experience | 1 | 10 |
| jd-py-real/education_cs | 1 | 10 |
| jd-py-real/software_architecture | 0 | 10 |

| Pair | Label fit | System fit |
| --- | --- | --- |
| database-01__jd-hr-real | partial | poor |
| database-01__jd-py-real | partial | poor |
| hr-02__jd-hr-real | good | partial |

Quote-validation level changes: 0 criterion assessments.


## 20261122T083536Z-v2-lexical-deepseek-v4-flash-c1

### all (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.6357 (n=140) [0.5429, 0.7286] | 2000/2000 |
| exact | macro_f1 | 0.5123 (n=140) | — |
| exact | kappa | 0.5287 (n=140) [0.4122, 0.6376] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7236 (n=70) | — |
| collapsed | accuracy | 0.7571 (n=140) | — |
| collapsed | macro_f1 | 0.7414 (n=140) | — |
| collapsed | kappa | 0.6308 (n=140) [0.4823, 0.7660] | 2000/2000 |
| evidence | accuracy | 0.8857 (n=140) | — |
| evidence | macro_f1 | 0.8794 (n=140) | — |
| evidence | kappa | 0.7621 (n=140) | — |
| evidence | precision | 1.0000 (n=140) | — |
| evidence | recall | 0.7419 (n=140) | — |
| evidence | f1 | 0.8519 (n=140) [0.7324, 0.9286] | 2000/2000 |
| fit | accuracy | 0.8500 (n=20) [0.7000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.5920 (n=20) | — |
| fit | kappa | 0.7248 (n=20) | — |
| fit | coverage_spearman | 0.5139 (n=20) | — |
| fit | known_only_score_spearman | 0.8929 (n=20) | — |

exact confusion (n=140; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 5 | 2 | 1 | 0 | 0 | 0 |
| adequate | 4 | 12 | 9 | 0 | 0 | 4 |
| partial | 0 | 1 | 12 | 4 | 4 | 4 |
| absent | 0 | 0 | 0 | 20 | 0 | 0 |
| unknown | 0 | 0 | 0 | 18 | 40 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 10 | 0 | 0 |
| partial | 1 | 7 | 0 |
| good | 0 | 2 | 0 |

### jd/jd-hr-real (10 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.5143 (n=70) [0.4429, 0.5857] | 2000/2000 |
| exact | macro_f1 | 0.4564 (n=70) | — |
| exact | kappa | 0.4074 (n=70) [0.2870, 0.4872] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7162 (n=40) | — |
| collapsed | accuracy | 0.6571 (n=70) | — |
| collapsed | macro_f1 | 0.6003 (n=70) | — |
| collapsed | kappa | 0.4928 (n=70) [0.3326, 0.6124] | 2000/2000 |
| evidence | accuracy | 0.9143 (n=70) | — |
| evidence | macro_f1 | 0.9137 (n=70) | — |
| evidence | kappa | 0.8286 (n=70) | — |
| evidence | precision | 1.0000 (n=70) | — |
| evidence | recall | 0.8286 (n=70) | — |
| evidence | f1 | 0.9062 (n=70) [0.7778, 0.9697] | 2000/2000 |
| fit | accuracy | 0.8000 (n=10) [0.5000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.6000 (n=10) | — |
| fit | kappa | 0.6667 (n=10) | — |
| fit | coverage_spearman | 0.5948 (n=10) | — |
| fit | known_only_score_spearman | 0.9399 (n=10) | — |

exact confusion (n=70; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 4 | 2 | 1 | 0 | 0 | 0 |
| adequate | 1 | 8 | 6 | 0 | 0 | 1 |
| partial | 0 | 0 | 7 | 2 | 2 | 1 |
| absent | 0 | 0 | 0 | 9 | 0 | 0 |
| unknown | 0 | 0 | 0 | 18 | 8 | 0 |
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
| exact | accuracy | 0.7571 (n=70) [0.6286, 0.8857] | 2000/2000 |
| exact | macro_f1 | 0.5345 (n=70) | — |
| exact | kappa | 0.6596 (n=70) [0.5069, 0.8090] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7239 (n=30) | — |
| collapsed | accuracy | 0.8571 (n=70) | — |
| collapsed | macro_f1 | 0.8594 (n=70) | — |
| collapsed | kappa | 0.7681 (n=70) [0.5717, 0.9212] | 2000/2000 |
| evidence | accuracy | 0.8571 (n=70) | — |
| evidence | macro_f1 | 0.8343 (n=70) | — |
| evidence | kappa | 0.6762 (n=70) | — |
| evidence | precision | 1.0000 (n=70) | — |
| evidence | recall | 0.6296 (n=70) | — |
| evidence | f1 | 0.7727 (n=70) [0.5000, 0.9231] | 2000/2000 |
| fit | accuracy | 0.9000 (n=10) [0.7000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.8901 (n=10) | — |
| fit | kappa | 0.7826 (n=10) | — |
| fit | coverage_spearman | 0.4829 (n=10) | — |
| fit | known_only_score_spearman | 0.8743 (n=10) | — |

exact confusion (n=70; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 1 | 0 | 0 | 0 | 0 | 0 |
| adequate | 3 | 4 | 3 | 0 | 0 | 3 |
| partial | 0 | 1 | 5 | 2 | 2 | 3 |
| absent | 0 | 0 | 0 | 11 | 0 | 0 |
| unknown | 0 | 0 | 0 | 0 | 32 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=10; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 6 | 0 | 0 |
| partial | 1 | 3 | 0 |
| good | 0 | 0 | 0 |

### priority/must_have (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.7000 (n=80) [0.6000, 0.8125] | 2000/2000 |
| exact | macro_f1 | 0.5616 (n=80) | — |
| exact | kappa | 0.5764 (n=80) [0.4415, 0.7128] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7539 (n=35) | — |
| collapsed | accuracy | 0.7875 (n=80) | — |
| collapsed | macro_f1 | 0.7673 (n=80) | — |
| collapsed | kappa | 0.6707 (n=80) [0.5191, 0.8034] | 2000/2000 |
| evidence | accuracy | 0.9250 (n=80) | — |
| evidence | macro_f1 | 0.9107 (n=80) | — |
| evidence | kappa | 0.8226 (n=80) | — |
| evidence | precision | 1.0000 (n=80) | — |
| evidence | recall | 0.7778 (n=80) | — |
| evidence | f1 | 0.8750 (n=80) [0.7273, 0.9697] | 2000/2000 |
| fit | accuracy | 0.8500 (n=20) [0.7000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.5920 (n=20) | — |
| fit | kappa | 0.7248 (n=20) | — |
| fit | coverage_spearman | 0.5139 (n=20) | — |
| fit | known_only_score_spearman | 0.8929 (n=20) | — |

exact confusion (n=80; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 4 | 0 | 0 | 0 | 0 | 0 |
| adequate | 1 | 5 | 5 | 0 | 0 | 0 |
| partial | 0 | 1 | 5 | 3 | 2 | 1 |
| absent | 0 | 0 | 0 | 11 | 0 | 0 |
| unknown | 0 | 0 | 0 | 11 | 31 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 10 | 0 | 0 |
| partial | 1 | 7 | 0 |
| good | 0 | 2 | 0 |

### priority/nice_to_have (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.5500 (n=60) [0.4000, 0.6833] | 2000/2000 |
| exact | macro_f1 | 0.4479 (n=60) | — |
| exact | kappa | 0.4484 (n=60) [0.2703, 0.6061] | 2000/2000 |
| exact | linear_weighted_kappa | 0.6889 (n=35) | — |
| collapsed | accuracy | 0.7167 (n=60) | — |
| collapsed | macro_f1 | 0.6850 (n=60) | — |
| collapsed | kappa | 0.5534 (n=60) [0.3485, 0.7381] | 2000/2000 |
| evidence | accuracy | 0.8333 (n=60) | — |
| evidence | macro_f1 | 0.8333 (n=60) | — |
| evidence | kappa | 0.6757 (n=60) | — |
| evidence | precision | 1.0000 (n=60) | — |
| evidence | recall | 0.7143 (n=60) | — |
| evidence | f1 | 0.8333 (n=60) [0.6667, 0.9375] | 2000/2000 |
| fit | accuracy | 0.8500 (n=20) [0.7000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.5920 (n=20) | — |
| fit | kappa | 0.7248 (n=20) | — |
| fit | coverage_spearman | 0.5139 (n=20) | — |
| fit | known_only_score_spearman | 0.8929 (n=20) | — |

exact confusion (n=60; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 1 | 2 | 1 | 0 | 0 | 0 |
| adequate | 3 | 7 | 4 | 0 | 0 | 4 |
| partial | 0 | 0 | 7 | 1 | 2 | 3 |
| absent | 0 | 0 | 0 | 9 | 0 | 0 |
| unknown | 0 | 0 | 0 | 7 | 9 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 10 | 0 | 0 |
| partial | 1 | 7 | 0 |
| good | 0 | 2 | 0 |

### Error patterns

Of 20 labelled absent criteria, 0 became unknown. Adequate → partial accounts for 9 errors. The absent/unknown distinction reflects a material v1.1 convention difference; evidence detection ignores that distinction, so its F1 can be high despite exact-level errors.

Known-only score correlation has n=20; 0 pairs have zero known weight and no score. Coverage correlation retains all pairs. Fit errors below identify which classes drive the headline accuracy; the full 3×3 matrix should be read alongside it.

| Label → system | Count |
| --- | --- |
| unknown → absent | 18 |
| adequate → partial | 9 |
| partial → unknown | 4 |
| partial → absent | 4 |
| adequate → strong | 4 |
| partial → needs_review | 4 |
| adequate → needs_review | 4 |
| strong → adequate | 2 |
| strong → partial | 1 |
| partial → adequate | 1 |

| JD / criterion | Errors | n |
| --- | --- | --- |
| jd-hr-real/talent_acquisition | 8 | 10 |
| jd-hr-real/interpersonal_communication | 8 | 10 |
| jd-hr-real/hr_programs | 7 | 10 |
| jd-py-real/communication_collaboration | 6 | 10 |
| jd-hr-real/employee_relations_compliance | 5 | 10 |
| jd-hr-real/hr_experience | 3 | 10 |
| jd-py-real/postgresql_database | 3 | 10 |
| jd-py-real/education_cs | 3 | 10 |
| jd-hr-real/education_hr_business | 2 | 10 |
| jd-py-real/backend_experience | 2 | 10 |
| jd-hr-real/hris_office_tools | 1 | 10 |
| jd-py-real/python_frameworks | 1 | 10 |
| jd-py-real/cloud_docker_linux | 1 | 10 |
| jd-py-real/software_architecture | 1 | 10 |

| Pair | Label fit | System fit |
| --- | --- | --- |
| database-01__jd-py-real | partial | poor |
| hr-01__jd-hr-real | good | partial |
| hr-02__jd-hr-real | good | partial |

Quote-validation level changes: 8 criterion assessments.

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
