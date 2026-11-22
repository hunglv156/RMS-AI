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
| 20261122T122041Z-heldout-final-flashlow-v2-hedge20 | 0.6857 (n=140) [0.5857, 0.7857] | 0.5874 (n=140) [0.4573, 0.7104] | 0.6983 (n=140) [0.5591, 0.8223] | 0.8480 (n=140) [0.7573, 0.9242] | 1.0000 (n=20) [1.0000, 1.0000] |
| 20261122T122041Z-heldout-baseline-flashhigh-v1 | 0.6143 (n=140) [0.5429, 0.6857] | 0.4594 (n=140) [0.3564, 0.5523] | 0.5871 (n=140) [0.4536, 0.6975] | 0.8855 (n=140) [0.7850, 0.9489] | 0.9500 (n=20) [0.8500, 1.0000] |

## 20261122T122041Z-heldout-final-flashlow-v2-hedge20

### all (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.6857 (n=140) [0.5857, 0.7857] | 2000/2000 |
| exact | macro_f1 | 0.5544 (n=140) | — |
| exact | kappa | 0.5874 (n=140) [0.4573, 0.7104] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7076 (n=79) | — |
| collapsed | accuracy | 0.8071 (n=140) | — |
| collapsed | macro_f1 | 0.7936 (n=140) | — |
| collapsed | kappa | 0.6983 (n=140) [0.5591, 0.8223] | 2000/2000 |
| evidence | accuracy | 0.8643 (n=140) | — |
| evidence | macro_f1 | 0.8627 (n=140) | — |
| evidence | kappa | 0.7295 (n=140) | — |
| evidence | precision | 0.9815 (n=140) | — |
| evidence | recall | 0.7465 (n=140) | — |
| evidence | f1 | 0.8480 (n=140) [0.7573, 0.9242] | 2000/2000 |
| fit | accuracy | 1.0000 (n=20) [1.0000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 1.0000 (n=20) | — |
| fit | kappa | 1.0000 (n=20) | — |
| fit | coverage_spearman | 0.7484 (n=20) | — |
| fit | known_only_score_spearman | 0.8211 (n=20) | — |

exact confusion (n=140; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 5 | 2 | 0 | 0 | 0 | 0 |
| adequate | 2 | 17 | 6 | 0 | 0 | 0 |
| partial | 2 | 5 | 14 | 6 | 11 | 1 |
| absent | 0 | 0 | 0 | 20 | 1 | 0 |
| unknown | 0 | 0 | 1 | 7 | 40 | 0 |
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
| exact | accuracy | 0.6857 (n=70) [0.5571, 0.8143] | 2000/2000 |
| exact | macro_f1 | 0.6859 (n=70) | — |
| exact | kappa | 0.5916 (n=70) [0.4010, 0.7556] | 2000/2000 |
| exact | linear_weighted_kappa | 0.8134 (n=39) | — |
| collapsed | accuracy | 0.7714 (n=70) | — |
| collapsed | macro_f1 | 0.7342 (n=70) | — |
| collapsed | kappa | 0.6378 (n=70) [0.4427, 0.8085] | 2000/2000 |
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
| absent | 0 | 0 | 0 | 8 | 1 | 0 |
| unknown | 0 | 0 | 1 | 7 | 17 | 0 |
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
| exact | accuracy | 0.6857 (n=70) [0.5143, 0.8286] | 2000/2000 |
| exact | macro_f1 | 0.5128 (n=70) | — |
| exact | kappa | 0.5832 (n=70) [0.3833, 0.7423] | 2000/2000 |
| exact | linear_weighted_kappa | 0.5823 (n=40) | — |
| collapsed | accuracy | 0.8429 (n=70) | — |
| collapsed | macro_f1 | 0.8462 (n=70) | — |
| collapsed | kappa | 0.7577 (n=70) [0.5554, 0.9118] | 2000/2000 |
| evidence | accuracy | 0.8429 (n=70) | — |
| evidence | macro_f1 | 0.8389 (n=70) | — |
| evidence | kappa | 0.6857 (n=70) | — |
| evidence | precision | 1.0000 (n=70) | — |
| evidence | recall | 0.6857 (n=70) | — |
| evidence | f1 | 0.8136 (n=70) [0.7083, 0.9231] | 2000/2000 |
| fit | accuracy | 1.0000 (n=10) [1.0000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 1.0000 (n=10) | — |
| fit | kappa | 1.0000 (n=10) | — |
| fit | coverage_spearman | 0.8980 (n=10) | — |
| fit | known_only_score_spearman | 0.8811 (n=10) | — |

exact confusion (n=70; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 1 | 1 | 0 | 0 | 0 | 0 |
| adequate | 0 | 6 | 4 | 0 | 0 | 0 |
| partial | 2 | 4 | 6 | 4 | 6 | 1 |
| absent | 0 | 0 | 0 | 12 | 0 | 0 |
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
| exact | accuracy | 0.7750 (n=80) [0.6625, 0.8750] | 2000/2000 |
| exact | macro_f1 | 0.6322 (n=80) | — |
| exact | kappa | 0.6901 (n=80) [0.5474, 0.8219] | 2000/2000 |
| exact | linear_weighted_kappa | 0.8020 (n=39) | — |
| collapsed | accuracy | 0.8250 (n=80) | — |
| collapsed | macro_f1 | 0.8098 (n=80) | — |
| collapsed | kappa | 0.7278 (n=80) [0.5896, 0.8464] | 2000/2000 |
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
| absent | 0 | 0 | 0 | 12 | 0 | 0 |
| unknown | 0 | 0 | 1 | 6 | 30 | 0 |
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
| exact | accuracy | 0.5667 (n=60) [0.4167, 0.7000] | 2000/2000 |
| exact | macro_f1 | 0.5546 (n=60) | — |
| exact | kappa | 0.4419 (n=60) [0.2696, 0.6082] | 2000/2000 |
| exact | linear_weighted_kappa | 0.5908 (n=40) | — |
| collapsed | accuracy | 0.7833 (n=60) | — |
| collapsed | macro_f1 | 0.7564 (n=60) | — |
| collapsed | kappa | 0.6326 (n=60) [0.4488, 0.8025] | 2000/2000 |
| evidence | accuracy | 0.8167 (n=60) | — |
| evidence | macro_f1 | 0.8124 (n=60) | — |
| evidence | kappa | 0.6374 (n=60) | — |
| evidence | precision | 1.0000 (n=60) | — |
| evidence | recall | 0.7250 (n=60) | — |
| evidence | f1 | 0.8406 (n=60) [0.7457, 0.9143] | 2000/2000 |
| fit | accuracy | 1.0000 (n=20) [1.0000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 1.0000 (n=20) | — |
| fit | kappa | 1.0000 (n=20) | — |
| fit | coverage_spearman | 0.7484 (n=20) | — |
| fit | known_only_score_spearman | 0.8211 (n=20) | — |

exact confusion (n=60; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 1 | 1 | 0 | 0 | 0 | 0 |
| adequate | 2 | 9 | 5 | 0 | 0 | 0 |
| partial | 0 | 5 | 6 | 3 | 8 | 0 |
| absent | 0 | 0 | 0 | 8 | 1 | 0 |
| unknown | 0 | 0 | 0 | 1 | 10 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 8 | 0 | 0 |
| partial | 0 | 11 | 0 |
| good | 0 | 0 | 1 |

### Error patterns

Of 21 labelled absent criteria, 1 became unknown. Adequate → partial accounts for 6 errors. The absent/unknown distinction reflects a material v1.1 convention difference; evidence detection ignores that distinction, so its F1 can be high despite exact-level errors.

Known-only score correlation has n=20; 0 pairs have zero known weight and no score. Coverage correlation retains all pairs. Fit errors below identify which classes drive the headline accuracy; the full 3×3 matrix should be read alongside it.

| Label → system | Count |
| --- | --- |
| partial → unknown | 11 |
| unknown → absent | 7 |
| adequate → partial | 6 |
| partial → absent | 6 |
| partial → adequate | 5 |
| adequate → strong | 2 |
| partial → strong | 2 |
| strong → adequate | 2 |
| absent → unknown | 1 |
| partial → needs_review | 1 |
| unknown → partial | 1 |

| JD / criterion | Errors | n |
| --- | --- | --- |
| jd-py-real/communication_collaboration | 7 | 10 |
| jd-hr-real/talent_acquisition | 6 | 10 |
| jd-hr-real/interpersonal_communication | 5 | 10 |
| jd-hr-real/education_hr_business | 4 | 10 |
| jd-hr-real/hr_programs | 4 | 10 |
| jd-py-real/backend_experience | 4 | 10 |
| jd-py-real/software_architecture | 3 | 10 |
| jd-py-real/education_cs | 3 | 10 |
| jd-py-real/postgresql_database | 2 | 10 |
| jd-py-real/cloud_docker_linux | 2 | 10 |
| jd-hr-real/hr_experience | 1 | 10 |
| jd-hr-real/employee_relations_compliance | 1 | 10 |
| jd-hr-real/hris_office_tools | 1 | 10 |
| jd-py-real/python_frameworks | 1 | 10 |

| Pair | Label fit | System fit |
| --- | --- | --- |

Quote-validation level changes: 1 criterion assessments.


## 20261122T122041Z-heldout-baseline-flashhigh-v1

### all (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.6143 (n=140) [0.5429, 0.6857] | 2000/2000 |
| exact | macro_f1 | 0.4067 (n=140) | — |
| exact | kappa | 0.4594 (n=140) [0.3564, 0.5523] | 2000/2000 |
| exact | linear_weighted_kappa | 0.5127 (n=61) | — |
| collapsed | accuracy | 0.7571 (n=140) | — |
| collapsed | macro_f1 | 0.5471 (n=140) | — |
| collapsed | kappa | 0.5871 (n=140) [0.4536, 0.6975] | 2000/2000 |
| evidence | accuracy | 0.8929 (n=140) | — |
| evidence | macro_f1 | 0.8924 (n=140) | — |
| evidence | kappa | 0.7862 (n=140) | — |
| evidence | precision | 0.9667 (n=140) | — |
| evidence | recall | 0.8169 (n=140) | — |
| evidence | f1 | 0.8855 (n=140) [0.7850, 0.9489] | 2000/2000 |
| fit | accuracy | 0.9500 (n=20) [0.8500, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.9645 (n=20) | — |
| fit | kappa | 0.9078 (n=20) | — |
| fit | coverage_spearman | 0.8343 (n=20) | — |
| fit | known_only_score_spearman | 0.4804 (n=18) | — |

exact confusion (n=140; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 5 | 2 | 0 | 0 | 0 | 0 |
| adequate | 4 | 7 | 12 | 0 | 2 | 0 |
| partial | 0 | 2 | 26 | 1 | 8 | 2 |
| absent | 0 | 0 | 2 | 0 | 19 | 0 |
| unknown | 0 | 0 | 0 | 0 | 48 | 0 |
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
| exact | accuracy | 0.6286 (n=70) [0.5143, 0.7143] | 2000/2000 |
| exact | macro_f1 | 0.4128 (n=70) | — |
| exact | kappa | 0.4824 (n=70) [0.3061, 0.6099] | 2000/2000 |
| exact | linear_weighted_kappa | 0.5327 (n=31) | — |
| collapsed | accuracy | 0.7857 (n=70) | — |
| collapsed | macro_f1 | 0.5589 (n=70) | — |
| collapsed | kappa | 0.6262 (n=70) [0.3963, 0.8071] | 2000/2000 |
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
| absent | 0 | 0 | 1 | 0 | 8 | 0 |
| unknown | 0 | 0 | 0 | 0 | 25 | 0 |
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
| exact | macro_f1 | 0.3960 (n=70) | — |
| exact | kappa | 0.4335 (n=70) [0.3054, 0.5399] | 2000/2000 |
| exact | linear_weighted_kappa | 0.4643 (n=30) | — |
| collapsed | accuracy | 0.7286 (n=70) | — |
| collapsed | macro_f1 | 0.5351 (n=70) | — |
| collapsed | kappa | 0.5496 (n=70) [0.4032, 0.6614] | 2000/2000 |
| evidence | accuracy | 0.8857 (n=70) | — |
| evidence | macro_f1 | 0.8849 (n=70) | — |
| evidence | kappa | 0.7714 (n=70) | — |
| evidence | precision | 0.9655 (n=70) | — |
| evidence | recall | 0.8000 (n=70) | — |
| evidence | f1 | 0.8750 (n=70) [0.7777, 0.9412] | 2000/2000 |
| fit | accuracy | 1.0000 (n=10) [1.0000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 1.0000 (n=10) | — |
| fit | kappa | 1.0000 (n=10) | — |
| fit | coverage_spearman | 0.8839 (n=10) | — |
| fit | known_only_score_spearman | 0.7589 (n=9) | — |

exact confusion (n=70; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 2 | 0 | 0 | 0 | 0 | 0 |
| adequate | 2 | 2 | 5 | 0 | 1 | 0 |
| partial | 0 | 2 | 15 | 1 | 4 | 1 |
| absent | 0 | 0 | 1 | 0 | 11 | 0 |
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
| exact | accuracy | 0.6875 (n=80) [0.6125, 0.7500] | 2000/2000 |
| exact | macro_f1 | 0.4254 (n=80) | — |
| exact | kappa | 0.5232 (n=80) [0.4185, 0.6040] | 2000/2000 |
| exact | linear_weighted_kappa | 0.5918 (n=28) | — |
| collapsed | accuracy | 0.8000 (n=80) | — |
| collapsed | macro_f1 | 0.5875 (n=80) | — |
| collapsed | kappa | 0.6471 (n=80) [0.5122, 0.7393] | 2000/2000 |
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
| absent | 0 | 0 | 0 | 0 | 12 | 0 |
| unknown | 0 | 0 | 0 | 0 | 37 | 0 |
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
| exact | accuracy | 0.5167 (n=60) [0.3833, 0.6500] | 2000/2000 |
| exact | macro_f1 | 0.4245 (n=60) | — |
| exact | kappa | 0.3456 (n=60) [0.1775, 0.5173] | 2000/2000 |
| exact | linear_weighted_kappa | 0.4099 (n=33) | — |
| collapsed | accuracy | 0.7000 (n=60) | — |
| collapsed | macro_f1 | 0.4761 (n=60) | — |
| collapsed | kappa | 0.4554 (n=60) [0.2791, 0.6348] | 2000/2000 |
| evidence | accuracy | 0.8167 (n=60) | — |
| evidence | macro_f1 | 0.8076 (n=60) | — |
| evidence | kappa | 0.6207 (n=60) | — |
| evidence | precision | 0.9394 (n=60) | — |
| evidence | recall | 0.7750 (n=60) | — |
| evidence | f1 | 0.8493 (n=60) [0.7142, 0.9412] | 2000/2000 |
| fit | accuracy | 0.9500 (n=20) [0.8500, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.9645 (n=20) | — |
| fit | kappa | 0.9078 (n=20) | — |
| fit | coverage_spearman | 0.8343 (n=20) | — |
| fit | known_only_score_spearman | 0.4804 (n=18) | — |

exact confusion (n=60; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 1 | 1 | 0 | 0 | 0 | 0 |
| adequate | 1 | 5 | 8 | 0 | 2 | 0 |
| partial | 0 | 1 | 14 | 0 | 7 | 0 |
| absent | 0 | 0 | 2 | 0 | 7 | 0 |
| unknown | 0 | 0 | 0 | 0 | 11 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 8 | 0 | 0 |
| partial | 1 | 10 | 0 |
| good | 0 | 0 | 1 |

### Error patterns

Of 21 labelled absent criteria, 19 became unknown. Adequate → partial accounts for 12 errors. The absent/unknown distinction reflects a material v1.1 convention difference; evidence detection ignores that distinction, so its F1 can be high despite exact-level errors.

Known-only score correlation has n=18; 2 pairs have zero known weight and no score. Coverage correlation retains all pairs. Fit errors below identify which classes drive the headline accuracy; the full 3×3 matrix should be read alongside it.

| Label → system | Count |
| --- | --- |
| absent → unknown | 19 |
| adequate → partial | 12 |
| partial → unknown | 8 |
| adequate → strong | 4 |
| absent → partial | 2 |
| strong → adequate | 2 |
| adequate → unknown | 2 |
| partial → adequate | 2 |
| partial → needs_review | 2 |
| partial → absent | 1 |

| JD / criterion | Errors | n |
| --- | --- | --- |
| jd-hr-real/interpersonal_communication | 8 | 10 |
| jd-py-real/backend_experience | 8 | 10 |
| jd-py-real/education_cs | 8 | 10 |
| jd-hr-real/hr_experience | 6 | 10 |
| jd-py-real/communication_collaboration | 5 | 10 |
| jd-hr-real/education_hr_business | 3 | 10 |
| jd-hr-real/hr_programs | 3 | 10 |
| jd-hr-real/talent_acquisition | 2 | 10 |
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
| claude vs final | 0.8500 (n=140) | 0.8032 (n=140) | 0.8401 (n=140) | 0.9572 (n=140) | 1.0000 (n=20) |
| gpt vs final | 0.7857 (n=140) | 0.7206 (n=140) | 0.8047 (n=140) | 0.9000 (n=140) | 1.0000 (n=20) |

## Limitations

- Silver (LLM) labels are not human ground truth.
- The adjudicator was Claude, the same model family as one annotator; agreement is not independent validation.
- GUIDELINES v1.1 codifies that annotator's absent/poor conventions, potentially favoring its decisions.
- Small n: 10 CVs × 2 JDs (20 pairs, 140 criteria); criteria within a pair are dependent, and the same CV occurs under both JDs.
- expected_group is sampling metadata, not ground truth; it is never used in evaluation.
- Latency was measured on a shared gateway and is not an accuracy measure or a controlled speed comparison.
- Bootstrap resamples CV×JD pairs, as specified, not CVs; cross-JD dependence for the same CV is not preserved. Intervals are descriptive percentile intervals, not a test of run differences.
- Illustrative JD weights and configured rubric values are not calibrated. Fit is a deterministic rule-5 proxy, not a hiring recommendation.
