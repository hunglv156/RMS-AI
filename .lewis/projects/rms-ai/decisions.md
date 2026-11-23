---
updated: 2026-11-21
---

# Decisions

Record accepted coordination choices and links to shared product/architecture
decisions. Keep business rules and architecture decisions in the project's
shared sources, accessible without Chief activation; do not copy them here.
Do not rewrite an accepted decision silently; append a superseding decision
and link the old entry.

| ID | Date | Status | Decision | Authority | Supersedes |
| --- | --- | --- | --- | --- | --- |
| D1 | 2026-11-21 | accepted | LLM = Gemini API `gemini-3.8-flash-high`; Qwen3 14B dropped entirely (no baseline) | Dylan | README §3.1 (Qwen3 via Ollama) |
| D2 | 2026-11-21 | accepted | Dataset = Kaggle only, reduced test set; Hugging Face D1 dropped | Dylan | thesis §4.1.1 D1 |
| D3 | 2026-11-21 | accepted | English first; Vietnamese deferred | Dylan | — |
| D4 | 2026-11-21 | accepted | Rebuild code from scratch; do not restore `apps/` from git history | Dylan | — |
| D5 | 2026-11-21 | accepted | API usage unrestricted (Dylan has access) | Dylan | — |
| D6 | 2026-11-21 | accepted | First experiment run uses 10 CV × 2 JD from the Kaggle eval set | Dylan | thesis §4.1.2 (20 × 2) |
| D7 | 2026-11-21 | accepted | Order M0→M1→M2→M3 first; SaaS platform (M4) decided after M3 | Dylan ("làm theo đề xuất") | — |
| D8 | 2026-11-21 | accepted | Translate JD-A/JD-B criteria to English; rewrite data/eval/GUIDELINES.md | Dylan ("làm theo đề xuất") | — |
| D9 | 2026-11-21 | accepted | Lewis may create worker branches/worktrees and merge reviewed work into main; ask Dylan before other commits/push | Dylan ("làm theo đề xuất") | — |
| D10 | 2026-11-21 | accepted | JD-B `labor_law` → general "employment law" (code `employment_law`) | Dylan | T0.3 JD-B translation |
| D11 | 2026-11-21 | accepted | Criterion weights set by Lewis (JD-A 25/25/15/15/10/10; JD-B 30/20/15/10/15/10), illustrative, not calibrated | Dylan delegated ("bạn tự đặt") | weight: null |
| D12 | 2026-11-21 | accepted | BM25 keyword lists from T0.3 accepted as-is (plus employment-law update) | Dylan | — |
| D13 | 2026-11-21 | accepted | Start M1 | Dylan | — |
| D14 | 2026-11-21 | accepted | Start M2 | Dylan ("chuyển sang m2") | — |
| D15 | 2026-11-21 | accepted | LLM calls go through an OpenAI-compatible gateway, model `ag/gemini-3.8-flash-high`; URL/key only in gitignored root `.env` (`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`) | Dylan | D1 transport (Gemini SDK) |
| D16 | 2026-11-21 | accepted (implicitly, Dylan continued M2 on this scope) | M2 scope (Lewis interpretation, not yet confirmed by Dylan): T2.1 OpenAI-compatible provider, T2.2 offline screening pipeline, T2.3 experiment runner on 10×2 eval set | Lewis | — |
| D17 | 2026-11-21 | accepted | Per-call LLM timeout 180 s (`LLM_TIMEOUT_S=180` in root `.env`) | Dylan | default 30 s |
| D18 | 2026-11-21 | accepted | Keep `min_coverage = 0.8`; experiment reports add per-pair coverage and an unpublished known-criteria-only score | Dylan | — |

Statuses: `proposed`, `accepted`, `superseded`, or `rejected`.
| D19 | 2026-11-22 | accepted | Start M3 | Dylan ("triển khai sang làm m3") | — |
| D20 | 2026-11-22 | proposed | M3 scope (Lewis interpretation): T3.1 latency study (concurrency, flash high/medium/low), T3.2 retrieved-mode runs (lexical, hybrid with bge-m3) vs full; labelling and thesis update out of scope until Dylan says | Lewis | — |
| D21 | 2026-11-22 | accepted | Replace hand-written JD-A/JD-B with real public job postings (Python Backend Developer, HR Generalist); add as new JD files, keep old ones for reproducibility of past runs | Dylan ("tìm kiếm các JD trên mạng") | D8 source of JD criteria |
| D22 | 2026-11-22 | accepted | Labelling method (delegated to Lewis): silver labels by two independent LLM annotators from non-Gemini families (Claude Opus 5.5, OpenAI GPT), blind to system outputs, following GUIDELINES.md; Cohen's kappa reported; disagreements adjudicated by a third pass and flagged; thesis must call them silver labels, not human ground truth. Starts after D21 JDs are final | Dylan delegated ("gán nhãn mình để cho bạn quyết định") | — |
| D23 | 2026-11-22 | accepted | Real JDs: jd-py-real = Enveritas Backend Software Engineer Python/Postgres; jd-hr-real = Surmodics HR Generalist; 7 criteria each; weights set by Lewis (py 25/20/15/15/10/10/5, hr 20/20/20/15/10/10/5), illustrative | Lewis under D21 | — |
| D24 | 2026-11-22 | accepted | GUIDELINES v1.1 (appended): absent for experience with dated irrelevant history / stated non-matching degree; strong needs concrete scope; overall_fit rule poor/good/partial from must_have levels. Raw sets kept unchanged for κ; final set adjudicated under v1.1 | Lewis under D22 delegation | GUIDELINES v1 ambiguity |
| D25 | 2026-11-22 | accepted | Build screening-v2 prompt (v1.1 absent/strong rules) and validate on a new held-out CV set (dev = current 20 pairs, test = held-out) | Dylan ("oke") | — |
| D26 | 2026-11-22 | accepted | Production config must be both fast and good per CV (each CV ≤ 40 s, not just p50) — select by model/config bake-off on the dev set | Dylan ("vừa nhanh vừa ngon, mỗi CV") | D1 (flash-high) pending outcome |
| D27 | 2026-11-22 | accepted | Push main to origin | Dylan ("Oke") | — |
| D28 | 2026-11-22 | accepted | Thesis .docx updated at the end, after final results | Dylan | — |
| D29 | 2026-11-22 | accepted | Held-out final labels keep dev-set scope conventions (15 agreed labels overturned for consistency); conventions documented as GUIDELINES v1.2 after the fact; final test also reports a strict agreement-retention sensitivity variant | Lewis under D22 | — |
| D30 | 2026-11-22 | accepted | Production/final-test config: ag/gemini-3.8-flash-low + screening-v2 + retrieved lexical k5, plus hedged requests (T5.6) to cap tail latency; selected on dev by D26 rule | Lewis under D26 | D1 (flash-high) |
| D31 | 2026-11-22 | accepted | Add escalation safety net: re-screen pairs with any needs_review or coverage in [0.7, 0.9) using a stronger model; escalation model chosen on dev between flash-high (Dylan's suggestion) and gemini-4-argon-medium; then one held-out run | Dylan (chose safety net) + Lewis (band fixed a priori, compare two escalation models) | extends D30 |
| D32 | 2026-11-23 | accepted | Production config stays flash-low + screening-v2 + lexical k5 + hedge 20 s WITHOUT escalation; escalation (argon-medium) reported as supplementary analysis only | Dylan ("oke giữ flash-low") | D31 escalation as default |
| D33 | 2026-11-23 | accepted | Push main to origin (this push) | Dylan ("push đi") | — |
| D34 | 2026-11-23 | accepted | Thesis update not started yet | Dylan ("chưa") | — |
| D35 | 2026-11-23 | accepted | Try escalation on needs_review only (no coverage band) with gemini-4-argon-medium: small runner option, dev gate (20/20, ≥17/20 ≤40 s, collapsed κ and F1 not >0.01 below reference), then one held-out run; adoption decided by Dylan after results. Pushed dd644cc. | Dylan (chose option 3, push) + Lewis (gate) |
| D36 | 2026-11-23 | accepted | Production config = flash-low + screening-v2 + retrieved lexical k5 + hedge 20 s + escalation to ag/gemini-4-argon-medium ONLY on needs_review (`--escalate-on needs_review`). Framed as a cheap safety net (held-out: 1/20 escalated, fit 20/20), not a proven accuracy gain. Not yet wired into service Settings (no serving path until SaaS, D7). Pushed 6e2e6fd. | Dylan | D32 (no escalation) |
| D37 | 2026-11-23 | accepted | M6 order: (1) ai-service screening HTTP API with D36 config, (2) web demo UI, then (3) SaaS platform — proceed through all three without asking Dylan, with automatic review and test on every step; step 3 starts only if 1–2 pass review and test | Dylan ("không phải hỏi lại tôi") | D7 (SaaS decided later) |
| D38 | 2026-11-23 | accepted | Web UI must be easy to read, friendly and beautiful: React + TS + Vite + Tailwind, Vietnamese UI text, light/dark, responsive, accessible | Dylan + Lewis (stack per design doc) | — |
| D39 | 2026-11-23 | accepted | SaaS is single-organization (no multi-tenancy); tenant isolation items in the design doc are out of scope | Dylan | design doc multi-tenant SaaS |
| D40 | 2026-11-23 | accepted | Autonomy covers creating worktrees, workers, reviews, tests and local merges into main; pushing to origin still needs Dylan's explicit go-ahead (D9 unchanged) | Lewis (conservative reading of D37) | — |
| D41 | 2026-11-23 | accepted | Codex hit its usage limit (resets ~09:54); executor work continues on Claude Code (claude-opus-5-5, effort medium) in the same worktree instead of waiting ~3 h; switch back to Codex executors after the reset | Lewis under D37 autonomy | — |
