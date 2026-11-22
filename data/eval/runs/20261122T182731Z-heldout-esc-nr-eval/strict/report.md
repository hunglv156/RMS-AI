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
| 20261122T182731Z-heldout-final-flashlow-v2-hedge20-esc-nr-argonmedium | 0.7000 (n=140) [0.6214, 0.7786] | 0.6102 (n=140) [0.5133, 0.6997] | 0.7476 (n=140) [0.6419, 0.8445] | 0.8710 (n=140) [0.7778, 0.9425] | 1.0000 (n=20) [1.0000, 1.0000] |

## 20261122T182731Z-heldout-final-flashlow-v2-hedge20-esc-nr-argonmedium

### all (20 CV×JD pairs)

| Family | Metric | Value (n) [95% CI] | Defined bootstrap draws |
| --- | --- | --- | --- |
| exact | accuracy | 0.7000 (n=140) [0.6214, 0.7786] | 2000/2000 |
| exact | macro_f1 | 0.6563 (n=140) | — |
| exact | kappa | 0.6102 (n=140) [0.5133, 0.6997] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7574 (n=87) | — |
| collapsed | accuracy | 0.8357 (n=140) | — |
| collapsed | macro_f1 | 0.8319 (n=140) | — |
| collapsed | kappa | 0.7476 (n=140) [0.6419, 0.8445] | 2000/2000 |
| evidence | accuracy | 0.8857 (n=140) | — |
| evidence | macro_f1 | 0.8842 (n=140) | — |
| evidence | kappa | 0.7707 (n=140) | — |
| evidence | precision | 0.9818 (n=140) | — |
| evidence | recall | 0.7826 (n=140) | — |
| evidence | f1 | 0.8710 (n=140) [0.7778, 0.9425] | 2000/2000 |
| fit | accuracy | 1.0000 (n=20) [1.0000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 1.0000 (n=20) | — |
| fit | kappa | 1.0000 (n=20) | — |
| fit | coverage_spearman | 0.7545 (n=20) | — |
| fit | known_only_score_spearman | 0.8148 (n=20) | — |

exact confusion (n=140; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 4 | 3 | 0 | 0 | 0 | 0 |
| adequate | 4 | 14 | 4 | 0 | 0 | 0 |
| partial | 1 | 7 | 17 | 3 | 12 | 0 |
| absent | 0 | 0 | 0 | 30 | 3 | 0 |
| unknown | 0 | 0 | 1 | 4 | 33 | 0 |
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
| exact | accuracy | 0.6571 (n=70) [0.5857, 0.7286] | 2000/2000 |
| exact | macro_f1 | 0.6320 (n=70) | — |
| exact | kappa | 0.5593 (n=70) [0.4737, 0.6398] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7980 (n=47) | — |
| collapsed | accuracy | 0.7857 (n=70) | — |
| collapsed | macro_f1 | 0.7551 (n=70) | — |
| collapsed | kappa | 0.6648 (n=70) [0.5492, 0.7776] | 2000/2000 |
| evidence | accuracy | 0.8857 (n=70) | — |
| evidence | macro_f1 | 0.8853 (n=70) | — |
| evidence | kappa | 0.7724 (n=70) | — |
| evidence | precision | 0.9667 (n=70) | — |
| evidence | recall | 0.8056 (n=70) | — |
| evidence | f1 | 0.8788 (n=70) [0.7272, 0.9709] | 2000/2000 |
| fit | accuracy | 1.0000 (n=10) [1.0000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 1.0000 (n=10) | — |
| fit | kappa | 1.0000 (n=10) | — |
| fit | coverage_spearman | 0.6541 (n=10) | — |
| fit | known_only_score_spearman | 0.8739 (n=10) | — |

exact confusion (n=70; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 3 | 2 | 0 | 0 | 0 | 0 |
| adequate | 3 | 10 | 2 | 0 | 0 | 0 |
| partial | 0 | 2 | 7 | 2 | 5 | 0 |
| absent | 0 | 0 | 0 | 16 | 3 | 0 |
| unknown | 0 | 0 | 1 | 4 | 10 | 0 |
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
| exact | accuracy | 0.7429 (n=70) [0.6000, 0.8714] | 2000/2000 |
| exact | macro_f1 | 0.6519 (n=70) | — |
| exact | kappa | 0.6535 (n=70) [0.4702, 0.8059] | 2000/2000 |
| exact | linear_weighted_kappa | 0.6950 (n=40) | — |
| collapsed | accuracy | 0.8857 (n=70) | — |
| collapsed | macro_f1 | 0.8985 (n=70) | — |
| collapsed | kappa | 0.8236 (n=70) [0.6537, 0.9524] | 2000/2000 |
| evidence | accuracy | 0.8857 (n=70) | — |
| evidence | macro_f1 | 0.8823 (n=70) | — |
| evidence | kappa | 0.7676 (n=70) | — |
| evidence | precision | 1.0000 (n=70) | — |
| evidence | recall | 0.7576 (n=70) | — |
| evidence | f1 | 0.8621 (n=70) [0.7273, 0.9600] | 2000/2000 |
| fit | accuracy | 1.0000 (n=10) [1.0000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 1.0000 (n=10) | — |
| fit | kappa | 1.0000 (n=10) | — |
| fit | coverage_spearman | 0.8839 (n=10) | — |
| fit | known_only_score_spearman | 0.8757 (n=10) | — |

exact confusion (n=70; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 1 | 1 | 0 | 0 | 0 | 0 |
| adequate | 1 | 4 | 2 | 0 | 0 | 0 |
| partial | 1 | 5 | 10 | 1 | 7 | 0 |
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
| exact | accuracy | 0.7625 (n=80) [0.6625, 0.8625] | 2000/2000 |
| exact | macro_f1 | 0.6914 (n=80) | — |
| exact | kappa | 0.6795 (n=80) [0.5562, 0.7921] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7716 (n=45) | — |
| collapsed | accuracy | 0.8750 (n=80) | — |
| collapsed | macro_f1 | 0.8725 (n=80) | — |
| collapsed | kappa | 0.8101 (n=80) [0.6903, 0.9056] | 2000/2000 |
| evidence | accuracy | 0.9250 (n=80) | — |
| evidence | macro_f1 | 0.9189 (n=80) | — |
| evidence | kappa | 0.8382 (n=80) | — |
| evidence | precision | 0.9630 (n=80) | — |
| evidence | recall | 0.8387 (n=80) | — |
| evidence | f1 | 0.8966 (n=80) [0.7719, 0.9804] | 2000/2000 |
| fit | accuracy | 1.0000 (n=20) [1.0000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 1.0000 (n=20) | — |
| fit | kappa | 1.0000 (n=20) | — |
| fit | coverage_spearman | 0.7545 (n=20) | — |
| fit | known_only_score_spearman | 0.8148 (n=20) | — |

exact confusion (n=80; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 4 | 1 | 0 | 0 | 0 | 0 |
| adequate | 3 | 4 | 2 | 0 | 0 | 0 |
| partial | 1 | 2 | 9 | 2 | 3 | 0 |
| absent | 0 | 0 | 0 | 17 | 0 | 0 |
| unknown | 0 | 0 | 1 | 4 | 27 | 0 |
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
| exact | accuracy | 0.6167 (n=60) [0.4833, 0.7333] | 2000/2000 |
| exact | macro_f1 | 0.5036 (n=60) | — |
| exact | kappa | 0.5098 (n=60) [0.3590, 0.6536] | 2000/2000 |
| exact | linear_weighted_kappa | 0.7342 (n=42) | — |
| collapsed | accuracy | 0.7833 (n=60) | — |
| collapsed | macro_f1 | 0.7384 (n=60) | — |
| collapsed | kappa | 0.6461 (n=60) [0.4947, 0.7879] | 2000/2000 |
| evidence | accuracy | 0.8333 (n=60) | — |
| evidence | macro_f1 | 0.8316 (n=60) | — |
| evidence | kappa | 0.6725 (n=60) | — |
| evidence | precision | 1.0000 (n=60) | — |
| evidence | recall | 0.7368 (n=60) | — |
| evidence | f1 | 0.8485 (n=60) [0.7636, 0.9231] | 2000/2000 |
| fit | accuracy | 1.0000 (n=20) [1.0000, 1.0000] | 2000/2000 |
| fit | macro_f1 | 1.0000 (n=20) | — |
| fit | kappa | 1.0000 (n=20) | — |
| fit | coverage_spearman | 0.7545 (n=20) | — |
| fit | known_only_score_spearman | 0.8148 (n=20) | — |

exact confusion (n=60; labels rows × system columns):

| Label / system | strong | adequate | partial | absent | unknown | needs_review |
| --- | --- | --- | --- | --- | --- | --- |
| strong | 0 | 2 | 0 | 0 | 0 | 0 |
| adequate | 1 | 10 | 2 | 0 | 0 | 0 |
| partial | 0 | 5 | 8 | 1 | 9 | 0 |
| absent | 0 | 0 | 0 | 13 | 3 | 0 |
| unknown | 0 | 0 | 0 | 0 | 6 | 0 |
| needs_review | 0 | 0 | 0 | 0 | 0 | 0 |


fit confusion (n=20; labels rows × system columns):

| Label / system | poor | partial | good |
| --- | --- | --- | --- |
| poor | 8 | 0 | 0 |
| partial | 0 | 11 | 0 |
| good | 0 | 0 | 1 |

### Error patterns

Of 33 labelled absent criteria, 3 became unknown. Adequate → partial accounts for 4 errors. The absent/unknown distinction reflects a material v1.1 convention difference; evidence detection ignores that distinction, so its F1 can be high despite exact-level errors.

Known-only score correlation has n=20; 0 pairs have zero known weight and no score. Coverage correlation retains all pairs. Fit errors below identify which classes drive the headline accuracy; the full 3×3 matrix should be read alongside it.

| Label → system | Count |
| --- | --- |
| partial → unknown | 12 |
| partial → adequate | 7 |
| unknown → absent | 4 |
| adequate → partial | 4 |
| adequate → strong | 4 |
| partial → absent | 3 |
| absent → unknown | 3 |
| strong → adequate | 3 |
| partial → strong | 1 |
| unknown → partial | 1 |

| JD / criterion | Errors | n |
| --- | --- | --- |
| jd-hr-real/hr_programs | 6 | 10 |
| jd-hr-real/interpersonal_communication | 5 | 10 |
| jd-hr-real/employee_relations_compliance | 4 | 10 |
| jd-hr-real/education_hr_business | 4 | 10 |
| jd-py-real/backend_experience | 4 | 10 |
| jd-py-real/communication_collaboration | 4 | 10 |
| jd-hr-real/talent_acquisition | 3 | 10 |
| jd-py-real/python_frameworks | 3 | 10 |
| jd-py-real/software_architecture | 3 | 10 |
| jd-py-real/postgresql_database | 2 | 10 |
| jd-hr-real/hr_experience | 1 | 10 |
| jd-hr-real/hris_office_tools | 1 | 10 |
| jd-py-real/cloud_docker_linux | 1 | 10 |
| jd-py-real/education_cs | 1 | 10 |

| Pair | Label fit | System fit |
| --- | --- | --- |

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
