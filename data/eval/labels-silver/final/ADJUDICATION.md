# Adjudication of silver labels — GUIDELINES v1.1

- Labeler: `adjudicated-v1.1`, date: 2026-11-22.
- Inputs: `data/eval/GUIDELINES.md` (v1 + section "v1.1 clarifications (2026-11-22)"), `jd-py-real`, `jd-hr-real`, `data/eval/set-10x2.yaml` → `data/eval/text/<sha>.txt`, and the two independent silver label sets in `data/eval/labels-silver/` (unchanged).
- Output: 20 files in this folder, same structure as the templates in `data/eval/labels/`.

## Method

1. Pairs were processed one at a time: read the full CV text, then the two prior labels side by side, then wrote and validated the final file before moving on.
2. The two prior labels were shown as "Annotator 1" and "Annotator 2" in a per-pair random order (seeded with the SHA-256 of the pair name), with labeler names and overall_fit sources hidden from the comparison. Neither source was preferred; the source identities are not recorded here.
3. Each criterion:
   - **[agree]**: both annotators chose the same level and at least one of their quotes supports it under v1.1 → that level kept. Evidence = the supporting quotes, verbatim, deduplicated (where one quote was a truncated or split copy of another, the full line was kept). A quote that did not support the criterion was dropped, and the note says so (9 criteria: database-01__jd-hr-real / hris_office_tools, devops-01__jd-py-real / software_architecture, finance-01__jd-hr-real / hr_experience, finance-01__jd-hr-real / interpersonal_communication, finance-01__jd-py-real / communication_collaboration, python_dev-01__jd-py-real / python_frameworks, python_dev-01__jd-py-real / education_cs, python_dev-02__jd-hr-real / hr_experience, python_dev-02__jd-hr-real / interpersonal_communication).
   - **[adjudicated]**: the annotators chose different levels → re-judged from the CV text under v1.1. The final level may match either annotator or neither. The reason is in the note. In this set, every agreed level also stood up under v1.1 (including the rule-4 check on every agreed `strong`), so the adjudicated criteria are exactly the disagreements.
4. `overall_fit` was recomputed for all 20 pairs with rule 5 from the final levels of the `must_have` criteria. It is not a judgement call.
5. `expected_group` was not used. `data/eval/runs/`, `apps/`, `.orca/`, `.lewis/` and `docs/` were not opened.

### How v1.1 was applied (scope decisions)

- **Rule 1 (experience)** was applied to criteria about tenure in a role: `backend_experience` and `hr_experience`. If a dated history exists and no listed role is relevant → `absent`, with the role headings (and their dates) as evidence. If some listed role is relevant but does not meet the requirement (e.g. DBA/Programmer Analyst for backend; a Python programmer for 3 of the 7 required years; a non-HR role with payroll and recruiting duties) → `partial`, not `absent`.
- **Rule 3 (skills/activities)** also covers activity criteria that can be done outside an HR role: `talent_acquisition`, `employee_relations_compliance`, `hr_programs`. If not mentioned → `unknown`, even when the dated history has no HR roles. Training team members or clients is not counted as an HR program.
- **Rule 2 (education)**: a stated degree in a non-matching field → `absent`. A degree in an adjacent field that partly matches (Electronics & Communication Engineering for the CS criterion) → `partial`. If the relevant degree's field is not stated (a "Bachelor of Science" with no field) → `unknown`. For the HR JD, a related-field bachelor's, or a master's in a business-related field, counts as `adequate`.
- **Rule 4 (`strong`)** was checked on every `strong` and on every disagreement involving `strong`. Tenure alone, a self-description or a list of duties → `adequate`. Numbers, scale (headcount, worldwide executive audience, 75+ hires) or clear ownership of a deliverable or implementation → `strong`.
- **Communication criteria**: generic or client/sales communication → `partial`. Explaining specialist or technical matters to non-specialists (managers, end users, clinical staff, students) → `adequate`. `strong` only with concrete scale.

## Counts

- Criteria labelled: 140 (20 pairs × 7 criteria).
- **[agree]: 99** · **[adjudicated]: 41**.

## Adjudicated criteria

| Pair | Criterion | Annotator 1 | Annotator 2 | Final | Reason |
|---|---|---|---|---|---|
| database-01__jd-hr-real | hr_experience | unknown | absent | **absent** | v1.1 rule 1: dated work history (2002-current) lists only IT, programming and database roles, none in HR, so absent. |
| database-01__jd-hr-real | hr_programs | partial | unknown | **unknown** | Training and mentoring new report-writing staff is team supervision, not an HR program or initiative; HR programs are not mentioned, so unknown (v1.1 rule 3 treats this activity criterion as not mentioned). |
| database-01__jd-py-real | backend_experience | partial | absent | **partial** | Dated history includes Programmer Analyst/DBA (2006-current) and Computer Programmer roles with database and programming work, which are relevant to backend engineering, so v1.1 rule 1 absent does not apply; but no role is a backend software engineer and seven years of backend engineering is not shown, so partial. |
| database-01__jd-py-real | communication_collaboration | partial | adequate | **adequate** | Bridging IT and clinical (non-technical) staff and end-user training show explaining technical matters to non-technical colleagues; no concrete scope, so adequate. |
| designer-01__jd-hr-real | hr_experience | unknown | absent | **absent** | v1.1 rule 1: dated work history (2009-current) lists only design, merchandising and sales roles, none in HR, so absent. |
| designer-01__jd-hr-real | education_hr_business | unknown | absent | **absent** | v1.1 rule 2: the stated degree is in Interior Design, not HR, business administration or a related field, so absent. |
| designer-01__jd-py-real | backend_experience | absent | unknown | **absent** | v1.1 rule 1: dated work history (2009-current) lists only design, merchandising and sales roles, none backend engineering, so absent. |
| designer-01__jd-py-real | communication_collaboration | partial | unknown | **partial** | Client-facing communication is evidenced, but nothing shows presenting or explaining complex ideas to non-technical colleagues, so partial. |
| designer-01__jd-py-real | education_cs | absent | unknown | **absent** | v1.1 rule 2: a stated degree in Interior Design does not match computer science or software engineering, so absent. |
| devops-01__jd-hr-real | hr_experience | unknown | absent | **absent** | v1.1 rule 1: dated work history (2010-current) lists only software and DevOps engineering roles, none in HR, so absent. |
| devops-01__jd-hr-real | interpersonal_communication | adequate | partial | **adequate** | Communication with developers, end users, project managers and business analysts plus written guides for the deployment team show written/verbal communication across roles; confidential handling is not described and no concrete scope, so adequate (consistent with similar self-described plus role-backed evidence elsewhere). |
| devops-01__jd-hr-real | education_hr_business | unknown | absent | **absent** | v1.1 rule 2: the stated bachelor degree is in Electronics & Communication Engineering, not HR, business administration or a related field, so absent. |
| devops-01__jd-py-real | communication_collaboration | adequate | partial | **adequate** | Reviewing requirements with end users, project managers and business analysts and translating business requirements into specifications show communicating technical matters with non-technical colleagues; no concrete scope, so adequate. |
| devops-01__jd-py-real | education_cs | unknown | partial | **partial** | A degree is stated, so unknown does not apply (v1.1 rule 2). Electronics & Communication Engineering is an adjacent engineering field, not computer science or software engineering training, so it partly but not fully matches; partial. |
| finance-01__jd-py-real | backend_experience | absent | unknown | **absent** | v1.1 rule 1: dated work history (2004-2010, 2012-present) lists only finance and school-management roles, none backend engineering, so absent. Text is page 1 only. |
| hr-01__jd-hr-real | hr_experience | adequate | strong | **adequate** | Dated HR Specialist role since 10/2016 and a stated 6 years meet the 3+ year requirement with broad HR duties, but v1.1 rule 4: no concrete scope or results (scale, numbers of employees, ownership) and only one HR role (progression not shown), so adequate. Summary contains unfilled template placeholders. |
| hr-01__jd-hr-real | employee_relations_compliance | adequate | strong | **adequate** | HR compliance reporting, policy procedures, performance/personnel issues and employee complaints are clearly evidenced, but v1.1 rule 4: no concrete scope or results, so adequate. |
| hr-01__jd-hr-real | interpersonal_communication | adequate | strong | **adequate** | Written and verbal communication with management and staff and handling of sensitive screening paperwork are evidenced, but v1.1 rule 4: no concrete scope or results, so adequate. |
| hr-01__jd-hr-real | education_hr_business | absent | unknown | **absent** | v1.1 rule 2: the stated degree is an associate degree in English (plus Real Estate study), not HR, business administration or a related field, so absent. |
| hr-01__jd-py-real | backend_experience | absent | unknown | **absent** | v1.1 rule 1: dated work history (1984-current) lists HR, supervisory and secretarial roles, none backend engineering, so absent. |
| hr-01__jd-py-real | education_cs | absent | unknown | **absent** | v1.1 rule 2: the stated degree is an associate degree in English (plus Real Estate study), not computer science or software engineering, so absent. |
| hr-02__jd-py-real | backend_experience | absent | unknown | **absent** | v1.1 rule 1: dated work history (2002-current) lists only HR leadership and staff-director roles, none backend engineering, so absent. |
| hr-02__jd-py-real | communication_collaboration | adequate | strong | **adequate** | Conveying statistical trends to management teams and delivering training show explaining complex ideas to non-specialists, but v1.1 rule 4: no concrete scope or results in the quotes, so adequate. |
| hr-02__jd-py-real | education_cs | absent | unknown | **absent** | v1.1 rule 2: stated degrees are in psychology, I/O psychology and Chicano Studies, not computer science or software engineering, so absent. |
| hr-03__jd-hr-real | hr_experience | strong | adequate | **adequate** | HR leadership since 01/2019 (team of 5) covers compensation, benefits, onboarding, training and compliance across business divisions, but the 3+ year tenure depends on an unstated CV date (education 08/2021 implies at least ~2.6 years) and earlier roles are production, not HR, so progression in HR is not shown; adequate. |
| hr-03__jd-hr-real | employee_relations_compliance | strong | adequate | **adequate** | EEOC/OSHA compliance knowledge, policy enforcement guidance and annual performance evaluation are clear, but v1.1 rule 4: no concrete scope or results in the quotes, so adequate. |
| hr-03__jd-hr-real | hr_programs | strong | adequate | **strong** | Coordinated onboarding for over 75 new employees, instituted a safety training program with a stated result (reduced workers comp claims) and directed benefit programs; scale and ownership satisfy v1.1 rule 4. No internship/early-career program (preferred only). |
| hr-03__jd-py-real | backend_experience | absent | unknown | **absent** | v1.1 rule 1: dated work history (2010-current) lists HR and production roles, none backend engineering, so absent. |
| hr-03__jd-py-real | communication_collaboration | partial | adequate | **adequate** | Educating management on legal/compliance policy is explaining specialist ideas to non-specialist colleagues, plus cross-division communication; not technical, no concrete scope, so adequate (consistent with conveying statistical trends to managers elsewhere). |
| hr-03__jd-py-real | education_cs | absent | unknown | **absent** | v1.1 rule 2: the stated degree is an associate in Management, not computer science or software engineering, so absent. |
| python_dev-01__jd-hr-real | hr_experience | unknown | absent | **absent** | v1.1 rule 1: dated work history (2016-current) lists only software developer roles, none in HR, so absent. |
| python_dev-01__jd-py-real | cloud_docker_linux | adequate | strong | **adequate** | Practical Docker, AWS (ECS, EC2), Linux and Bash work is explicit, but RDS appears only in the skills list, CloudFront is not mentioned, and v1.1 rule 4: no concrete scale or results in the quotes, so adequate. |
| python_dev-02__jd-hr-real | hr_programs | partial | adequate | **partial** | New-hire training procedures were developed within a contractor security-management role; this overlaps onboarding but is security training rather than an HR program or initiative, so partial. |
| python_dev-02__jd-py-real | backend_experience | absent | unknown | **absent** | v1.1 rule 1: dated work history (1992-2015) lists military, logistics, security and courseware roles, none backend engineering, so absent. |
| python_dev-02__jd-py-real | education_cs | absent | unknown | **absent** | v1.1 rule 2: stated degrees are in Professional Aeronautics, Operations Management and Aircrew Operations (OCR-garbled but legible), not computer science or software engineering, so absent. |
| python_dev-03__jd-hr-real | hr_experience | unknown | absent | **absent** | v1.1 rule 1: dated work history (2004-present) lists only Python programmer roles, none in HR, so absent. |
| python_dev-03__jd-hr-real | education_hr_business | unknown | absent | **absent** | v1.1 rule 2: the stated bachelor degree is in Computer Science, not HR, business administration or a related field, so absent. |
| python_dev-03__jd-hr-real | hr_programs | partial | unknown | **unknown** | Training on-site Python programmers at client companies is technical advocacy, not an HR program or initiative; HR programs are not mentioned, so unknown (activity criterion, v1.1 rule 3). |
| python_dev-03__jd-py-real | python_frameworks | partial | adequate | **adequate** | Dated Python Programmer roles since 2004 with Python development work and Django use clearly meet the Python/framework requirement; descriptions are vague and complex data processing is not shown, so adequate rather than strong (v1.1 rule 4). |
| python_dev-03__jd-py-real | backend_experience | unknown | partial | **partial** | A dated history exists, so unknown does not apply; the 2004-2007 Python Programmer role is relevant development work, so v1.1 rule 1 absent does not apply either. The 2007-present role is Python advocacy and training, so about three years of hands-on development is shown, not seven years of backend engineering; partial. |
| python_dev-03__jd-py-real | communication_collaboration | partial | strong | **adequate** | Conference talks, guest lectures to students and beginner curricula for the average user show explaining technical ideas to non-experts, but v1.1 rule 4: no concrete scale or results (audience size, number of talks), so adequate. |

## Final distributions

Level (all 140 criteria): strong 8 / adequate 29 / partial 25 / absent 20 / unknown 58 / needs_review 0

- jd-py-real (70): strong 1 / adequate 13 / partial 13 / absent 11 / unknown 32 / needs_review 0
- jd-hr-real (70): strong 7 / adequate 16 / partial 12 / absent 9 / unknown 26 / needs_review 0

overall_fit (20 pairs): good 2 / partial 8 / poor 10

- jd-py-real (10): good 0 / partial 4 / poor 6
- jd-hr-real (10): good 2 / partial 4 / poor 4

## Validation

A script outside the repo checked every file: YAML parses; top-level keys match the template; criteria keys follow JD order; levels and fits use allowed values; every level other than `unknown`/`needs_review` has ≥1 quote; every quote is a verbatim substring of the CV text, and `text[start_offset:end_offset] == quote`; `labeler`/`labeled_at` are correct; every note starts with `[agree]` or `[adjudicated]`; `overall_fit` equals rule 5 applied to the final levels. Result: 20 files, 0 failing.
