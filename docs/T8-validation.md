# T8.11 final real-stack validation

Validation date: 2026-11-23. This gate is for the local, single-organization thesis demonstration in `docs/plans/T8-single-org-platform.md` §3 T8.11. It makes no production-readiness, score calibration, privacy/compliance, or exactly-once inference claim.

## Implementation and isolation

The suite starts the real Nest API, PostgreSQL, private filesystem storage, Redis/BullMQ, separate Node worker, FastAPI and Vite. No frontend routes or responses are mocked. The primary journey creates new UUID-tagged jobs, JD drafts/approvals, candidates, uploads, applications, screenings and human reviews; seeded archived results are not used as acceptance evidence.

Each invocation creates its own `rms_ai_test_t811_<timestamp>_<pid>` database, `rms_ai_test_t811_<timestamp>_<pid>_screenings` queue prefix and private `tests/e2e/test-results/stack-*/storage` root. Application servers use the ordinary loopback ports 3100, 5173 and 8100. A loopback-only test control server uses 3199, and a test-owned TCP proxy at 56380 forwards to the real Redis at 56379. Startup refuses occupied application/test ports. Neither the working database nor `rms_ai_demo` is reset. Disposable databases and private evidence remain available after the suite; all test-owned processes are stopped and only this invocation's Redis keys are removed. After the final gate, the reused local PostgreSQL and Redis containers are also stopped as requested.

`tests/e2e/provider.py` wraps the explicit deterministic provider dependency to introduce a controlled delay or raise the provider's real `LLMTimeoutError`. The original authenticated screening endpoint still performs PDF extraction in its subprocess, source normalization, pipeline validation, scoring and serialization. It does not substitute a stored result or change the manifest to pretend to be live. In live mode the supervisor runs the unmodified `app.main:app`, without this test wrapper. The live test is excluded from default tests and root recursive checks.

Worker termination uses an actual process-group SIGKILL during a running call. Lease recovery waits for the unchanged 240-second runtime lease; no database lease/attempt/result fields are patched. Redis outage destroys proxy transports and refuses reconnects, including a worker started while Redis is unreachable. The idle regression waits 45 seconds after a warm completion, silently black-holes the API producer's old socket without FIN/RST, then checks prompt delivery of fresh work. In the hardened regression, the worker stays stopped until the API alone has delivered the outbox event, preventing a healthy second relay from masking the stale socket; the worker is then restarted for real completion. During fault scenarios, shared Redis is never flushed or stopped; final shutdown stops the reused containers after all checks finish.

Backup/restore quiesces the API and worker, executes real `pg_dump -Fc`, hashes the dump and every storage object, verifies those hashes, restores with `pg_restore --single-transaction --exit-on-error` into a newly created suffixed test database and a separate empty storage directory, then boots the API against those targets. A fresh browser logs in, downloads identical PDF bytes and opens the identical persisted result. This exercises the PostgreSQL/storage recovery procedure; it does not bypass or alter the separately guarded demo scripts, whose fixed `rms_ai_demo`/checkout-storage targets are deliberately not used for this disposable test.

## Commands and results

Environment: Node v26.12.0, pnpm 9.15.4, Playwright 1.58.1 / Chromium 145.0.7632.6 on this local Mac.

- `pnpm install --frozen-lockfile` — exit 0; no dependency or lockfile change.
- `docker compose up -d postgres redis` — attempted, exit 1 because existing local services occupied 55432/56379; `docker compose -p m7-foundation up -d postgres redis` — exit 0, reused those services and volumes. No RustFS service was started.
- `pnpm check` — exit 0, approximately 23.2 s (log span): contracts generation/typecheck; AI lint/format and 320 passed / 3 existing opt-in skips; API typecheck, 10 unit tests and build; web lint/typecheck, 67 tests and build; E2E scenario discovery without starting a stack or calling a provider.
- `pnpm --filter @rms-ai/e2e test` — exit 0, **7/7 passed**, 407.337 s including startup, zero retries/skips/flaky results. JSON: `tests/e2e/test-results/report-1795405607962.json`; trace/screenshots: `tests/e2e/test-results/pw-1795405607962/`; process/backup evidence: `tests/e2e/test-results/stack-1795405608099_14463/`.
- `pnpm --filter @rms-ai/e2e test -- --grep 'full persisted'` — exit 0, **1/1 passed**, 20.259 s including startup (`report-1795406044961.json`), after tightening the exact dashboard increment, review author and resume upload/download audit assertions.
- `pnpm --filter @rms-ai/e2e test:recovery` — exit 0, **5/5 passed**, 395.534 s including startup; `tests/e2e/test-results/report-1795406109008.json` and `pw-1795406109008/`.
- `pnpm --filter @rms-ai/e2e test -- --grep T8.6b` — exit 0, **1/1 passed**, 56.928 s including startup, after hardening the fault test to prove API-only dispatch before worker restart; `tests/e2e/test-results/report-1795406537607.json` and `pw-1795406537607/`.
- `pnpm --filter @rms-ai/e2e test:live` — exit 0, **1/1 passed**, **31.761 s** including startup. Exactly one opt-in live smoke was run in this task; the unmodified FastAPI app used the existing configured production models. Evidence: `tests/e2e/test-results/report-1795406606432.json`, `pw-1795406606432/`, and `stack-1795406606557_21973/`.
- `pnpm --filter @rms-ai/e2e test:restore` — exit 0, **1/1 passed**, **12.412 s** including startup (**5.150 s** scenario). Evidence: `tests/e2e/test-results/report-1795406758065.json`, `pw-1795406758065/`, and `stack-1795406758202_23349/`. The backup verified/restored **7 private PDF files**, **4 completed results**, exact selected result JSON and the selected **1091-byte** PDF after a fresh login. Target: `rms_ai_test_t811_1795406758202_23349_restore`, with separate `restored-storage/` under that stack directory.
- `git diff --check`, `node --check scripts/verify-t8.mjs`, and final E2E scenario discovery — exit 0. No commit was made, no helper agent/worker was started, and source changes stayed within T8.11's write scope. No functional application defect required an owner fix; corrections were confined to the E2E fixtures, fault isolation, trace handling and stable screenshot capture. The restore command was repeated after disabling finite screenshot animations, so the final restored-result capture is fully readable.

Measured observations (default suite unless a targeted replay is named; local synthetic input, no benchmark claim):

- Browser screening admission: **136.8 ms**; authenticated status read: **28.7 ms**. The test enforces admission <2 s and the measured status read <1 s.
- Controlled 66-second provider delay: long-wait message captured at **61.382 s**; scenario completed in **69.019 s**, with the selected run surviving refresh.
- Provider timeout: two attempts exhausted in **7.977 s**; an explicit retry completed as a different run, retaining the original failed record. The complete scenario took **10.066 s**.
- SIGKILL after running claim: recovered with two attempts **238.682 s after kill**, respecting the 240 s lease measured from its earlier claim/heartbeat; complete scenario **244.606 s**.
- Redis down admission: durable degraded 202 in **80.0 ms**; completion **1.568 s** after proxy recovery, including the cold-started worker. Complete scenario **8.226 s**.
- First screening after **45 s** without screenings, with the old API producer socket silently black-holed: the hardened API-only replay admitted in **82.6 ms** and delivered the durable outbox in **694 ms**, with **one** delivery attempt and no last error. The run stayed queued until the worker was explicitly restarted and then completed. Complete scenario **50.713 s**. The earlier default-suite observation (107 ms, both relays available) is supplementary; the API-only replay is the regression proof.
- Restore scenario: **3.804 s**; restored database contained **11 completed results** and the selected PDF was byte-identical (**1091 bytes**). The disposable target was `rms_ai_test_t811_1795405608099_14463_restore`, with private files under that run directory's `restored-storage/`.

The live smoke took **22.990 s from screening start to result/source display**, with **53.3 ms admission**, primary/returned model **`ag/gemini-3.8-flash-low`**, and configured escalation model **`ag/gemini-4-argon-medium`**. Its fingerprint was **`d5db034ce9fbbd521da5def96f274777a5bdce0e314b21f26cd954371506ad42`**. All **three verified quotes** matched their Unicode code-point slices in the stored source, its normalized SHA-256 matched the hash reported below, and the browser opened a source disclosure with a visible highlighted quote. Run ID: `5e2b1cd9-6dd0-4d48-98e3-6a0106b49d30`. No score, classification, coverage threshold or quote count was asserted as a stable live outcome.

The deterministic result fingerprint was `30dab7b9205607710bb9b6e92f3abf51a8243bf32aa4141318be0d2e138b8a98`; the normalized synthetic source SHA-256 was `df2b56d2027f09d5a7ba7e29a6efe79955e527060868b701557bc2d3813e216f`.

Credentials are inherited in memory using the external study environment; its contents are never printed, copied, or written into this checkout:

```sh
(set -a; . /Users/hung/Study/RMS-AI/.env; set +a; pnpm --filter @rms-ai/e2e test)
(set -a; . /Users/hung/Study/RMS-AI/.env; set +a; pnpm --filter @rms-ai/e2e test:recovery)
(set -a; . /Users/hung/Study/RMS-AI/.env; set +a; pnpm --filter @rms-ai/e2e test:live)
(set -a; . /Users/hung/Study/RMS-AI/.env; set +a; pnpm --filter @rms-ai/e2e test:restore)
```

`pnpm check` needs no provider credentials. `node scripts/verify-t8.mjs` runs the deterministic check/test/recovery/restore gates; adding `--live` opts into exactly one live test as well. Run that supervisor from the repository root in the same environment-loading subshell.

## Evidence and interpretation

Screenshots and actual browser traces are retained under `tests/e2e/test-results/pw-*/`, JSON gate reports under `tests/e2e/test-results/report-*.json`, HTML reports under `tests/e2e/playwright-report/<run-id>/`, and private process logs/backup manifests under `tests/e2e/test-results/stack-*/`. These paths are already ignored by Git. They contain synthetic accounts, sessions and CVs and should remain private; they are not a public distribution bundle.

The default deterministic provider deliberately returns unknown criteria and no quotes. The suite verifies the visible deterministic label, absent-evidence message, withheld score, exact source text/hash/page bounds and a human decision that leaves the AI result unchanged. It does not invent deterministic evidence quotes. The separate live smoke verifies every returned valid quote against Unicode code-point offsets in the stored normalized text, records model/fingerprint/duration, and opens source evidence when quotes are present. It asserts no score, classification or quote count.

Playwright 1.58.1's automatic ZIP merge and browser ZIP extraction stalled with Node v26.12.0 on this Mac. The test fixture saves each real browser-context trace directly, avoiding automatic trace merging; final test commands still use Node 26. Browser installation was completed once with `pnpm dlx node@24 tests/e2e/node_modules/@playwright/test/cli.js install chromium`. The final suite uses its pinned Chromium headless shell, not a personal browser profile. Fresh secondary browser contexts receive screenshots; the main context gets the complete trace. Download checks read the UI-created PDF blob and make an independent authenticated API request rather than relying solely on the browser protocol's response-body capture.

## Known limitations

- These are local acceptance observations, not throughput/load benchmarks or availability guarantees.
- Shared PostgreSQL and Redis containers are reused; faults affect only the test proxy/namespace. This is transport outage/recovery, not a host reboot, disk failure or real container data-loss drill. T8.6's integration suites separately cover queue reconstruction after namespaced Redis loss.
- The worker's production 240-second lease intentionally makes the SIGKILL case slow. External calls can finish after a killed worker or be repeated after recovery; database attempt fencing protects persisted results, not billing exactly once.
- The deterministic fault provider is test instrumentation. The live smoke is one observation against configured production model aliases, whose output may vary.
- Tests use the local migration owner for provisioning/runtime, and separately `SET LOCAL ROLE rms_app` for the direct SQL tamper check. They do not provision or certify a production database login.
- The backup and restore are a stopped-writer rehearsal on this local PostgreSQL version. Offsite retention, encryption/key recovery, point-in-time recovery and multi-host storage are outside this gate.
- Login throttling remains active. The suite restarts only its API before each scenario to isolate the real process-local 10-login limit; it never disables or changes auth policy.
- The synthetic test control endpoints are bound to loopback in the test supervisor only; they are not application routes and must not be exposed as a deployment service.
- The existing readiness response can still report worker status `unknown`; completed jobs and the recovery evidence establish observed worker processing.

## Committee handoff checklist

- [x] Create a fresh job, author and submit a JD, approve it through the browser, and reject HTTP/direct application-role SQL tampering.
- [x] Create a fresh candidate, upload a synthetic PDF, link its exact version, and download identical bytes through the UI and authorized API.
- [x] Persist a durable fast request, reuse the same run for sequential/concurrent double-submit, and survive a running-page refresh.
- [x] Show the deterministic label, unknown criteria, withheld score and honest absence of quotes; verify normalized source hash/page bounds.
- [x] Save an assigned reviewer's required note, preserve the AI result, persist across a fresh browser login, and increment the dashboard shortlist exactly once.
- [x] Record JD, screening and review audit actions plus PDF upload/download events; deny anonymous download and unassigned job/resume reads.
- [x] Capture a real pending state beyond 60 seconds, exhaust provider timeout attempts and preserve failure history on explicit retry.
- [x] Recover after SIGKILL using the real lease and after Redis transport outage with a cold-started worker.
- [x] Restore database plus private storage into separate disposable targets, then verify a fresh login, saved result and exact PDF bytes.
- [x] Prove API-only dispatch after an idle/dead socket, then restart the worker and complete real work.
- [x] Run the separate five-case recovery command and exactly one live smoke, recording real model/fingerprint/duration and verified source evidence.
- [x] Run the standalone restore command and verify fresh-login persisted result/PDF parity.
- [x] Save readable screenshots and valid browser traces, record every required command and its limits, and stop all stack servers.

Before presenting, Dylan still chooses the visibly disclosed provider mode, starts the demo stack using section 2 of `T8-demo.md`, performs its fresh-setup/reset procedure only against the explicitly guarded demo targets, and checks the live provider if that mode will be shown. This operator preflight is separate from the automated acceptance results above.

## Shutdown and retained evidence

The supervisor stopped every API, worker, FastAPI, Vite, control-server and Redis-proxy process it started. `docker compose -p m7-foundation stop postgres redis` then completed with exit 0, stopping the reused PostgreSQL/Redis containers as requested. Final port checks confirmed 3100, 5173, 8100, 3199, 56380, 55432 and 56379 were closed; no task worker remained running. Restart the local PostgreSQL/Redis services before repeating a gate. Disposable test databases persist in that local PostgreSQL volume, and private storage/dumps/traces remain in this workspace at the evidence paths above; no working/demo data was reset or deleted.

The canonical gate logs are `tests/e2e/test-results/gate-{check,test,journey,recovery,idle,live,restore}.log`. Earlier diagnostic reports in the same ignored artifact directories are not the final gate evidence. The canonical report IDs above distinguish the final successful runs. The directly saved trace ZIPs in those canonical runs were checked for archive integrity, and the deterministic result, >60-second pending, live source and restored-result screenshots were inspected. T8.10's broader responsive/keyboard/visual review remains documented in its existing validation report; this gate does not replace committee visual review.
