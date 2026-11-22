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
| 20261122T122041Z-heldout-final-flashlow-v2-hedge20 | 0.7357 (n=140) [0.6429, 0.8214] | 0.6570 (n=140) [0.5457, 0.7626] | 0.7479 (n=140) [0.6413, 0.8466] | 0.8618 (n=140) [0.7731, 0.9323] | 1.0000 (n=20) [1.0000, 1.0000] |
| 20261122T122041Z-heldout-baseline-flashhigh-v1 | 0.5429 (n=140) [0.4571, 0.6143] | 0.3920 (n=140) [0.2947, 0.4805] | 0.4817 (n=140) [0.3641, 0.5954] | 0.8682 (n=140) [0.7642, 0.9394] | 0.9500 (n=20) [0.8500, 1.0000] |

## 20261122T122041Z-heldout-final-flashlow-v2-hedge20

### all (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.7357 (n=140) [0.6429, 0.8214] | 2000/2000 |
| exact | macro_f1 | 0.5950 (n=140) | — |
| exact | kappa | 0.6570 (n=140) [0.5457, 0.7626] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7848 (n=85) | — |
| collapsed | accuracy | 0.8357 (n=140) | — |
| collapsed | macro_f1 | 0.8338 (n=140) | — |
| collapsed | kappa | 0.7479 (n=140) [0.6413, 0.8466] | 2000/2000 |
| evidence | accuracy | 0.8786 (n=140) | — |
| evidence | macro_f1 | 0.8768 (n=140) | — |
| evidence | kappa | 0.7563 (n=140) | — |
| evidence | precision | 0.9815 (n=140) | — |
| evidence | recall | 0.7681 (n=140) | — |
| evidence | f1 | 0.8618 (n=140) [0.7731, 0.9323] | 2000/2000 |
| fit | accuracy | 1.0000 (n=20) [1.0000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 1.0000 (n=20) | — |
| fit | kappa | 1.0000 (n=20) | — |
| fit | coverage_spearman | 0.7484 (n=20) | — |
| fit | known_only_score_spearman | 0.8211 (n=20) | — |

exact confusion (n=140; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 5 | 2 | 0 | 0 | 0 | 0 |
| adequate | 2 | 17 | 3 | 0 | 0 | 0 |
| partial | 2 | 5 | 17 | 4 | 11 | 1 |
| absent | 0 | 0 | 0 | 28 | 5 | 0 |
| unknown | 0 | 0 | 1 | 1 | 36 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 8 | 0 | 0 |
| partial | 0 | 11 | 0 |
| good | 0 | 0 | 1 |

### jd/jd-hr-real (10 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.7143 (n=70) [0.6000, 0.8286] | 2000/2000 |
| exact | macro_f1 | 0.7135 (n=70) | — |
| exact | kappa | 0.6346 (n=70) [0.4841, 0.7744] | 2000/2000 |
| exact | linear_weighted_kappa | 0.8456 (n=45) | — |
| collapsed | accuracy | 0.8000 (n=70) | — |
| collapsed | macro_f1 | 0.7803 (n=70) | — |
| collapsed | kappa | 0.6891 (n=70) [0.5559, 0.8164] | 2000/2000 |
| evidence | accuracy | 0.8857 (n=70) | — |
| evidence | macro_f1 | 0.8853 (n=70) | — |
| evidence | kappa | 0.7724 (n=70) | — |
| evidence | precision | 0.9667 (n=70) | — |
| evidence | recall | 0.8056 (n=70) | — |
| evidence | f1 | 0.8788 (n=70) [0.7272, 0.9709] | 2000/2000 |
| fit | accuracy | 1.0000 (n=10) [1.0000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 1.0000 (n=10) | — |
| fit | kappa | 1.0000 (n=10) | — |
| fit | coverage_spearman | 0.7039 (n=10) | — |
| fit | known_only_score_spearman | 0.8253 (n=10) | — |

exact confusion (n=70; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 4 | 1 | 0 | 0 | 0 | 0 |
| adequate | 2 | 11 | 2 | 0 | 0 | 0 |
| partial | 0 | 1 | 8 | 2 | 5 | 0 |
| absent | 0 | 0 | 0 | 14 | 5 | 0 |
| unknown | 0 | 0 | 1 | 1 | 13 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=10; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 3 | 0 | 0 |
| partial | 0 | 6 | 0 |
| good | 0 | 0 | 1 |

### jd/jd-py-real (10 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.7571 (n=70) [0.6000, 0.8857] | 2000/2000 |
| exact | macro_f1 | 0.5690 (n=70) | — |
| exact | kappa | 0.6772 (n=70) [0.4904, 0.8417] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7015 (n=40) | — |
| collapsed | accuracy | 0.8714 (n=70) | — |
| collapsed | macro_f1 | 0.8811 (n=70) | — |
| collapsed | kappa | 0.8028 (n=70) [0.6320, 0.9333] | 2000/2000 |
| evidence | accuracy | 0.8714 (n=70) | — |
| evidence | macro_f1 | 0.8668 (n=70) | — |
| evidence | kappa | 0.7382 (n=70) | — |
| evidence | precision | 1.0000 (n=70) | — |
| evidence | recall | 0.7273 (n=70) | — |
| evidence | f1 | 0.8421 (n=70) [0.7347, 0.9388] | 2000/2000 |
| fit | accuracy | 1.0000 (n=10) [1.0000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 1.0000 (n=10) | — |
| fit | kappa | 1.0000 (n=10) | — |
| fit | coverage_spearman | 0.8980 (n=10) | — |
| fit | known_only_score_spearman | 0.8811 (n=10) | — |

exact confusion (n=70; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 1 | 1 | 0 | 0 | 0 | 0 |
| adequate | 0 | 6 | 1 | 0 | 0 | 0 |
| partial | 2 | 4 | 9 | 2 | 6 | 1 |
| absent | 0 | 0 | 0 | 14 | 0 | 0 |
| unknown | 0 | 0 | 0 | 0 | 23 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=10; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 5 | 0 | 0 |
| partial | 0 | 5 | 0 |
| good | 0 | 0 | 0 |

### priority/must_have (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.8375 (n=80) [0.7250, 0.9250] | 2000/2000 |
| exact | macro_f1 | 0.6711 (n=80) | — |
| exact | kappa | 0.7790 (n=80) [0.6360, 0.9005] | 2000/2000 |
| exact | linear_weighted_kappa | 0.8223 (n=44) | — |
| collapsed | accuracy | 0.8875 (n=80) | — |
| collapsed | macro_f1 | 0.8870 (n=80) | — |
| collapsed | kappa | 0.8278 (n=80) [0.6932, 0.9414] | 2000/2000 |
| evidence | accuracy | 0.9000 (n=80) | — |
| evidence | macro_f1 | 0.8901 (n=80) | — |
| evidence | kappa | 0.7816 (n=80) | — |
| evidence | precision | 0.9600 (n=80) | — |
| evidence | recall | 0.7742 (n=80) | — |
| evidence | f1 | 0.8571 (n=80) [0.7212, 0.9584] | 2000/2000 |
| fit | accuracy | 1.0000 (n=20) [1.0000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 1.0000 (n=20) | — |
| fit | kappa | 1.0000 (n=20) | — |
| fit | coverage_spearman | 0.7484 (n=20) | — |
| fit | known_only_score_spearman | 0.8211 (n=20) | — |

exact confusion (n=80; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 4 | 1 | 0 | 0 | 0 | 0 |
| adequate | 0 | 8 | 1 | 0 | 0 | 0 |
| partial | 2 | 0 | 8 | 3 | 3 | 1 |
| absent | 0 | 0 | 0 | 17 | 0 | 0 |
| unknown | 0 | 0 | 1 | 1 | 30 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 8 | 0 | 0 |
| partial | 0 | 11 | 0 |
| good | 0 | 0 | 1 |

### priority/nice_to_have (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.6000 (n=60) [0.4667, 0.7333] | 2000/2000 |
| exact | macro_f1 | 0.5676 (n=60) | — |
| exact | kappa | 0.4930 (n=60) [0.3429, 0.6513] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7323 (n=41) | — |
| collapsed | accuracy | 0.7667 (n=60) | — |
| collapsed | macro_f1 | 0.7105 (n=60) | — |
| collapsed | kappa | 0.6168 (n=60) [0.4467, 0.7827] | 2000/2000 |
| evidence | accuracy | 0.8500 (n=60) | — |
| evidence | macro_f1 | 0.8479 (n=60) | — |
| evidence | kappa | 0.7026 (n=60) | — |
| evidence | precision | 1.0000 (n=60) | — |
| evidence | recall | 0.7632 (n=60) | — |
| evidence | f1 | 0.8657 (n=60) [0.7667, 0.9412] | 2000/2000 |
| fit | accuracy | 1.0000 (n=20) [1.0000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 1.0000 (n=20) | — |
| fit | kappa | 1.0000 (n=20) | — |
| fit | coverage_spearman | 0.7484 (n=20) | — |
| fit | known_only_score_spearman | 0.8211 (n=20) | — |

exact confusion (n=60; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 1 | 1 | 0 | 0 | 0 | 0 |
| adequate | 2 | 9 | 2 | 0 | 0 | 0 |
| partial | 0 | 5 | 9 | 1 | 8 | 0 |
| absent | 0 | 0 | 0 | 11 | 5 | 0 |
| unknown | 0 | 0 | 0 | 0 | 6 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 8 | 0 | 0 |
| partial | 0 | 11 | 0 |
| good | 0 | 0 | 1 |

### Error patterns

Of 33 labelled absent criteria, 5 became unknown. Adequate → partial accounts for 3 errors. The absent/unknown distinction reflects a material v1.1 convention difference; evidence detection ignores that distinction, so its F1 can be high despite exact-level errors.

Known-only score correlation has n=20; 0 pairs have zero known weight and no score. Coverage correlation retains all pairs. Fit errors below identify which classes drive the headline accuracy; the full 3×3 matrix should be read alongside it.

| Label → system | Count |
| --- | --- |
| partial → unknown | 11 |
| absent → unknown | 5 |
| partial → adequate | 5 |
| partial → absent | 4 |
| adequate → partial | 3 |
| adequate → strong | 2 |
| partial → strong | 2 |
| strong → adequate | 2 |
| unknown → absent | 1 |
| partial → needs_review | 1 |
| unknown → partial | 1 |

| JD / criterion | Errors | n |
| --- | --- | --- |
| jd-hr-real/hr_programs | 7 | 10 |
| jd-hr-real/interpersonal_communication | 5 | 10 |
| jd-hr-real/education_hr_business | 4 | 10 |
| jd-py-real/backend_experience | 4 | 10 |
| jd-py-real/communication_collaboration | 4 | 10 |
| jd-py-real/software_architecture | 3 | 10 |
| jd-py-real/postgresql_database | 2 | 10 |
| jd-py-real/cloud_docker_linux | 2 | 10 |
| jd-hr-real/hr_experience | 1 | 10 |
| jd-hr-real/talent_acquisition | 1 | 10 |
| jd-hr-real/employee_relations_compliance | 1 | 10 |
| jd-hr-real/hris_office_tools | 1 | 10 |
| jd-py-real/python_frameworks | 1 | 10 |
| jd-py-real/education_cs | 1 | 10 |

| Pair | Label fit | System fit |
| --- | --- | --- |

Quote-validation level changes: 1 criterion assessments.


## 20261122T122041Z-heldout-baseline-flashhigh-v1

### all (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.5429 (n=140) [0.4571, 0.6143] | 2000/2000 |
| exact | macro_f1 | 0.3934 (n=140) | — |
| exact | kappa | 0.3920 (n=140) [0.2947, 0.4805] | 2000/2000 |
| exact | linear_weighted_kappa | 0.5252 (n=61) | — |
| collapsed | accuracy | 0.6714 (n=140) | — |
| collapsed | macro_f1 | 0.5059 (n=140) | — |
| collapsed | kappa | 0.4817 (n=140) [0.3641, 0.5954] | 2000/2000 |
| evidence | accuracy | 0.8786 (n=140) | — |
| evidence | macro_f1 | 0.8778 (n=140) | — |
| evidence | kappa | 0.7566 (n=140) | — |
| evidence | precision | 0.9333 (n=140) | — |
| evidence | recall | 0.8116 (n=140) | — |
| evidence | f1 | 0.8682 (n=140) [0.7642, 0.9394] | 2000/2000 |
| fit | accuracy | 0.9500 (n=20) [0.8500, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.9645 (n=20) | — |
| fit | kappa | 0.9078 (n=20) | — |
| fit | coverage_spearman | 0.8343 (n=20) | — |
| fit | known_only_score_spearman | 0.4804 (n=18) | — |

exact confusion (n=140; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 5 | 2 | 0 | 0 | 0 | 0 |
| adequate | 4 | 7 | 10 | 0 | 1 | 0 |
| partial | 0 | 2 | 26 | 1 | 9 | 2 |
| absent | 0 | 0 | 4 | 0 | 29 | 0 |
| unknown | 0 | 0 | 0 | 0 | 38 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 8 | 0 | 0 |
| partial | 1 | 10 | 0 |
| good | 0 | 0 | 1 |

### jd/jd-hr-real (10 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.4857 (n=70) [0.3857, 0.5857] | 2000/2000 |
| exact | macro_f1 | 0.3749 (n=70) | — |
| exact | kappa | 0.3532 (n=70) [0.2065, 0.4859] | 2000/2000 |
| exact | linear_weighted_kappa | 0.5327 (n=31) | — |
| collapsed | accuracy | 0.6429 (n=70) | — |
| collapsed | macro_f1 | 0.4837 (n=70) | — |
| collapsed | kappa | 0.4530 (n=70) [0.2698, 0.6452] | 2000/2000 |
| evidence | accuracy | 0.9000 (n=70) | — |
| evidence | macro_f1 | 0.8998 (n=70) | — |
| evidence | kappa | 0.8007 (n=70) | — |
| evidence | precision | 0.9677 (n=70) | — |
| evidence | recall | 0.8333 (n=70) | — |
| evidence | f1 | 0.8955 (n=70) [0.7057, 0.9873] | 2000/2000 |
| fit | accuracy | 0.9000 (n=10) [0.7000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.9221 (n=10) | — |
| fit | kappa | 0.8246 (n=10) | — |
| fit | coverage_spearman | 0.8240 (n=10) | — |
| fit | known_only_score_spearman | 0.2497 (n=9) | — |

exact confusion (n=70; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 3 | 2 | 0 | 0 | 0 | 0 |
| adequate | 2 | 5 | 7 | 0 | 1 | 0 |
| partial | 0 | 0 | 11 | 0 | 4 | 1 |
| absent | 0 | 0 | 1 | 0 | 18 | 0 |
| unknown | 0 | 0 | 0 | 0 | 15 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=10; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 3 | 0 | 0 |
| partial | 1 | 5 | 0 |
| good | 0 | 0 | 1 |

### jd/jd-py-real (10 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.6000 (n=70) [0.4996, 0.7000] | 2000/2000 |
| exact | macro_f1 | 0.4065 (n=70) | — |
| exact | kappa | 0.4317 (n=70) [0.3156, 0.5281] | 2000/2000 |
| exact | linear_weighted_kappa | 0.4876 (n=30) | — |
| collapsed | accuracy | 0.7000 (n=70) | — |
| collapsed | macro_f1 | 0.5230 (n=70) | — |
| collapsed | kappa | 0.5115 (n=70) [0.3795, 0.6190] | 2000/2000 |
| evidence | accuracy | 0.8571 (n=70) | — |
| evidence | macro_f1 | 0.8553 (n=70) | — |
| evidence | kappa | 0.7115 (n=70) | — |
| evidence | precision | 0.8966 (n=70) | — |
| evidence | recall | 0.7879 (n=70) | — |
| evidence | f1 | 0.8387 (n=70) [0.7500, 0.9206] | 2000/2000 |
| fit | accuracy | 1.0000 (n=10) [1.0000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 1.0000 (n=10) | — |
| fit | kappa | 1.0000 (n=10) | — |
| fit | coverage_spearman | 0.8839 (n=10) | — |
| fit | known_only_score_spearman | 0.7589 (n=9) | — |

exact confusion (n=70; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 2 | 0 | 0 | 0 | 0 | 0 |
| adequate | 2 | 2 | 3 | 0 | 0 | 0 |
| partial | 0 | 2 | 15 | 1 | 5 | 1 |
| absent | 0 | 0 | 3 | 0 | 11 | 0 |
| unknown | 0 | 0 | 0 | 0 | 23 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=10; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 5 | 0 | 0 |
| partial | 0 | 5 | 0 |
| good | 0 | 0 | 0 |

### priority/must_have (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.6250 (n=80) [0.5500, 0.7000] | 2000/2000 |
| exact | macro_f1 | 0.4137 (n=80) | — |
| exact | kappa | 0.4595 (n=80) [0.3499, 0.5501] | 2000/2000 |
| exact | linear_weighted_kappa | 0.5918 (n=28) | — |
| collapsed | accuracy | 0.7375 (n=80) | — |
| collapsed | macro_f1 | 0.5643 (n=80) | — |
| collapsed | kappa | 0.5672 (n=80) [0.4268, 0.6821] | 2000/2000 |
| evidence | accuracy | 0.9500 (n=80) | — |
| evidence | macro_f1 | 0.9459 (n=80) | — |
| evidence | kappa | 0.8921 (n=80) | — |
| evidence | precision | 1.0000 (n=80) | — |
| evidence | recall | 0.8710 (n=80) | — |
| evidence | f1 | 0.9310 (n=80) [0.8621, 0.9836] | 2000/2000 |
| fit | accuracy | 0.9500 (n=20) [0.8500, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.9645 (n=20) | — |
| fit | kappa | 0.9078 (n=20) | — |
| fit | coverage_spearman | 0.8343 (n=20) | — |
| fit | known_only_score_spearman | 0.4804 (n=18) | — |

exact confusion (n=80; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 4 | 1 | 0 | 0 | 0 | 0 |
| adequate | 3 | 2 | 4 | 0 | 0 | 0 |
| partial | 0 | 1 | 12 | 1 | 1 | 2 |
| absent | 0 | 0 | 0 | 0 | 17 | 0 |
| unknown | 0 | 0 | 0 | 0 | 32 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 8 | 0 | 0 |
| partial | 1 | 10 | 0 |
| good | 0 | 0 | 1 |

### priority/nice_to_have (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.4333 (n=60) [0.3167, 0.5500] | 2000/2000 |
| exact | macro_f1 | 0.3919 (n=60) | — |
| exact | kappa | 0.2691 (n=60) [0.1355, 0.4141] | 2000/2000 |
| exact | linear_weighted_kappa | 0.4377 (n=33) | — |
| collapsed | accuracy | 0.5833 (n=60) | — |
| collapsed | macro_f1 | 0.3935 (n=60) | — |
| collapsed | kappa | 0.3132 (n=60) [0.1807, 0.4559] | 2000/2000 |
| evidence | accuracy | 0.7833 (n=60) | — |
| evidence | macro_f1 | 0.7758 (n=60) | — |
| evidence | kappa | 0.5548 (n=60) | — |
| evidence | precision | 0.8788 (n=60) | — |
| evidence | recall | 0.7632 (n=60) | — |
| evidence | f1 | 0.8169 (n=60) [0.6792, 0.9143] | 2000/2000 |
| fit | accuracy | 0.9500 (n=20) [0.8500, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.9645 (n=20) | — |
| fit | kappa | 0.9078 (n=20) | — |
| fit | coverage_spearman | 0.8343 (n=20) | — |
| fit | known_only_score_spearman | 0.4804 (n=18) | — |

exact confusion (n=60; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 1 | 1 | 0 | 0 | 0 | 0 |
| adequate | 1 | 5 | 6 | 0 | 1 | 0 |
| partial | 0 | 1 | 14 | 0 | 8 | 0 |
| absent | 0 | 0 | 4 | 0 | 12 | 0 |
| unknown | 0 | 0 | 0 | 0 | 6 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 8 | 0 | 0 |
| partial | 1 | 10 | 0 |
| good | 0 | 0 | 1 |

### Error patterns

Of 33 labelled absent criteria, 29 became unknown. Adequate → partial accounts for 10 errors. The absent/unknown distinction reflects a material v1.1 convention difference; evidence detection ignores that distinction, so its F1 can be high despite exact-level errors.

Known-only score correlation has n=18; 2 pairs have zero known weight and no score. Coverage correlation retains all pairs. Fit errors below identify which classes drive the headline accuracy; the full 3×3 matrix should be read alongside it.

| Label → system | Count |
| --- | --- |
| absent → unknown | 29 |
| adequate → partial | 10 |
| partial → unknown | 9 |
| absent → partial | 4 |
| adequate → strong | 4 |
| strong → adequate | 2 |
| partial → adequate | 2 |
| partial → needs_review | 2 |
| adequate → unknown | 1 |
| partial → absent | 1 |

| JD / criterion | Errors | n |
| --- | --- | --- |
| jd-py-real/education_cs | 10 | 10 |
| jd-hr-real/interpersonal_communication | 8 | 10 |
| jd-hr-real/hr_programs | 8 | 10 |
| jd-py-real/backend_experience | 8 | 10 |
| jd-hr-real/talent_acquisition | 7 | 10 |
| jd-hr-real/hr_experience | 6 | 10 |
| jd-hr-real/education_hr_business | 3 | 10 |
| jd-py-real/communication_collaboration | 3 | 10 |
| jd-hr-real/employee_relations_compliance | 2 | 10 |
| jd-hr-real/hris_office_tools | 2 | 10 |
| jd-py-real/postgresql_database | 2 | 10 |
| jd-py-real/cloud_docker_linux | 2 | 10 |
| jd-py-real/software_architecture | 2 | 10 |
| jd-py-real/python_frameworks | 1 | 10 |

| Pair | Label fit | System fit |
| --- | --- | --- |
| python_dev-h2__jd-hr-real | partial | poor |

Quote-validation level changes: 2 criterion assessments.

## Inter-annotator agreement

Raw overall_fit is used as recorded, not recomputed under v1.1; changes reflect both annotation and guideline differences.

| Comparison | Accuracy | κ | Collapsed κ | Evidence κ | Fit κ |
| --- | --- | --- | --- | --- | --- |
| claude vs gpt | 0.8571 (n=140) | 0.8128 (n=140) | 0.9318 (n=140) | 0.9143 (n=140) | 1.0000 (n=20) |
| claude vs final | 0.9571 (n=140) | 0.9437 (n=140) | 0.9773 (n=140) | 0.9857 (n=140) | 1.0000 (n=20) |
| gpt vs final | 0.8929 (n=140) | 0.8600 (n=140) | 0.9430 (n=140) | 0.9286 (n=140) | 1.0000 (n=20) |

## Limitations

- Silver (LLM) labels are not human ground truth.
- The adjudicator was Claude, the same model family as one annotator; agreement is not independent validation.
- GUIDELINES v1.1 codifies that annotator's absent/poor conventions, potentially favoring its decisions.
- Small n: 10 CVs × 2 JDs (20 pairs, 140 criteria); criteria within a pair are dependent, and the same CV occurs under both JDs.
- expected_group is sampling metadata, not ground truth; it is never used in evaluation.
- Latency was measured on a shared gateway and is not an accuracy measure or a controlled speed comparison.
- Bootstrap resamples CV×JD pairs, as specified, not CVs; cross-JD dependence for the same CV is not preserved. Intervals are descriptive percentile intervals, not a test of run differences.
- Illustrative JD weights and configured rubric values are not calibrated. Fit is a deterministic rule-5 proxy, not a hiring recommendation.
