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
| 20261122T164305Z-heldout-final-flashlow-v2-hedge20-esc-argonmedium | 0.7500 (n=140) [0.6714, 0.8214] | 0.6725 (n=140) [0.5755, 0.7578] | 0.7911 (n=140) [0.6813, 0.8881] | 0.8960 (n=140) [0.8036, 0.9561] | 0.9500 (n=20) [0.8500, 1.0000] |

## 20261122T164305Z-heldout-final-flashlow-v2-hedge20-esc-argonmedium

### all (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.7500 (n=140) [0.6714, 0.8214] | 2000/2000 |
| exact | macro_f1 | 0.7115 (n=140) | — |
| exact | kappa | 0.6725 (n=140) [0.5755, 0.7578] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7979 (n=90) | — |
| collapsed | accuracy | 0.8643 (n=140) | — |
| collapsed | macro_f1 | 0.8596 (n=140) | — |
| collapsed | kappa | 0.7911 (n=140) [0.6813, 0.8881] | 2000/2000 |
| evidence | accuracy | 0.9071 (n=140) | — |
| evidence | macro_f1 | 0.9061 (n=140) | — |
| evidence | kappa | 0.8138 (n=140) | — |
| evidence | precision | 1.0000 (n=140) | — |
| evidence | recall | 0.8116 (n=140) | — |
| evidence | f1 | 0.8960 (n=140) [0.8036, 0.9561] | 2000/2000 |
| fit | accuracy | 0.9500 (n=20) [0.8500, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.9645 (n=20) | — |
| fit | kappa | 0.9078 (n=20) | — |
| fit | coverage_spearman | 0.8054 (n=20) | — |
| fit | known_only_score_spearman | 0.6689 (n=20) | — |

exact confusion (n=140; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 5 | 2 | 0 | 0 | 0 | 0 |
| adequate | 4 | 11 | 6 | 0 | 1 | 0 |
| partial | 0 | 4 | 24 | 3 | 9 | 0 |
| absent | 0 | 0 | 0 | 31 | 2 | 0 |
| unknown | 0 | 0 | 0 | 4 | 34 | 0 |
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
| exact | accuracy | 0.6714 (n=70) [0.5714, 0.7714] | 2000/2000 |
| exact | macro_f1 | 0.6639 (n=70) | — |
| exact | kappa | 0.5764 (n=70) [0.4570, 0.6904] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7807 (n=48) | — |
| collapsed | accuracy | 0.8000 (n=70) | — |
| collapsed | macro_f1 | 0.7775 (n=70) | — |
| collapsed | kappa | 0.6905 (n=70) [0.5260, 0.8531] | 2000/2000 |
| evidence | accuracy | 0.8857 (n=70) | — |
| evidence | macro_f1 | 0.8849 (n=70) | — |
| evidence | kappa | 0.7727 (n=70) | — |
| evidence | precision | 1.0000 (n=70) | — |
| evidence | recall | 0.7778 (n=70) | — |
| evidence | f1 | 0.8750 (n=70) [0.6957, 0.9709] | 2000/2000 |
| fit | accuracy | 0.9000 (n=10) [0.7000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.9221 (n=10) | — |
| fit | kappa | 0.8246 (n=10) | — |
| fit | coverage_spearman | 0.7091 (n=10) | — |
| fit | known_only_score_spearman | 0.6574 (n=10) | — |

exact confusion (n=70; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 4 | 1 | 0 | 0 | 0 | 0 |
| adequate | 2 | 7 | 5 | 0 | 1 | 0 |
| partial | 0 | 1 | 8 | 3 | 4 | 0 |
| absent | 0 | 0 | 0 | 17 | 2 | 0 |
| unknown | 0 | 0 | 0 | 4 | 11 | 0 |
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
| exact | accuracy | 0.8286 (n=70) [0.7286, 0.9143] | 2000/2000 |
| exact | macro_f1 | 0.7232 (n=70) | — |
| exact | kappa | 0.7660 (n=70) [0.6379, 0.8805] | 2000/2000 |
| exact | linear_weighted_kappa | 0.8190 (n=42) | — |
| collapsed | accuracy | 0.9286 (n=70) | — |
| collapsed | macro_f1 | 0.9400 (n=70) | — |
| collapsed | kappa | 0.8884 (n=70) [0.7836, 0.9774] | 2000/2000 |
| evidence | accuracy | 0.9286 (n=70) | — |
| evidence | macro_f1 | 0.9274 (n=70) | — |
| evidence | kappa | 0.8555 (n=70) | — |
| evidence | precision | 1.0000 (n=70) | — |
| evidence | recall | 0.8485 (n=70) | — |
| evidence | f1 | 0.9180 (n=70) [0.8197, 0.9831] | 2000/2000 |
| fit | accuracy | 1.0000 (n=10) [1.0000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 1.0000 (n=10) | — |
| fit | kappa | 1.0000 (n=10) | — |
| fit | coverage_spearman | 0.9009 (n=10) | — |
| fit | known_only_score_spearman | 0.8811 (n=10) | — |

exact confusion (n=70; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 1 | 1 | 0 | 0 | 0 | 0 |
| adequate | 2 | 4 | 1 | 0 | 0 | 0 |
| partial | 0 | 3 | 16 | 0 | 5 | 0 |
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
| exact | accuracy | 0.8375 (n=80) [0.7625, 0.9000] | 2000/2000 |
| exact | macro_f1 | 0.7656 (n=80) | — |
| exact | kappa | 0.7791 (n=80) [0.6879, 0.8578] | 2000/2000 |
| exact | linear_weighted_kappa | 0.8439 (n=46) | — |
| collapsed | accuracy | 0.9250 (n=80) | — |
| collapsed | macro_f1 | 0.9215 (n=80) | — |
| collapsed | kappa | 0.8852 (n=80) [0.7789, 0.9617] | 2000/2000 |
| evidence | accuracy | 0.9625 (n=80) | — |
| evidence | macro_f1 | 0.9597 (n=80) | — |
| evidence | kappa | 0.9196 (n=80) | — |
| evidence | precision | 1.0000 (n=80) | — |
| evidence | recall | 0.9032 (n=80) | — |
| evidence | f1 | 0.9492 (n=80) [0.8718, 1.0000] | 2000/2000 |
| fit | accuracy | 0.9500 (n=20) [0.8500, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.9645 (n=20) | — |
| fit | kappa | 0.9078 (n=20) | — |
| fit | coverage_spearman | 0.8054 (n=20) | — |
| fit | known_only_score_spearman | 0.6689 (n=20) | — |

exact confusion (n=80; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 4 | 1 | 0 | 0 | 0 | 0 |
| adequate | 3 | 4 | 2 | 0 | 0 | 0 |
| partial | 0 | 1 | 13 | 1 | 2 | 0 |
| absent | 0 | 0 | 0 | 17 | 0 | 0 |
| unknown | 0 | 0 | 0 | 3 | 29 | 0 |
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
| exact | accuracy | 0.6333 (n=60) [0.5000, 0.7667] | 2000/2000 |
| exact | macro_f1 | 0.5974 (n=60) | — |
| exact | kappa | 0.5193 (n=60) [0.3619, 0.6826] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7403 (n=44) | — |
| collapsed | accuracy | 0.7833 (n=60) | — |
| collapsed | macro_f1 | 0.7244 (n=60) | — |
| collapsed | kappa | 0.6412 (n=60) [0.4716, 0.8087] | 2000/2000 |
| evidence | accuracy | 0.8333 (n=60) | — |
| evidence | macro_f1 | 0.8316 (n=60) | — |
| evidence | kappa | 0.6725 (n=60) | — |
| evidence | precision | 1.0000 (n=60) | — |
| evidence | recall | 0.7368 (n=60) | — |
| evidence | f1 | 0.8485 (n=60) [0.7271, 0.9383] | 2000/2000 |
| fit | accuracy | 0.9500 (n=20) [0.8500, 1.0000] | 2000/2000 |
| fit | macro_f1 | 0.9645 (n=20) | — |
| fit | kappa | 0.9078 (n=20) | — |
| fit | coverage_spearman | 0.8054 (n=20) | — |
| fit | known_only_score_spearman | 0.6689 (n=20) | — |

exact confusion (n=60; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 1 | 1 | 0 | 0 | 0 | 0 |
| adequate | 1 | 7 | 4 | 0 | 1 | 0 |
| partial | 0 | 3 | 11 | 2 | 7 | 0 |
| absent | 0 | 0 | 0 | 14 | 2 | 0 |
| unknown | 0 | 0 | 0 | 1 | 5 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 8 | 0 | 0 |
| partial | 1 | 10 | 0 |
| good | 0 | 0 | 1 |

### Error patterns

Of 33 labelled absent criteria, 2 became unknown. Adequate → partial accounts for 6 errors. The absent/unknown distinction reflects a material v1.1 convention difference; evidence detection ignores that distinction, so its F1 can be high despite exact-level errors.

Known-only score correlation has n=20; 0 pairs have zero known weight and no score. Coverage correlation retains all pairs. Fit errors below identify which classes drive the headline accuracy; the full 3×3 matrix should be read alongside it.

| Label → system | Count |
| --- | --- |
| partial → unknown | 9 |
| adequate → partial | 6 |
| adequate → strong | 4 |
| partial → adequate | 4 |
| unknown → absent | 4 |
| partial → absent | 3 |
| absent → unknown | 2 |
| strong → adequate | 2 |
| adequate → unknown | 1 |

| JD / criterion | Errors | n |
| --- | --- | --- |
| jd-hr-real/interpersonal_communication | 7 | 10 |
| jd-hr-real/hr_programs | 5 | 10 |
| jd-hr-real/education_hr_business | 4 | 10 |
| jd-hr-real/talent_acquisition | 3 | 10 |
| jd-py-real/communication_collaboration | 3 | 10 |
| jd-hr-real/employee_relations_compliance | 2 | 10 |
| jd-py-real/python_frameworks | 2 | 10 |
| jd-py-real/cloud_docker_linux | 2 | 10 |
| jd-py-real/software_architecture | 2 | 10 |
| jd-hr-real/hr_experience | 1 | 10 |
| jd-hr-real/hris_office_tools | 1 | 10 |
| jd-py-real/postgresql_database | 1 | 10 |
| jd-py-real/backend_experience | 1 | 10 |
| jd-py-real/education_cs | 1 | 10 |

| Pair | Label fit | System fit |
| --- | --- | --- |
| python_dev-h2__jd-hr-real | partial | poor |

Quote-validation level changes: 0 criterion assessments.

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
