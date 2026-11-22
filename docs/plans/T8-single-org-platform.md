# T8 — Single-organization recruitment platform implementation plan

Status: planning only; no implementation or commit in T8.0. This plan supersedes the multi-tenant assumptions in design sections 3–15 for the thesis MVP. Defaults below are decisions for executors; Dylan need not answer questions before execution.

## 1. Demonstrable MVP and scope

Build one local recruitment workspace with Vietnamese UI and English CV/JD processing. There are no organizations, tenants, memberships, organization IDs, tenant RLS, organization selection, tenant quotas, or cross-tenant tests. Preserve server-side roles, job assignments, private documents, immutable evaluation inputs, human decisions, and audit. Single organization does not mean every user may access every job.

### Committee demonstration (about 8–10 minutes)

1. Log in as a recruiter; see a dashboard with actual persisted counts, recent applications, screening failures, and items awaiting review.
2. Create a job and a structured JD draft with 1–8 weighted criteria; edit and submit it for approval. An admin or assigned hiring manager approves it. Show that editing an approved version fails; cloning it creates a new draft.
3. Create a candidate, upload an English PDF CV privately, and attach that exact resume version to a job application. Open an authorized download; an unauthenticated download fails.
4. Start screening against an approved JD. The API immediately returns a run ID. The UI shows queued/running/retrying states, survives navigation and reload, and subsequently shows persisted results.
5. Open criterion breakdown, validated quotations and source text, coverage, score bounds, missing information, and a manual-review warning. Open the original PDF separately. Never manufacture page links when a page is unknown.
6. An assigned hiring manager records shortlist/reject/hold with a required note. Show the AI result unchanged and the human decision as a separate record.
7. Visit the job and dashboard to see the new decision; as admin, view the audit history for approval, upload, screening, download, and review. Log in as an unassigned reviewer and demonstrate denied access.
8. Show one failed-provider run and a deliberate retry. Explain clearly whether the demo uses the live provider or the labeled deterministic test-provider mode.

### Included behavior

- Local password accounts, login/logout/current session, three roles: admin, recruiter, reviewer (the hiring-manager role).
- Jobs with open/closed state, assigned reviewers, paginated job/candidate/application lists, name/title search, and sensible empty states.
- Structured JD drafts, submission, approval, version history and cloning. Approval freezes content and criteria. Screening only accepts an approved version belonging to that job; historical approved versions remain inspectable.
- Candidates with minimal contact data and demo/synthetic provenance, versioned PDF resumes, private upload/download, applications, immutable screening runs and input snapshots.
- Async screening through BullMQ and a Node worker calling existing FastAPI, status polling, retries, failure explanations, and restart recovery.
- Existing evidence validation and scoring semantics, coverage and uncertainty, result history, and human decisions requiring a note. No automatic hiring/rejection.
- Append-only audit, operational logs without CV text, dashboard scoped to accessible jobs, reproducible seeds and automated end-to-end checks.
- Beautiful, consistent Vietnamese screens: reusable layout, typography, spacing, accessible controls, loading/error/empty states, responsive layouts, light/dark styles consistent with the existing demo.

### Explicit reductions from sections 3–15 and phases 1–5

- **Phase 1 / sections 4–6:** remove tenancy, Owner/Viewer roles, membership/invitation administration, tenant settings and tenant RLS. A direct `users.role` plus job assignments is sufficient. No registration, email invites, SSO, MFA, billing, subscription or organization management.
- **Phase 2 / section 7:** manual structured JD drafting and approval are required. AI-assisted JD generation is deferred by default: there is a package placeholder but no working generation endpoint today. Do not show a nonfunctional generate button. If later added, it creates only a draft requiring the identical human approval path; it cannot mutate approved versions.
- **Phase 3 / sections 8–9:** PDF only, including the existing bounded English OCR fallback. Cut DOCX, bulk uploads, separate parse/index queues, persisted vector/chunk indexes, standalone parsed-profile editing, semantic candidate search and re-embedding jobs. Existing screening performs extraction and lexical retrieval within the selected CV in one call; reuse that rather than build a new ingestion subsystem. Repeated screening can repeat extraction; acceptable for this dataset.
- **Phase 4 / sections 9–11:** preserve the production screening configuration and existing scoring module. Cut new hybrid/dense/RRF/reranker work, new scoring algorithms, per-criterion human score overrides, and cross-job rankings. Show per-job application results; sort scores only within the same JD version/config, and separate insufficient-coverage runs. No global candidate leaderboard.
- **Phase 5 / sections 12–13:** deliver a local reliability/security demonstration, measured smoke latency, regression tests, backup/reset instructions, and a small evidence sanity set. Do not claim production launch readiness, fairness certification, calibrated hiring probabilities, new benchmark results, or a completed HR pilot. Existing research/evaluation assets remain unchanged; formal ablations and gold-set expansion are separate thesis research work.
- **Sections 12 and 15:** cut cloud deployment, Kubernetes, microservices beyond existing AI separation, distributed tracing infrastructure, hosted CI, email notifications, SSE/WebSockets, malware scanning, self-service PII export/retention UI and automated backup scheduling. Keep local backup/restore/reset and synthetic-only demo data. English CV support and Vietnamese UI are separate concerns; no promise of Vietnamese OCR quality or full bilingual UI in this increment.

## 2. Architecture and technical decisions

### 2.1 Repository baseline verified during planning

- Root is a pnpm workspace (`apps/*`, `packages/*`), Node >=26, pnpm 9.15.4; `pnpm check` runs each package's check script.
- `apps/api` does not yet exist. `infra/migrations/README.md` reserves migrations for the future API runtime; no application schema migrations exist.
- `apps/web` is React 19 + TS + Vite + Tailwind; existing scripts are dev/build/lint/typecheck/test/check. The current `ScreeningClient` has config/samples/screen, and `screen` returns one synchronous `ScreeningEnvelope`. Merely changing its URL will not implement async persistence.
- `apps/web/vite.config.ts` currently forwards `/api/ai` directly to FastAPI on 8100. Existing `Results` and `JDEditor` are useful presentation components.
- FastAPI currently accepts multipart `cv` PDF and JSON-string `jd` at `POST /internal/v1/screenings`; exposes `/internal/v1/screening-config`, `/internal/v1/sample-jds`, and `/health`. Internal routes currently lack service authentication. Do not implement the design's hypothetical `/documents/parse`, `/documents/index` or `/screenings/evaluate` contracts.
- Current screening uses retrieved lexical context, prompt `screening-v2`, a primary model, hedging and conditional escalation from `Settings`. Reuse effective settings rather than copying the older design's model/defaults. `/screening-config` is only a display subset, not a full reproducibility manifest.
- The AI envelope contains validated evidence but not complete normalized source text/page mappings. `versions.cv_sha256` hashes normalized text, **not the uploaded PDF bytes**. Store these as different hashes.
- Compose already includes Postgres/pgvector, Redis **and RustFS**, despite the short task input mentioning only the first two. This plan deliberately uses filesystem storage; leave RustFS available but unnecessary to the MVP.

### 2.2 API framework choice

Recommend **NestJS with the Express adapter**, one modular `apps/api` package and a separate worker entry point in that package. It matches the design and TypeScript web team, supports shared validation/contracts, and provides a clear module/guard/testing structure as auth, approval and background work grow. Nest has documented [BullMQ integration](https://docs.nestjs.com/techniques/queues). This is a modular monolith, not a new service per domain.

An Express/Fastify-only API has less initial scaffolding but requires hand-built conventions for guards, transactions and modules. Extending FastAPI would reduce runtime count but mix platform/auth ownership into the research service and still require a Node BullMQ worker or a queue change. Neither advantage outweighs the integration consistency here. T8.1 verifies chosen package releases against Node 26 and pins them in the lockfile; no dependency upgrade is implicit for the current web/AI apps.

### 2.3 Runtime layout and ownership

Browser -> same-origin `/api/v1` -> Nest API -> PostgreSQL and private filesystem.
Nest API -> PostgreSQL outbox -> BullMQ/Redis -> Nest worker -> authenticated FastAPI -> configured LLM provider.

- API on 3100, Vite on 5173, AI on 8100; retain compose's existing local Postgres 55432 and Redis 56379. Bind local servers to loopback. Vite proxies `/api` to 3100; there is no browser route to internal AI paths.
- API owns all database writes, workflow transitions, authorization, files and results. AI remains stateless with no DB/storage credentials required; worker sends bytes and approved JD, then persists the returned output.
- One API process and one worker process, initially worker concurrency 1 to control OCR/provider load. No Python BullMQ consumer. PostgreSQL is the canonical run state; Redis is delivery infrastructure.
- API boot validates environment and exposes `/health/live` and `/health/ready`. Readiness checks DB; separately report Redis/worker/AI degradation. Login/jobs should remain usable when AI is down. Worker heartbeat/last-seen belongs in operational status, not an invented percent-complete indicator.

### 2.4 Persistence and migrations

Use **Knex + pg**, typed repository functions, and versioned Knex migrations in `infra/migrations/` with a single `apps/api/knexfile.cjs`. Prefer explicit SQL/check constraints/partial indexes/triggers over ORM auto-sync. [Knex supports a configured migration directory and migration tracking](https://knexjs.org/guide/migrations). One schema owner, one migration runner; no Prisma/TypeORM/Alembic schema in parallel. pgvector can remain installed without a new vector table.

All IDs are UUIDs and timestamps UTC `timestamptz`. Tables and key columns:

- `users`: id, normalized_email unique, display_name, password_hash, role (`admin|recruiter|reviewer`), disabled_at, created_at. No tenant or membership table.
- `sessions`: id/token_hash unique, user_id FK, expires_at, created_at, last_seen_at, csrf_token_hash. Opaque browser token only; never store its plaintext in DB.
- `jobs`: id, title, status (`open|closed`), created_by FK, active_jd_version_id nullable FK, created_at, updated_at, revision. Approved JD must belong to the same job (composite FK or constraint trigger).
- `job_assignments`: job_id, user_id, assigned_by, created_at; PK(job_id,user_id). These grants apply to reviewers. Admin/recruiter have workspace-wide access in MVP.
- `jd_versions`: id, job_id FK, version_no, title, summary, state (`draft|pending_approval|approved`), revision, submitted_by/at, approved_by/at, content_sha256, created_by/at; unique(job_id,version_no). Rejection returns a pending version to draft with an audit reason; it does not unapprove a version.
- `job_criteria`: id, jd_version_id FK, code, label, description, priority, weight, keywords_json, sort_order; unique(jd_version_id,code); weight finite/nonnegative, at least one positive weight per approved set. Enforce 1–8 criteria and unique codes at approval. Map code to AI `criterion_id`; keep the UUID-to-code mapping in the run snapshot.
- `candidates`: id, display_name, email nullable, phone nullable, provenance (`synthetic|demo_public`), created_by/at, updated_at. Email need not be unique; no automatic merging. Reject real-PII imports in the documented demo workflow.
- `resumes`: id, candidate_id FK, version_no, storage_key unique, original_filename, mime_type, byte_size, file_sha256, status (`uploaded|invalid`), uploaded_by/at; unique(candidate_id,version_no). Binary identity/metadata immutable after final upload. New file means new row.
- `applications`: id, job_id FK, candidate_id FK, resume_id FK, stage (`new|shortlist|reject|hold`), current_review_id nullable, revision, created_by/at; unique(job_id,candidate_id) for MVP. Enforce resume belongs to candidate. Resume replacement affects only future runs; previous runs keep old references.
- `screening_configs`: id, fingerprint unique, effective_manifest_json, created_at. Immutable effective manifest includes provider/model identifiers, prompts, scoring/rubric/min-coverage, retrieval, parser/normalization versions, hedge/escalation settings and AI build revision. API is read-only for configuration in MVP.
- `screening_runs`: id, application_id, job_id, resume_id, jd_version_id, scoring_config_id FKs, input_snapshot_json, input_fingerprint, generation, retry_of_run_id nullable FK, attempt_history_json, requested_by, status (`queued|running|retry_wait|completed|failed`), attempt_count, attempt_token, lease_expires_at, queued_at, started_at, finished_at, next_retry_at, error_code, safe_error_detail, result_json, normalized_source_text, source_pages_json, normalized_text_sha256, score_state, observed_score nullable, coverage, lower_bound, upper_bound, requires_manual_review. Unique(application_id,input_fingerprint,generation). Indexed(application_id,created_at DESC), (status,lease_expires_at), (job_id,jd_version_id,scoring_config_id).
- `screening_criterion_results`: id, screening_run_id FK, criterion_id FK, criterion_code, raw_assessment_json, validated_json, evidence_json, level/status, match_value nullable, weight, confidence, reason, missing_information_json; unique(run,criterion). Preserve output as returned; never recalculate scores in Nest or browser.
- `human_reviews`: id, application_id FK, screening_run_id FK, reviewer_id FK, decision (`shortlist|reject|hold`), note (trimmed, 1–2000 chars), supersedes_review_id nullable FK, created_at. Append-only. Validate run belongs to application; human decision does not modify AI rows. Lock application and check revision before appending/updating its stage/current_review_id.
- `audit_events`: bigint id, actor_id nullable FK, actor_type (`user|worker|system`), action, resource_type/id, job_id nullable, request_id, safe_metadata_json, created_at; indexes(created_at,id), (resource_type,resource_id,id), (job_id,id). Append-only to application DB role; never put CV text, passwords, tokens or full provider payloads in audit metadata.
- `outbox_events`: id, kind, run_id FK, delivery_generation, payload_json (IDs only), created_at, delivered_at nullable, last_error, attempts; unique(run_id,delivery_generation). Indexed undelivered events. Relay delivery does not mean screening completed.
- `api_idempotency_keys`: actor_id, route, key, request_hash, response_json/status, created_at, expires_at; unique(actor_id,route,key). Same key/body replays response, changed body returns 409; retain 24 hours. Persistent run identity prevents duplicates after this cache expires.

Use FK restrict for historical inputs; no destructive domain DELETE routes in MVP. DB guards reject approved JD/criteria update/delete, completed result/input mutation, and review/audit update/delete. A migration/admin role alone may reset disposable demo data. Transactions include domain mutation plus its audit event; screening creation additionally includes the outbox record. No soft tenant scoping or fake singleton organization row.

### 2.5 Authentication and record authorization

Choose local accounts with **opaque DB-backed sessions**, Argon2id password hashes and an HttpOnly cookie (`SameSite=Lax`, `Path=/`, Secure outside localhost). Rotate session at login, expire after 8 hours, invalidate on logout/disable, and check the current user's role per request. Do not store credentials/JWTs in localStorage. Use origin checks and a session-bound CSRF token/header for mutations, including multipart uploads; protect login with origin validation and login throttling. Vite's proxy avoids permissive CORS.

- Admin: all records, approval, user create/disable/role changes, assignments, audit viewer. No account deletion, public registration or password-reset email. Prevent disabling/demoting the last active admin.
- Recruiter: all jobs/candidates/applications, JD authoring/submission, uploads/downloads, screening/retry, and review decisions. Cannot approve JDs, manage users, or browse global audit.
- Reviewer/hiring manager: only assigned jobs and the associated applications, linked resume versions and results; may approve those jobs' pending JDs and record human decisions. Cannot browse global candidates, mutate jobs/CVs, enqueue screenings or access unlinked candidate resume versions.
- Approvers may approve a seeded/admin-authored draft; no separate two-person-signoff policy in MVP. Recruiter authoring still requires an admin/reviewer to approve.
- Resource guards follow joins all the way to the authorized job. A reviewer can download a resume only when it is linked to an accessible application or its historic run. Filter dashboards/counts as well as detail routes. Prefer 404 for inaccessible record IDs; unauthenticated requests get 401 and forbidden actions on accessible resources get 403. All failures have stable error codes.

### 2.6 Private storage decision

Choose **filesystem**, using `FILE_STORAGE_ROOT` (default `.local-data/cvs`, outside `apps/web/public`, ignored by git). API and worker on the same machine share its absolute path. This is the smallest reliable deployment for a local thesis demonstration and avoids bucket bootstrap/credential failure. MinIO or existing RustFS would add S3 concepts without improving this single-host demo; retain a small `ResumeStorage` interface so it can later become an S3 adapter. Do not add a fourth compose service.

- Stream multipart upload to a random temporary file, enforce 10 MiB and PDF signature/content-type, hash bytes while writing, then atomic rename to UUID-derived storage key. Never use client filename as a path. No symlink following/path traversal; restrictive directory/file permissions.
- Limit screening documents to 20 pages, bounded rendering pixels and an aggregate extraction deadline (see below); encrypted/malformed/empty PDFs fail clearly. Upload validates signature/size; AI may subsequently reject deeper document content. That run is terminal and resume can be marked invalid when appropriate.
- `GET /resumes/:id/content` authorizes and streams the original PDF with safe attachment filename and `Cache-Control: private, no-store`; no static file server, public URLs or storage path in responses. No presigned URL is needed for filesystem.
- On file-write or DB failure clean temporary/new files; reconcile unreferenced temporary/orphan files older than an hour. Do not remove referenced files. No candidate-delete feature in this increment.

### 2.7 API and browser integration contract

Public routes live under `/api/v1`. Define a checked-in OpenAPI contract and generated TS DTOs in `packages/contracts`; never share Nest internals with the browser. Lists use `page`, `pageSize` (max 100), filters, stable sort and `{items,total,page,pageSize}`. Errors are `{error:{code,message,request_id}}`; conflicts use 409. Return no stack trace or provider secret.

Required routes:

- `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` (user, allowed actions, CSRF token); admin `GET/POST /users`, `PATCH /users/:id` for role/disabled/password reset.
- `GET/POST /jobs`, `GET/PATCH /jobs/:id`, `PUT /jobs/:id/assignments`.
- `GET/POST /jobs/:id/jd-versions`, `GET/PATCH /jd-versions/:id`, `POST /jd-versions/:id/submit`, `/return-to-draft`, `/approve`, `/clone`. Draft edits use revision checks. Approval atomically freezes criteria and sets the job's active JD.
- `GET/POST /candidates`, `GET/PATCH /candidates/:id`, `POST /candidates/:id/resumes`, `GET /resumes/:id/content`.
- `GET/POST /jobs/:id/applications`, `PATCH /applications/:id` for resume replacement using revision checks; do not accept stage changes here.
- `GET /screening-config`, `POST /jobs/:id/screenings` with application IDs and approved JD version, `GET /screenings/:id`, `GET /applications/:id/screenings`, `POST /screenings/:id/retries`. Screening POST/retry require Idempotency-Key and return 202 with run IDs/status/Location. Limit batch to 10 applications, transaction all-or-none on invalid scope/input. Config ID is server-selected from the active authenticated AI manifest. Refresh that manifest with a short bounded request and cache its last authenticated value for degraded operation; when no validated manifest has ever been loaded, screening admission returns 503 without creating a run, while login/CRUD remain available. Execution always verifies the pinned fingerprint, including cached manifests.
- `POST /screenings/:id/reviews` (decision, note, expected application revision), `GET /applications/:id/reviews`, `GET /dashboard`, admin `GET /audit-events` with action/resource/date filters.

Introduce a `PlatformClient` alongside the existing AI DTOs. It handles login, CRUD, resume upload, start/status/history/review/dashboard; `startScreening` returns a run and polling retrieves the envelope on completion. Keep Results as a renderer of stored data; replace App's file/JD synchronous execution state with job/application/run routes. Configure fetch with same-origin credentials and CSRF headers. Do not fake async behavior by making `ScreeningClient.screen()` wait invisibly.

Remove `/api/ai` Vite proxy in platform mode; no browser import calls `/internal/v1/*`. The HTTP and mock PlatformClient implement the same new contract, including queued->running->completed/failed transitions. `VITE_USE_MOCK=1` remains an explicit, visibly labeled UI-preview mode; it is not used for platform acceptance. No silent fallback from live errors to mock results. Templates become selectable draft inputs, not approved JDs automatically.

### 2.8 Async worker, idempotency, failure and evidence contracts

**Admission and delivery:** API authorizes actor/application/job/approved JD/resume and snapshots approved content, criteria mapping, file hash/key and active config manifest into the run. Hash canonical input JSON with SHA-256. Under transaction/unique constraints reuse an existing matching nonfailed run for a normal start; if only a matching failed run exists, return 409 with its ID and require explicit retry. Explicit retry creates a new generation linked to the failed run; serialize generation allocation under the application row lock. Changing JD/resume/config creates a different identity. A completed run is never overwritten. Record actor and request IDs but no raw CV in Redis.

Create run + audit + outbox in one DB transaction. Return 202 once durable, even if Redis is unavailable; show `queued` and degraded dispatch state rather than falsely claiming execution. A single relay polls PostgreSQL every second, claims undelivered rows using transaction locks, enqueues BullMQ with a deterministic UUID-based job ID and marks delivery. A crash after enqueue can redeliver; consumers must remain idempotent. These choices follow BullMQ's [idempotent-job guidance](https://docs.bullmq.io/patterns/idempotent-jobs), not an exactly-once claim.

**Execution:** Node worker revalidates resource relationships and requesting account/grant before starting; revoked or disabled requesters produce a safe terminal authorization error. It claims a DB lease/attempt token, sets running, reads only the referenced private file, and submits multipart bytes + frozen JD to the existing AI endpoint with a service bearer token, request ID, run ID and expected config fingerprint. A completed run is a no-op on redelivery. Finish with one conditional transaction that matches the current attempt token, writes envelope/source/criterion rows, sets completed and adds audit. Stale attempts cannot publish after lease expiry/retry.

**Small AI contract extension (T8.3):** authenticate all internal routes with `AI_INTERNAL_TOKEN` (health remains public), fail startup outside test mode if missing, and add an authenticated full `/internal/v1/screening-manifest`. It returns a canonical fingerprint for effective config and a declared build revision. Screening checks the expected fingerprint before expensive work; drift returns 409 `config_changed` without executing. Return `source:{text,pages,normalized_text_sha256}` with extractor/normalization metadata for the exact text that was assessed. Add fields without changing existing score semantics; update API contract tests for authentication and provenance. The worker checks response shape, JD ID/criterion codes/weights, fingerprint and hash consistency before storing; mismatches fail closed. Return the actual manifest/fingerprint with successful output.

Store source privately in PostgreSQL for the small demo, not in logs or list responses. Return source only to authorized result-detail requests. Render quotations escaped as text. Highlight only verified offsets against that exact source. Python offsets count Unicode code points; browser highlighting must convert code points rather than slice JS UTF-16 blindly (test emoji/non-ASCII). Map valid offsets to retained page ranges when possible; never infer a page from an absent source map. A valid quote is not itself proof of semantic correctness: preserve uncertainty and human review.

**Timing defaults:** expected visible completion is 10–60 seconds for small demo PDFs, not a guaranteed service-level objective. API create/status requests do not wait for AI (target <1 second on local warm services). Poll every 2 seconds, back off to 5 seconds after a minute; persist run IDs in URLs and resume on reload. Display elapsed time, queue state, attempt count and next retry, no fabricated stage percentages. After 60 seconds show a calm “still processing” message; leaving the page does not cancel the job.

Set an aggregate AI request deadline of 150 seconds, with extraction bounded to 45 seconds and all primary/hedge/escalation/provider-retry work sharing the remaining budget. Enforce extraction timeout in a killable subprocess: an HTTP disconnect must not leave unlimited OCR work in a thread. Worker HTTP timeout 180 seconds, BullMQ lockDuration 240 seconds with renewal, and DB lease 240 seconds with heartbeat. Keep CPU parsing in Python; the Node loop must remain responsive to renew locks. Existing provider's per-call retries/hedging must obey the aggregate deadline; do not stack unconstrained nested retries. These deadlines are explicit configuration, checked at startup.

**Retries/recovery:** maximum two automatic attempts total with a 5-second exponential backoff plus jitter for transport failure, 429 and transient provider 5xx/timeouts. Invalid/encrypted/empty/oversized PDF, bad JD, auth failure, schema/provenance mismatch and config drift fail immediately. On config drift user retries create a fresh run with the current manifest. Retry endpoint otherwise uses the frozen inputs/config; old failures remain visible. Failed terminal jobs remain in BullMQ's failed set (the MVP dead-letter view), with DB error/attempt history; no new DLQ product is required. [BullMQ retries](https://docs.bullmq.io/guide/retrying-failing-jobs) and [stalled delivery](https://docs.bullmq.io/guide/jobs/stalled) require safe reprocessing.

A startup/periodic reconciler checks queued DB runs whose delivered queue entries vanished, and running runs with expired leases. It reissues a delivery generation or marks exhausted attempts failed; bound total attempts across stalled jobs and HTTP retries in DB, not only BullMQ options. Preserve attempt tokens and deadlines to reject late responses. Redis loss does not lose run identity. Redis restart with volume should recover delivery; total Redis loss can be rebuilt from nonterminal DB rows. Exactly-once external LLM charging is not guaranteed after a crash; concurrency 1, capped attempts and logs bound/describe this limitation.

### 2.9 Audit, demo data and local operation

Audit successful login/logout, account/grant changes, job/JD creation/edit/submission/approval, upload/download, application changes, run queued/start/retry/completion/failure, and human decisions. Mutation+audit share DB transactions; download audit precedes streaming and records “download authorized,” not proof the client received every byte. Record failed-login/denied-access events as sanitized security events with rate limiting. Global audit UI is admin-only. Admin cannot edit/delete audit through the application.

Seed deterministic UUIDs for admin/recruiter/assigned reviewer/unassigned reviewer, two jobs, approved and draft JDs, six synthetic candidates/PDFs, applications, and representative run results (scored, insufficient coverage, needs review and failed), plus decisions/audit. Use the real JD templates at `data/eval/jds/jd-py-real.yaml` and `jd-hr-real.yaml` as reviewed seed material; do not silently bless imported drafts at runtime. Generate synthetic CV PDFs with traceable quotes; do not copy personal records from research assets into seed data. Seeded completed runs must have consistent source/config/hashes and be labeled “demo fixture,” never presented as newly generated live output.

`db:seed` is idempotent and adds/updates only stable demo records; it must not overwrite arbitrary user work. `demo:reset` is a separate explicit operation restricted to a disposable local database/storage path and refuses non-demo connection names/remote hosts. Demo passwords are documented development credentials, hashed on seed; do not print secrets in logs. Tests use separate `rms_ai_test` DB, Redis key prefix and temporary storage. E2E gets its own disposable DB and never calls reset on the user's `rms_ai` data.

Use a labeled test-provider switch only in test/demo configuration. It runs through real API, storage, Redis, worker and FastAPI and produces deterministic results from fixtures; it cannot be enabled by browser request or silently replace a failed live provider. Normal runtime remains the existing production config/provider. Demo instructions cover `docker compose up -d postgres redis`, migration, seed, API/worker/AI/web start, provider/OCR checks and fallback explanation. Back up DB plus private storage together; restore a disposable copy and verify one download and result. Record actual timings without claiming a benchmark.

## 3. Executor task breakdown (11 tasks)

### Execution rules and test conventions

Each task is a separately reviewable change with listed write scope; other files are read-only unless the task explicitly owns shared integration. Never run more than two tasks concurrently. All commands below are **acceptance commands to implement/run during execution**, not a claim that new scripts exist now. Existing `pnpm check`, web `check`, and AI `check` already exist; API, contracts, E2E and demo scripts must be introduced by their owners.

T8.1 owns dependency installation and all shared manifests/lockfile. It predeclares domain module stubs, registers them once, installs the agreed web routing/E2E dependencies and defines test scripts; later tasks fill their own module files without editing the shared root module. Contracts are frozen by T8.1 to this plan; a discovered contract gap is resolved serially by its owner before concurrent work resumes. Later migration changes, if unavoidable, are additive uniquely numbered files owned by one task at a time, never edits to an applied migration.

API scripts established by T8.1: `build`, `lint`, `typecheck`, `test:unit -- <suite>`, `test:integration -- <suite>`, `check`, `db:migrate`, `db:seed`, `dev`, `worker:dev`. `test:integration` uses explicit test DB/Redis/storage environment and fails if it targets the development DB. `pnpm --filter @rms-ai/contracts check` validates/generates contracts with no uncommitted drift. Test fixture providers must not require paid network access.

### T8.1 — Foundation, schema, contracts and integration seams

Dependencies: none. Write scope: root `package.json`, `pnpm-lock.yaml`, `.env.example`, `.gitignore`; `apps/api` scaffold/common/db/knexfile and empty feature module registrations; `infra/migrations/`; `packages/contracts/`; dependency/script/config scaffolding in `apps/web/package.json` and `tests/e2e/package.json` only. Reserve `scripts/demo/` for operational commands and `scripts/verify-t8.*` for the final harness; root script aliases point to those future owned files. Do not implement feature handlers or change existing AI algorithms.

Deliver full schema/constraints and migration roles, typed DTO/OpenAPI including AI extension, test harnesses, common error/RBAC/transaction interfaces, audit-service interface, storage interface, and app/worker bootstraps. Provide fixture factories and baseline user seed utility for auth tests. Reserve module directories for auth/users/audit/jobs/jd-versions/candidates/resumes/applications/screenings/queues/reviews/dashboard. Wire empty module exports so later changes need no root-module collision.

Acceptance: empty DB migrates; a second migration run is a no-op; constraints reject wrong-job JD/resume-candidate relations and approved-input/result tampering; API boots with degraded AI/Redis; no tenant schema/claims; Node 26 dependency install succeeds. Test commands: `pnpm install --frozen-lockfile`; `pnpm --filter @rms-ai/api db:migrate`; `pnpm --filter @rms-ai/api test:integration -- schema`; `pnpm --filter @rms-ai/contracts check`; `pnpm --filter @rms-ai/api build`.

### T8.2 — Sessions, roles, assignments authorization and audit core

Dependencies: T8.1. May run alongside T8.3. Write scope: `apps/api/src/auth/`, `users/`, `audit/` (writer, not audit reader controller); `apps/api/test/auth/`, `test/audit/`. Fill T8.1's interfaces; no root manifest/module/schema edits.

Acceptance: all three roles log in; cookie/CSRF/origin/expiry/logout/disabled checks work; safe password handling and last-admin guard; deny-by-default action policy and reusable job-access guard cover arbitrary IDs; actor/security events recorded without PII. A transaction rollback also rolls back its audit event; app role cannot update/delete audit. Test commands: `pnpm --filter @rms-ai/api test:unit -- auth`; `pnpm --filter @rms-ai/api test:integration -- auth`; `pnpm --filter @rms-ai/api test:integration -- audit`.

### T8.3 — Authenticated AI adapter, manifest, exact evidence source and deadlines

Dependencies: T8.1 contracts. May run alongside T8.2. Write scope: `apps/ai-service/app/api/`, `app/main.py`, `app/config.py`, bounded extraction wrapper in `app/extraction/`, related AI tests. No scoring/prompt/retrieval algorithm changes; no research/evaluation artifacts.

Acceptance: token required on all internal routes, health usable without token; existing PDF/JD contract preserved with additive manifest/source metadata; wrong expected fingerprint rejects before provider invocation; source/hash/page references match what was assessed; CV binary hash is distinguished from normalized text hash; request has bounded aggregate execution and kills timed-out extraction subprocesses. A deterministic injectable test/demo provider exercises the same processing endpoint and is conspicuously labeled; normal mode never falls back. Existing screening regression output/scoring tests pass. Test commands: `pnpm --filter @rms-ai/ai-service check`; `pnpm --filter @rms-ai/ai-service exec uv run pytest -q tests/api tests/extraction` (create/update these owned suites as needed). Include fake slow OCR/provider tests without waiting 150 seconds by injecting test deadlines.

### T8.4 — Jobs, JD version workflow and job assignments

Dependencies: T8.1, T8.2. May run alongside T8.5. Write scope: `apps/api/src/jobs/`, `jd-versions/`, `apps/api/test/jobs/`, `test/jd-versions/`. Own job-assignment endpoint here; use auth core for authorization.

Acceptance: paginated CRUD metadata, reviewer assignment, draft edit/submit/return/clone/approve work with revision conflict checks; validation mirrors AI's 1–8 criteria and positive total finite weight; approved content/criteria immutable even by direct SQL using app role; simultaneous approvals/version creation do not corrupt active JD/version numbering. Recruiter cannot approve; assigned reviewer can; unassigned reviewer cannot read/approve. Approval audit committed atomically. Test commands: `pnpm --filter @rms-ai/api test:unit -- jd-versions`; `pnpm --filter @rms-ai/api test:integration -- jobs`; `pnpm --filter @rms-ai/api test:integration -- jd-versions`.

### T8.5 — Candidates, private resumes and applications

Dependencies: T8.1, T8.2. May run alongside T8.4; use seeded jobs rather than that task's in-progress handlers. Write scope: `apps/api/src/candidates/`, `resumes/`, `applications/`, corresponding `apps/api/test/` directories. Filesystem adapter belongs in resumes, implementing the frozen storage interface.

Acceptance: candidate CRUD, PDF upload, resume versions, application linking/replacement and scoped listings; wrong-candidate resume rejected; size/type/path/symlink attack blocked; no filesystem/static URL leakage; authenticated authorized streaming works and arbitrary resume IDs fail; reviewer cannot read unlinked versions/global candidate lists. Failed upload/DB insert cleans files; orphan reconciliation is safe. Existing run references survive a new upload/replacement. Test commands: `pnpm --filter @rms-ai/api test:integration -- candidates`; `pnpm --filter @rms-ai/api test:integration -- resumes`; `pnpm --filter @rms-ai/api test:integration -- applications`.

### T8.6 — Screening API, outbox relay, worker and recovery

Dependencies: T8.2–T8.5. May run alongside T8.7. Write scope: `apps/api/src/screenings/`, `queues/`, worker feature implementation, `apps/api/test/screenings/`, `test/queues/`. Keep shared root bootstrap registration from T8.1.

Acceptance: approved-only requests return durable 202 quickly; job/actor/resource scope rechecked at execution; current manifest frozen; multipart adapter uses existing endpoint; persisted result/source appears on status/history. Idempotency handles duplicate clicks, concurrent starts, key/body mismatch and explicit retries without overwriting history. Outbox crash windows, Redis restart/loss, worker death, stale lease/token, late response, timeout, invalid PDF, 429/5xx, config drift, schema/source mismatch and exhausted attempts are covered by fault-injection integration tests. Normal completion does not depend on a browser staying open. Test commands: `pnpm --filter @rms-ai/api test:unit -- screenings`; `pnpm --filter @rms-ai/api test:integration -- screenings`; `pnpm --filter @rms-ai/api test:integration -- queues`.

### T8.7 — Web platform shell, auth and CRUD journeys

Dependencies: T8.2, T8.4, T8.5; T8.1 contracts. May run alongside T8.6. Write scope: `apps/web/src/App.tsx`, `main.tsx`, `src/app/`, `src/features/auth/`, `jobs/`, `jd/`, `candidates/`, `applications/`, `admin/`, shared shell components/styles, `src/lib/api/`, `vite.config.ts`, related web unit tests. No backend/lockfile/package changes. T8.9 takes over API client/shared App files later, never concurrently.

Acceptance: Vietnamese navigation with routes for login/dashboard/jobs/candidates/application detail/admin; real persisted CRUD and JD approval using API; admin account/assignment controls; role-aware affordances with server errors handled; credentials/CSRF proxy works; browser never contacts internal AI endpoints. New mock PlatformClient matches contract and is labeled. Existing Results/JDEditor behavior is retained where reused. Dashboard may be a meaningful loading/empty shell pending T8.8/T8.9; do not invent counts. Test commands: `pnpm --filter @rms-ai/web check`; component integration tests cover login, draft/approval and upload/application linking with contract-valid mocked HTTP.

### T8.8 — Human review, dashboard aggregates and audit reader

Dependencies: T8.4–T8.6. Start after the T8.6/T8.7 wave settles. Write scope: `apps/api/src/reviews/`, `dashboard/`, `audit/audit-reader.controller.ts`, `audit/audit-reader.service.ts`; matching API test directories/files. Audit writer from T8.2 is read-only.

Acceptance: shortlist/reject/hold requires a trimmed note and completed run; insufficient coverage does not forbid a documented human decision; stale application revision returns 409, two simultaneous reviewers cannot silently overwrite; reviews append and supersede without AI mutation. Dashboard counts unique applications/current decisions, not every historical run, and exposes latest failures/pending reviews without inaccessible job data. Admin audit filtering/pagination works; recruiter/reviewer denied global audit. Test commands: `pnpm --filter @rms-ai/api test:integration -- reviews`; `pnpm --filter @rms-ai/api test:integration -- dashboard`; `pnpm --filter @rms-ai/api test:integration -- audit-reader`.

### T8.9 — End-to-end web screening, evidence, decisions and demo operation

Dependencies: T8.6–T8.8. Write scope: web screening/review/dashboard/audit features, existing `Results.tsx`, integration in App/client/types and relevant tests; `apps/api/src/db/seeds/` and seed fixtures, `scripts/demo/`, `docs/T8-demo.md`. May edit no root manifests/lockfile; use scripts wired by T8.1. Seed ownership transfers from the baseline factory in T8.1; auth test fixtures stay stable.

Acceptance: real queue/status/history polling, refresh recovery, retry/failure feedback, safe source highlighting and PDF download, score/coverage/bounds/manual-review UI, review-note form/conflict feedback and actual dashboard/audit screens. Insufficient coverage never displayed as zero or ranked beside scored runs; decisions clearly attributed to a person. Seed complete synthetic scenarios with consistent persisted provenance. A fresh setup supports the committee script; demo reset refuses unsafe targets and backup/restore instructions include storage. Test commands: `pnpm --filter @rms-ai/web check`; `pnpm --filter @rms-ai/api db:seed` twice (no duplicates/data loss); `pnpm --filter @rms-ai/api test:integration -- demo-seed`. Run a manual real-stack smoke, including successful authorized download.

### T8.10 — Dedicated UI quality and accessibility pass

Dependencies: T8.9. Write scope: `apps/web/src/` presentation/layout/styles and relevant component tests; `apps/web/docs/screenshots/t8/`. No API contract, scoring, queue behavior or seed edits. Request any functional defect fix from its owning task before proceeding; do not hide it with presentation state.

Acceptance: cohesive spacing/type/color hierarchy across all screens; polished job/application lists, JD approval/version view, evidence/review layout and dashboard; consistent Vietnamese text, dates and number formatting; readable long titles/notes; complete empty/loading/error/retrying/disabled states. Keyboard-only login->approval->screen->review works; labels/focus/dialog handling, non-color status indicators, adequate contrast and reduced-motion behavior. Verify 1440x900, 1024x768 and 390x844 in light/dark mode; evidence and actions remain usable without horizontal page overflow. Capture screenshots of populated, empty, pending, insufficient-coverage and failure states; visual approval is a review criterion, not just a passing unit test. Test commands: `pnpm --filter @rms-ai/web check`; browser preview/manual keyboard/viewport checks recorded with screenshots. Use Orca's browser workflow when executing visual verification.

### T8.11 — Final real-stack E2E, failure rehearsal and handoff gate

Dependencies: T8.10 and all preceding tasks. Write scope: `tests/e2e/`, `playwright.config.ts`, `scripts/verify-t8.*`, `docs/T8-validation.md`; append measured validation/troubleshooting to `docs/T8-demo.md`. Functional fixes stay in their feature owners' scopes and are applied serially before repeating the relevant gate.

Acceptance: Playwright drives real Nest, PostgreSQL, filesystem, Redis/BullMQ, worker and FastAPI in deterministic provider mode (no frontend mock); creates unique test records and verifies login -> JD draft/approval -> candidate/PDF -> application -> async result/evidence -> human note/decision -> dashboard/audit. Fresh browser login sees the same records; unauthorized download/unassigned job access fail. Include double-submit, approved-version tamper, refresh while running, provider timeout/retry, worker termination/restart and Redis outage/recovery. Verify measured status/create latency and at least one 60-second pending-state scenario using controlled delays; no fake result substitution. Seeded fixture display alone is not an end-to-end test.

Run one opt-in live-provider smoke using existing configured production models, record real duration/model/fingerprint and evidence/source consistency; do not assert unstable numerical scores. If credentials/network are unavailable, explicitly record live smoke as unverified, retain deterministic E2E evidence, and do not claim live success. Restore a DB+storage backup into disposable paths and check one download/result. Deliver screenshots/traces, exact commands, known limitations and a committee-ready checklist; no production-readiness claim.

Test commands: `pnpm check`; `pnpm --filter @rms-ai/e2e test`; `pnpm --filter @rms-ai/e2e test:recovery`; opt-in `pnpm --filter @rms-ai/e2e test:live`; `pnpm --filter @rms-ai/e2e test:restore`. Root recursive checks must not require a paid provider. T8.11 owns the E2E scripts/scenarios; T8.1 provides dependencies and command placeholders. A failure blocks completion until fixed, or is explicitly reported as a scoped external live-provider limitation.

### Max-two execution schedule and shared-file rules

1. T8.1 alone: contracts/schema/dependencies settled.
2. T8.2 + T8.3: Node auth/audit and Python integration are disjoint.
3. T8.4 + T8.5: jobs/JDs and candidates/files/apps use separate modules/tests.
4. T8.6 + T8.7: worker/backend and web shell in separate apps.
5. T8.8 alone: review/reporting API on completed run storage.
6. T8.9 alone: integrated web flow and deterministic demo setup.
7. T8.10 alone: UI polish, then freeze visual behavior.
8. T8.11 alone: final acceptance/failure rehearsals.

Only T8.1 changes shared package manifests/lockfile and initial root composition. Web files change sequentially T8.7 -> T8.9 -> T8.10. T8.2 audit writer and T8.8 reader are separate files. Each task owns its tests; T8.11 owns cross-feature scenarios. An executor reports an out-of-scope change requirement rather than concurrently editing another task's files. This schedule is a ceiling, not a requirement to launch workers.

## 4. Risks and open questions — defaults to execute

- **Does “single organization” still require access control?** Yes. Admin/recruiter are workspace-wide; reviewers are assigned per job. All data/count/file guards remain. No tenant code or tenant RLS is introduced.
- **Could the current storage service be reused?** RustFS exists, but filesystem is the default for fewer setup steps. Keep its compose definition untouched and start only postgres/redis for this path. Multi-host execution would require an S3 adapter and is deferred.
- **Must all original phases be built literally?** No. Preserve the visible end-to-end behavior with current extraction/retrieval/scoring; manual JD approval replaces optional generation and one screening job replaces speculative parse/index services. Do not rewrite research modules to satisfy a diagram.
- **AI configuration changes while a job is queued?** Pin a full manifest/build revision, check before execution, fail with config_changed instead of silently using a different model. New retry uses new config and a new run identity; archived results remain inspectable.
- **What is reproducible?** Stored inputs/config/source and deterministic scoring can be replayed. Hosted model generations may vary and a model alias may change despite the same identifier; record actual model metadata/time and never promise bit-for-bit LLM output.
- **Can repeated requests bill twice?** DB uniqueness/outbox/attempt fencing prevent duplicate stored runs/results. A crash after an external call can still cause a second charged call; maximum attempts and concurrency bound it. Do not claim exactly-once inference.
- **Slow OCR/retries exceed 60 seconds?** 60 seconds is an expectation for the curated small demo. Enforce the longer aggregate deadlines, keep UI usable, and show timeouts/failure honestly. Curate a readable synthetic fixture set and verify Tesseract availability ahead of the defense.
- **Evidence currently lacks full provenance?** T8.3 adds exact normalized source/page data and T8.6 stores it. Do not rerun extraction in Nest or invent page offsets. Distinguish file and text hashes; handle Unicode offset differences explicitly.
- **Can a recruiter approve their own JD?** Recruiters cannot approve. Admins/assigned reviewers can approve pending drafts; no additional “different author” rule is required. Keep actor and timestamp.
- **What happens to old decisions when a new screening arrives?** Existing human decision stays until a person submits another review, with the reviewed run visible. UI flags that the decision references an older run. New AI output never changes stage automatically.
- **Can closed jobs be screened or changed?** Historical reads/reviews remain available. New applications, screenings and JD approvals on closed jobs are blocked until an authorized admin/recruiter reopens the job. Pending runs accepted before closure may finish; closure does not erase history.
- **Can a resume be reused or replaced?** One immutable upload may be linked to several applications for the same candidate; each run pins its selected version. Replacement requires application revision check and cannot alter old runs. Candidate email is not a deduplication key.
- **Do we need live personal CVs or legal/provider policy claims?** No: synthetic/demo-public inputs only, documented provider disclosure and no sensitive-attribute criteria. Do not certify privacy/compliance or infer rights from existing dataset files. Real-PII deployment and automated retention/export are separate work.
- **What if no live provider is available on defense day?** Preflight it; keep persisted seeded examples and labeled deterministic full-stack mode available. Show which mode is active. Live acceptance remains separately reported, never silently simulated.
- **Is UI quality optional after functional tests?** No. T8.10 is a separate acceptance gate with screenshots, keyboard and responsive review. Use the existing Vietnamese design as the visual baseline; do not accept raw admin forms or missing loading/error states as complete.
- **Will tests destroy my data?** Explicit test DB names, Redis prefixes and temp roots are mandatory. Reset scripts refuse arbitrary DB/path/remote targets. Destructive local demo reset requires its explicit command; normal seeds and tests do not clear the workspace database.
- **What remains outside this delivery?** AI JD generation, persistent vector ingestion, bulk/DOCX, formal pilot/research expansion, real-PII lifecycle, multi-host/cloud deployment and production operations. They are future tasks, not hidden MVP prerequisites.

## 5. Completion definition

The plan is implemented when the full committee journey runs from a clean local setup, all included tasks pass their acceptance gates, deterministic real-stack E2E and recovery/restore checks pass, and UI evidence is reviewed. Report the optional live smoke separately with actual evidence. Final handoff must state the chosen config/mode, how to run/reset safely, where private data lives, what tests ran, and the explicit limitations above.
