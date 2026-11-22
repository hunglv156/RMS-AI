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
| 20261122T083536Z-v2-lexical-gemini-3-8-flash-low-c1 | 0.7286 (n=140) [0.6286, 0.8143] | 0.6356 (n=140) [0.5113, 0.7448] | 0.7107 (n=140) [0.5816, 0.8280] | 0.8440 (n=140) [0.7473, 0.9247] | 0.9500 (n=20) [0.8500, 1.0000] |
| 20261122T162215Z-dev-esc-argonmedium | 0.7357 (n=140) [0.6357, 0.8357] | 0.6455 (n=140) [0.5256, 0.7652] | 0.7771 (n=140) [0.6649, 0.8758] | 0.9217 (n=140) [0.8706, 0.9635] | 0.9000 (n=20) [0.7500, 1.0000] |
| 20261122T182040Z-dev-esc-nr-argonmedium | 0.7643 (n=140) [0.6571, 0.8500] | 0.6796 (n=140) [0.5423, 0.7914] | 0.7871 (n=140) [0.6680, 0.8778] | 0.8929 (n=140) [0.8116, 0.9538] | 0.9500 (n=20) [0.8500, 1.0000] |

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


## 20261122T162215Z-dev-esc-argonmedium

### all (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.7357 (n=140) [0.6357, 0.8357] | 2000/2000 |
| exact | macro_f1 | 0.6842 (n=140) | — |
| exact | kappa | 0.6455 (n=140) [0.5256, 0.7652] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7635 (n=76) | — |
| collapsed | accuracy | 0.8571 (n=140) | — |
| collapsed | macro_f1 | 0.8364 (n=140) | — |
| collapsed | kappa | 0.7771 (n=140) [0.6649, 0.8758] | 2000/2000 |
| evidence | accuracy | 0.9357 (n=140) | — |
| evidence | macro_f1 | 0.9336 (n=140) | — |
| evidence | kappa | 0.8678 (n=140) | — |
| evidence | precision | 1.0000 (n=140) | — |
| evidence | recall | 0.8548 (n=140) | — |
| evidence | f1 | 0.9217 (n=140) [0.8706, 0.9635] | 2000/2000 |
| fit | accuracy | 0.9000 (n=20) [0.7500, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.9221 (n=20) | — |
| fit | kappa | 0.8246 (n=20) | — |
| fit | coverage_spearman | 0.6917 (n=20) | — |
| fit | known_only_score_spearman | 0.7985 (n=20) | — |

exact confusion (n=140; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 5 | 3 | 0 | 0 | 0 | 0 |
| adequate | 5 | 16 | 8 | 0 | 0 | 0 |
| partial | 0 | 1 | 15 | 3 | 6 | 0 |
| absent | 0 | 0 | 0 | 20 | 0 | 0 |
| unknown | 0 | 0 | 0 | 11 | 47 | 0 |
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
| exact | accuracy | 0.6429 (n=70) [0.5143, 0.7857] | 2000/2000 |
| exact | macro_f1 | 0.6393 (n=70) | — |
| exact | kappa | 0.5490 (n=70) [0.3861, 0.7051] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7537 (n=42) | — |
| collapsed | accuracy | 0.7857 (n=70) | — |
| collapsed | macro_f1 | 0.7392 (n=70) | — |
| collapsed | kappa | 0.6693 (n=70) [0.5043, 0.8072] | 2000/2000 |
| evidence | accuracy | 0.9429 (n=70) | — |
| evidence | macro_f1 | 0.9427 (n=70) | — |
| evidence | kappa | 0.8857 (n=70) | — |
| evidence | precision | 1.0000 (n=70) | — |
| evidence | recall | 0.8857 (n=70) | — |
| evidence | f1 | 0.9394 (n=70) [0.8889, 0.9841] | 2000/2000 |
| fit | accuracy | 0.9000 (n=10) [0.7000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.9153 (n=10) | — |
| fit | kappa | 0.8438 (n=10) | — |
| fit | coverage_spearman | 0.7188 (n=10) | — |
| fit | known_only_score_spearman | 0.9237 (n=10) | — |

exact confusion (n=70; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 5 | 2 | 0 | 0 | 0 | 0 |
| adequate | 3 | 9 | 4 | 0 | 0 | 0 |
| partial | 0 | 1 | 7 | 2 | 2 | 0 |
| absent | 0 | 0 | 0 | 9 | 0 | 0 |
| unknown | 0 | 0 | 0 | 11 | 15 | 0 |
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
| exact | accuracy | 0.8286 (n=70) [0.7000, 0.9429] | 2000/2000 |
| exact | macro_f1 | 0.6409 (n=70) | — |
| exact | kappa | 0.7496 (n=70) [0.5909, 0.8968] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7639 (n=34) | — |
| collapsed | accuracy | 0.9286 (n=70) | — |
| collapsed | macro_f1 | 0.9319 (n=70) | — |
| collapsed | kappa | 0.8842 (n=70) [0.7706, 0.9756] | 2000/2000 |
| evidence | accuracy | 0.9286 (n=70) | — |
| evidence | macro_f1 | 0.9215 (n=70) | — |
| evidence | kappa | 0.8439 (n=70) | — |
| evidence | precision | 1.0000 (n=70) | — |
| evidence | recall | 0.8148 (n=70) | — |
| evidence | f1 | 0.8980 (n=70) [0.7879, 0.9697] | 2000/2000 |
| fit | accuracy | 0.9000 (n=10) [0.7000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.8901 (n=10) | — |
| fit | kappa | 0.7826 (n=10) | — |
| fit | coverage_spearman | 0.7581 (n=10) | — |
| fit | known_only_score_spearman | 0.8633 (n=10) | — |

exact confusion (n=70; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 0 | 1 | 0 | 0 | 0 | 0 |
| adequate | 2 | 7 | 4 | 0 | 0 | 0 |
| partial | 0 | 0 | 8 | 1 | 4 | 0 |
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
| exact | accuracy | 0.7375 (n=80) [0.6125, 0.8500] | 2000/2000 |
| exact | macro_f1 | 0.6499 (n=80) | — |
| exact | kappa | 0.6194 (n=80) [0.4621, 0.7655] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7632 (n=35) | — |
| collapsed | accuracy | 0.8375 (n=80) | — |
| collapsed | macro_f1 | 0.8154 (n=80) | — |
| collapsed | kappa | 0.7414 (n=80) [0.5882, 0.8773] | 2000/2000 |
| evidence | accuracy | 0.9375 (n=80) | — |
| evidence | macro_f1 | 0.9265 (n=80) | — |
| evidence | kappa | 0.8536 (n=80) | — |
| evidence | precision | 1.0000 (n=80) | — |
| evidence | recall | 0.8148 (n=80) | — |
| evidence | f1 | 0.8980 (n=80) [0.7316, 0.9836] | 2000/2000 |
| fit | accuracy | 0.9000 (n=20) [0.7500, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.9221 (n=20) | — |
| fit | kappa | 0.8246 (n=20) | — |
| fit | coverage_spearman | 0.6917 (n=20) | — |
| fit | known_only_score_spearman | 0.7985 (n=20) | — |

exact confusion (n=80; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 3 | 1 | 0 | 0 | 0 | 0 |
| adequate | 4 | 5 | 2 | 0 | 0 | 0 |
| partial | 0 | 1 | 6 | 2 | 3 | 0 |
| absent | 0 | 0 | 0 | 11 | 0 | 0 |
| unknown | 0 | 0 | 0 | 8 | 34 | 0 |
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
| exact | accuracy | 0.7333 (n=60) [0.6333, 0.8333] | 2000/2000 |
| exact | macro_f1 | 0.7109 (n=60) | — |
| exact | kappa | 0.6554 (n=60) [0.5231, 0.7838] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7611 (n=41) | — |
| collapsed | accuracy | 0.8833 (n=60) | — |
| collapsed | macro_f1 | 0.8567 (n=60) | — |
| collapsed | kappa | 0.8039 (n=60) [0.6703, 0.9179] | 2000/2000 |
| evidence | accuracy | 0.9333 (n=60) | — |
| evidence | macro_f1 | 0.9327 (n=60) | — |
| evidence | kappa | 0.8659 (n=60) | — |
| evidence | precision | 1.0000 (n=60) | — |
| evidence | recall | 0.8857 (n=60) | — |
| evidence | f1 | 0.9394 (n=60) [0.8846, 0.9855] | 2000/2000 |
| fit | accuracy | 0.9000 (n=20) [0.7500, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.9221 (n=20) | — |
| fit | kappa | 0.8246 (n=20) | — |
| fit | coverage_spearman | 0.6917 (n=20) | — |
| fit | known_only_score_spearman | 0.7985 (n=20) | — |

exact confusion (n=60; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 2 | 2 | 0 | 0 | 0 | 0 |
| adequate | 1 | 11 | 6 | 0 | 0 | 0 |
| partial | 0 | 0 | 9 | 1 | 3 | 0 |
| absent | 0 | 0 | 0 | 9 | 0 | 0 |
| unknown | 0 | 0 | 0 | 3 | 13 | 0 |
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
| unknown → absent | 11 |
| adequate → partial | 8 |
| partial → unknown | 6 |
| adequate → strong | 5 |
| partial → absent | 3 |
| strong → adequate | 3 |
| partial → adequate | 1 |

| JD / criterion | Errors | n |
| --- | --- | --- |
| jd-hr-real/talent_acquisition | 8 | 10 |
| jd-hr-real/interpersonal_communication | 5 | 10 |
| jd-py-real/communication_collaboration | 4 | 10 |
| jd-hr-real/employee_relations_compliance | 3 | 10 |
| jd-hr-real/education_hr_business | 3 | 10 |
| jd-hr-real/hr_programs | 3 | 10 |
| jd-py-real/backend_experience | 3 | 10 |
| jd-hr-real/hr_experience | 2 | 10 |
| jd-py-real/postgresql_database | 2 | 10 |
| jd-hr-real/hris_office_tools | 1 | 10 |
| jd-py-real/python_frameworks | 1 | 10 |
| jd-py-real/cloud_docker_linux | 1 | 10 |
| jd-py-real/education_cs | 1 | 10 |
| jd-py-real/software_architecture | 0 | 10 |

| Pair | Label fit | System fit |
| --- | --- | --- |
| database-01__jd-hr-real | partial | poor |
| database-01__jd-py-real | partial | poor |

Quote-validation level changes: 0 criterion assessments.


## 20261122T182040Z-dev-esc-nr-argonmedium

### all (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.7643 (n=140) [0.6571, 0.8500] | 2000/2000 |
| exact | macro_f1 | 0.7013 (n=140) | — |
| exact | kappa | 0.6796 (n=140) [0.5423, 0.7914] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7647 (n=75) | — |
| collapsed | accuracy | 0.8643 (n=140) | — |
| collapsed | macro_f1 | 0.8471 (n=140) | — |
| collapsed | kappa | 0.7871 (n=140) [0.6680, 0.8778] | 2000/2000 |
| evidence | accuracy | 0.9143 (n=140) | — |
| evidence | macro_f1 | 0.9107 (n=140) | — |
| evidence | kappa | 0.8228 (n=140) | — |
| evidence | precision | 1.0000 (n=140) | — |
| evidence | recall | 0.8065 (n=140) | — |
| evidence | f1 | 0.8929 (n=140) [0.8116, 0.9538] | 2000/2000 |
| fit | accuracy | 0.9500 (n=20) [0.8500, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.9619 (n=20) | — |
| fit | kappa | 0.9130 (n=20) | — |
| fit | coverage_spearman | 0.7058 (n=20) | — |
| fit | known_only_score_spearman | 0.8640 (n=20) | — |

exact confusion (n=140; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 5 | 3 | 0 | 0 | 0 | 0 |
| adequate | 5 | 19 | 4 | 1 | 0 | 0 |
| partial | 0 | 2 | 12 | 4 | 7 | 0 |
| absent | 0 | 0 | 0 | 20 | 0 | 0 |
| unknown | 0 | 0 | 0 | 7 | 51 | 0 |
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
| exact | accuracy | 0.7143 (n=70) [0.5429, 0.8571] | 2000/2000 |
| exact | macro_f1 | 0.6932 (n=70) | — |
| exact | kappa | 0.6309 (n=70) [0.4113, 0.8099] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7723 (n=41) | — |
| collapsed | accuracy | 0.8143 (n=70) | — |
| collapsed | macro_f1 | 0.7803 (n=70) | — |
| collapsed | kappa | 0.7104 (n=70) [0.5183, 0.8436] | 2000/2000 |
| evidence | accuracy | 0.9143 (n=70) | — |
| evidence | macro_f1 | 0.9137 (n=70) | — |
| evidence | kappa | 0.8286 (n=70) | — |
| evidence | precision | 1.0000 (n=70) | — |
| evidence | recall | 0.8286 (n=70) | — |
| evidence | f1 | 0.9062 (n=70) [0.7727, 0.9804] | 2000/2000 |
| fit | accuracy | 1.0000 (n=10) [1.0000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 1.0000 (n=10) | — |
| fit | kappa | 1.0000 (n=10) | — |
| fit | coverage_spearman | 0.7690 (n=10) | — |
| fit | known_only_score_spearman | 0.9063 (n=10) | — |

exact confusion (n=70; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 5 | 2 | 0 | 0 | 0 | 0 |
| adequate | 3 | 11 | 1 | 1 | 0 | 0 |
| partial | 0 | 1 | 6 | 2 | 3 | 0 |
| absent | 0 | 0 | 0 | 9 | 0 | 0 |
| unknown | 0 | 0 | 0 | 7 | 19 | 0 |
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
| exact | accuracy | 0.8143 (n=70) [0.7000, 0.9143] | 2000/2000 |
| exact | macro_f1 | 0.6198 (n=70) | — |
| exact | kappa | 0.7288 (n=70) [0.5922, 0.8652] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7398 (n=34) | — |
| collapsed | accuracy | 0.9143 (n=70) | — |
| collapsed | macro_f1 | 0.9109 (n=70) | — |
| collapsed | kappa | 0.8618 (n=70) [0.7386, 0.9739] | 2000/2000 |
| evidence | accuracy | 0.9143 (n=70) | — |
| evidence | macro_f1 | 0.9049 (n=70) | — |
| evidence | kappa | 0.8113 (n=70) | — |
| evidence | precision | 1.0000 (n=70) | — |
| evidence | recall | 0.7778 (n=70) | — |
| evidence | f1 | 0.8750 (n=70) [0.7567, 0.9630] | 2000/2000 |
| fit | accuracy | 0.9000 (n=10) [0.7000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.8901 (n=10) | — |
| fit | kappa | 0.7826 (n=10) | — |
| fit | coverage_spearman | 0.7581 (n=10) | — |
| fit | known_only_score_spearman | 0.8633 (n=10) | — |

exact confusion (n=70; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 0 | 1 | 0 | 0 | 0 | 0 |
| adequate | 2 | 8 | 3 | 0 | 0 | 0 |
| partial | 0 | 1 | 6 | 2 | 4 | 0 |
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
| exact | accuracy | 0.7750 (n=80) [0.6750, 0.8625] | 2000/2000 |
| exact | macro_f1 | 0.6864 (n=80) | — |
| exact | kappa | 0.6711 (n=80) [0.5341, 0.7973] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7662 (n=36) | — |
| collapsed | accuracy | 0.8625 (n=80) | — |
| collapsed | macro_f1 | 0.8359 (n=80) | — |
| collapsed | kappa | 0.7794 (n=80) [0.6523, 0.8863] | 2000/2000 |
| evidence | accuracy | 0.9375 (n=80) | — |
| evidence | macro_f1 | 0.9265 (n=80) | — |
| evidence | kappa | 0.8536 (n=80) | — |
| evidence | precision | 1.0000 (n=80) | — |
| evidence | recall | 0.8148 (n=80) | — |
| evidence | f1 | 0.8980 (n=80) [0.7333, 0.9831] | 2000/2000 |
| fit | accuracy | 0.9500 (n=20) [0.8500, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.9619 (n=20) | — |
| fit | kappa | 0.9130 (n=20) | — |
| fit | coverage_spearman | 0.7058 (n=20) | — |
| fit | known_only_score_spearman | 0.8640 (n=20) | — |

exact confusion (n=80; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 3 | 1 | 0 | 0 | 0 | 0 |
| adequate | 3 | 7 | 1 | 0 | 0 | 0 |
| partial | 0 | 2 | 5 | 3 | 2 | 0 |
| absent | 0 | 0 | 0 | 11 | 0 | 0 |
| unknown | 0 | 0 | 0 | 6 | 36 | 0 |
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
| exact | accuracy | 0.7500 (n=60) [0.6167, 0.8667] | 2000/2000 |
| exact | macro_f1 | 0.7098 (n=60) | — |
| exact | kappa | 0.6756 (n=60) [0.5016, 0.8168] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7607 (n=39) | — |
| collapsed | accuracy | 0.8667 (n=60) | — |
| collapsed | macro_f1 | 0.8598 (n=60) | — |
| collapsed | kappa | 0.7810 (n=60) [0.5928, 0.9192] | 2000/2000 |
| evidence | accuracy | 0.8833 (n=60) | — |
| evidence | macro_f1 | 0.8830 (n=60) | — |
| evidence | kappa | 0.7692 (n=60) | — |
| evidence | precision | 1.0000 (n=60) | — |
| evidence | recall | 0.8000 (n=60) | — |
| evidence | f1 | 0.8889 (n=60) [0.7941, 0.9577] | 2000/2000 |
| fit | accuracy | 0.9500 (n=20) [0.8500, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.9619 (n=20) | — |
| fit | kappa | 0.9130 (n=20) | — |
| fit | coverage_spearman | 0.7058 (n=20) | — |
| fit | known_only_score_spearman | 0.8640 (n=20) | — |

exact confusion (n=60; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 2 | 2 | 0 | 0 | 0 | 0 |
| adequate | 2 | 12 | 3 | 1 | 0 | 0 |
| partial | 0 | 0 | 7 | 1 | 5 | 0 |
| absent | 0 | 0 | 0 | 9 | 0 | 0 |
| unknown | 0 | 0 | 0 | 1 | 15 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 10 | 0 | 0 |
| partial | 1 | 7 | 0 |
| good | 0 | 0 | 2 |

### Error patterns

Of 20 labelled absent criteria, 0 became unknown. Adequate → partial accounts for 4 errors. The absent/unknown distinction reflects a material v1.1 convention difference; evidence detection ignores that distinction, so its F1 can be high despite exact-level errors.

Known-only score correlation has n=20; 0 pairs have zero known weight and no score. Coverage correlation retains all pairs. Fit errors below identify which classes drive the headline accuracy; the full 3×3 matrix should be read alongside it.

| Label → system | Count |
| --- | --- |
| unknown → absent | 7 |
| partial → unknown | 7 |
| adequate → strong | 5 |
| partial → absent | 4 |
| adequate → partial | 4 |
| strong → adequate | 3 |
| partial → adequate | 2 |
| adequate → absent | 1 |

| JD / criterion | Errors | n |
| --- | --- | --- |
| jd-hr-real/talent_acquisition | 7 | 10 |
| jd-hr-real/education_hr_business | 4 | 10 |
| jd-py-real/communication_collaboration | 4 | 10 |
| jd-hr-real/hr_experience | 3 | 10 |
| jd-hr-real/interpersonal_communication | 3 | 10 |
| jd-py-real/backend_experience | 3 | 10 |
| jd-hr-real/hr_programs | 2 | 10 |
| jd-py-real/postgresql_database | 2 | 10 |
| jd-py-real/education_cs | 2 | 10 |
| jd-hr-real/employee_relations_compliance | 1 | 10 |
| jd-py-real/python_frameworks | 1 | 10 |
| jd-py-real/cloud_docker_linux | 1 | 10 |
| jd-hr-real/hris_office_tools | 0 | 10 |
| jd-py-real/software_architecture | 0 | 10 |

| Pair | Label fit | System fit |
| --- | --- | --- |
| database-01__jd-py-real | partial | poor |

Quote-validation level changes: 0 criterion assessments.

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
