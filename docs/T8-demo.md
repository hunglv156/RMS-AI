# T8 demo operation guide

This guide runs the single-organization recruitment workspace ("lá.") locally for the committee demonstration in `docs/plans/T8-single-org-platform.md` §1. It is a local thesis demonstration. It is not a production deployment, and its scores are not calibrated hiring probabilities.

## 1. What runs where

| Process              | Port            | Start (from repo root)                                                           |
| -------------------- | --------------- | -------------------------------------------------------------------------------- |
| PostgreSQL (compose) | 127.0.0.1:55432 | `docker compose up -d postgres redis`                                            |
| Redis (compose)      | 127.0.0.1:56379 | (same command)                                                                   |
| AI service (FastAPI) | 127.0.0.1:8100  | `cd apps/ai-service && uv run uvicorn app.main:app --host 127.0.0.1 --port 8100` |
| Nest API             | 127.0.0.1:3100  | `pnpm --filter @rms-ai/api dev`                                                  |
| Screening worker     | (none)          | `pnpm --filter @rms-ai/api worker:dev`                                           |
| Web (Vite)           | 127.0.0.1:5173  | `pnpm --filter @rms-ai/web dev --host 127.0.0.1`                                 |

The browser talks only to `/api/v1` on the web origin, and Vite proxies that to the API. The browser never reaches the AI service. Uploaded PDFs live in private filesystem storage (`FILE_STORAGE_ROOT`) and are never served statically.

## 2. Environment

The demo uses a separate, disposable database, `rms_ai_demo`. It never uses your working `rms_ai` data. Export these variables in every terminal that starts the API, worker, seed, reset, backup or restore. Use an absolute storage path, because the API, worker and seed run from different directories.

```sh
export DATABASE_URL=postgresql://rms_ai:local_dev_only@127.0.0.1:55432/rms_ai_demo
export MIGRATION_DATABASE_URL=$DATABASE_URL
export REDIS_URL=redis://127.0.0.1:56379
export FILE_STORAGE_ROOT="$PWD/.local-data/rms-ai-demo-cvs"   # run from repo root
export APP_ORIGIN=http://127.0.0.1:5173                       # must match the URL you open
export DEMO_PASSWORD='choose-a-local-demo-password'           # >= 12 chars, synthetic accounts only
# Only if Postgres runs under a different compose project name:
# export COMPOSE_PROJECT_NAME=<project>
```

The API, worker and AI service also need `AI_INTERNAL_TOKEN`, and the AI service needs the LLM gateway settings (`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_TIMEOUT_S`). Keep them in the repo-root `.env`. The API loads it automatically, and you can load it for the AI service without printing it:

```sh
(set -a; . ./.env; set +a; cd apps/ai-service && uv run uvicorn app.main:app --host 127.0.0.1 --port 8100)
```

Never commit `.env` or paste its values into slides or logs.

### Provider mode: say it out loud

- **Live (default).** The AI service calls the configured production model (in the 2026-11-23 smoke: primary `ag/gemini-3.8-flash-low`, escalation `ag/gemini-4-argon-medium`). The results page shows "Nhà cung cấp trực tiếp" with the model name.
- **Deterministic (labeled).** Start the AI service with `AI_PROVIDER_MODE=deterministic` to demo offline. It returns "unknown" for every criterion, so runs land in insufficient coverage. The UI shows the label "CHẾ ĐỘ DEMO XÁC ĐỊNH · không dùng LLM thật" on both the start card and each result.
- **Seeded runs.** These are archived synthetic fixtures (`deterministic-v1`). Each one carries the deterministic label and a `SYNTHETIC ARCHIVE … not LLM inference` reason. Never present them as freshly generated output.

## 3. Fresh setup (reset + seed)

Stop the API and worker first. Then, from the repo root, with the environment above:

```sh
docker compose up -d postgres redis
node scripts/demo/reset.mjs --confirm rms_ai_demo
```

`reset.mjs` drops and recreates only `rms_ai_demo`, empties only `.local-data/rms-ai-demo-cvs`, then runs `db:migrate` and `db:seed`. It refuses to run in any of these cases:

- `--confirm rms_ai_demo` is missing.
- The database is not `rms_ai_demo` on local port 55432, or the host is remote.
- `MIGRATION_DATABASE_URL` differs from `DATABASE_URL`.
- The storage path is not this checkout's `.local-data/rms-ai-demo-cvs`, or it is a symlink.
- Docker is not a local socket.

To add the demo records to an existing database without resetting it, run `pnpm --filter @rms-ai/api db:seed`. It is idempotent: it adds only stable demo records, never overwrites passwords or user work, and refuses to overwrite a differing storage object.

### Seeded scenario (all synthetic)

| Account (`<name>@demo.example`, password = `DEMO_PASSWORD`) | Role                                                  |
| ----------------------------------------------------------- | ----------------------------------------------------- |
| `admin`                                                     | Administrator                                         |
| `recruiter`                                                 | Recruiter                                             |
| `reviewer`                                                  | Hiring manager, assigned to both demo jobs            |
| `unassigned`                                                | Reviewer with no assignments (used for denied access) |

- **Backend Software Engineer - Python/Postgres · Demo.** Approved JD v1, built from `data/eval/jds/jd-py-real.yaml` (7 weighted criteria, illustrative weights).
  - Minh Anh: scored 80.5, full coverage, shortlisted by Demo reviewer with a note.
  - Quốc Bảo: scored 42.94 at 85 % coverage; PostgreSQL is absent, so the run needs manual review. It awaits a decision.
  - Thu Hà: insufficient coverage. No score is published; the range shown is 0–100.
  - Gia Huy: an archived failed run (`config_changed`).
- **HR Generalist · Demo.** A draft JD from `jd-hr-real.yaml` with two applications waiting for approval. Use it to demonstrate the approval step.

Seeded totals are computed with a port of `apps/ai-service/app/scoring/engine.py`. They were cross-checked against the Python engine and match exactly. The PDFs are generated one-page synthetic files stamped `SYNTHETIC DEMO CV - NOT A REAL PERSON`.

## 4. Committee script (8–10 minutes)

Open `http://127.0.0.1:5173` (the same origin as `APP_ORIGIN`).

1. **Dashboard.** Log in as `recruiter`. The dashboard shows persisted counts, applications awaiting a decision, failures that need a retry, and recent applications.
2. **JD approval.** Open _Vị trí tuyển dụng_ → _Tạo vị trí_.
   1. Under _Mô tả công việc_, choose _+ Bản nháp mới_. Use the form, or paste JSON (the JSON tab accepts the `jd-py-real` title, summary and criteria).
   2. Choose _Lưu bản nháp_, then _Gửi phê duyệt_.
   3. Log in as `admin` (or the assigned reviewer) and choose _Phê duyệt JD_. Under _Phân công người đánh giá_, assign the reviewer.
   4. Try to edit the approved version; it is refused. _Nhân bản thành bản nháp_ creates a new draft. You can also approve the seeded HR draft here.
3. **Candidate and CV.** Go to _Ứng viên_ → _Thêm ứng viên_ and set the source to _Dữ liệu công khai dùng cho demo_ for a dev-set CV.
   1. Upload an English PDF.
   2. Link that exact version to the job with _Tạo hồ sơ ứng tuyển_.
   3. _Tải PDF gốc_ opens it through an authorized download. In a private window, `/api/v1/resumes/<id>/content` returns 401.
4. **Screening.** On the application, choose _Bắt đầu sàng lọc_. The request is saved at once ("Đã lưu yêu cầu…").
   - The run card shows queued/running/retry state, attempts and elapsed seconds.
   - Reload or leave the page; the run ID stays in the URL and history.
   - Polling runs every 2 s and backs off to 5 s after a minute. After 60 s a calm "still processing" message appears.
5. **Evidence.**
   - Score orb, coverage, score range and manual-review banner. Insufficient coverage shows "—", _Chưa đủ căn cứ đánh giá_ and _Chưa công bố điểm_, never 0.
   - For each criterion: verified quotes. _Đối chiếu nguồn · Trang N_ opens the normalized source with the quote highlighted at its verified Unicode offsets. When the offset or page is unknown, the UI says so and invents no page link.
   - _Mở đúng PDF của lần phân tích_ opens the original PDF separately.
6. **Human decision.** Log in as `reviewer`.
   1. In _Góc nhìn con người_, choose _Cân nhắc thêm / Đưa vào danh sách ngắn / Chưa phù hợp_, write the required note, and choose _Lưu quyết định của tôi_.
   2. The decision is stored as a separate record signed with the reviewer's name. The AI result above it is unchanged.
   3. If two reviewers race, the second gets a conflict message and keeps their note, with _Tải lại hồ sơ, giữ ghi chú của tôi_.
7. **Follow-through.** Revisit the job and the dashboard; the shortlist count changes.
   - As `admin`, open _Nhật ký hoạt động_ and filter by activity: JD approval, CV upload/download, screening requested/completed/failed, decision.
   - Log in as `unassigned`, open the application URL: "Không tìm thấy dữ liệu hoặc bạn chưa được cấp quyền" (the API returns 404).
8. **Failure and deliberate retry.**
   - **Archived failure.** Open Gia Huy. The failed run explains in Vietnamese that its frozen configuration no longer matches, and offers _Phân tích mới với cấu hình hiện tại_. A retry always reuses the original frozen config.
   - **Live failure** (recommended).
     1. Stop the AI service (Ctrl-C) and start a screening on an application with no live run, for example Gia Huy.
     2. After two attempts (about 8 s) it fails with "Không kết nối được dịch vụ phân tích…" (`transport_timeout`).
     3. Restart the AI service and choose _Thử lại bằng lần phân tích mới_. The retry creates a new run, keeps the failure in history, and completes.

## 5. Backup and restore (database + private PDFs together)

A backup is incomplete without the PDFs. The scripts always handle both.

```sh
node scripts/demo/backup.mjs /absolute/path/to/new-backup-dir
```

This writes `database.dump` (from `pg_dump -Fc`), `storage/<uuid>` copies and `manifest.json` (dump SHA-256 plus per-file SHA-256). The directory must not exist yet. Keep it private, because it holds CVs.

Restore only into an **empty** `rms_ai_demo` and an empty storage directory. Stop the API and worker, then:

```sh
docker exec -i <postgres-container> dropdb -U rms_ai rms_ai_demo
docker exec -i <postgres-container> createdb -U rms_ai rms_ai_demo
mv .local-data/rms-ai-demo-cvs .local-data/rms-ai-demo-cvs.old   # or delete it
node scripts/demo/restore.mjs --confirm rms_ai_demo /absolute/path/to/backup-dir
```

Restore verifies the dump and every PDF checksum before writing. It refuses non-empty targets, symlinks, unexpected files and duplicate keys. Afterwards, start the API and worker, then check that one authorized download returns the PDF and one persisted result opens.

## 6. Troubleshooting

- **"Địa chỉ trang chưa khớp cấu hình máy chủ"** (`invalid_origin`): open the exact `APP_ORIGIN` URL. `localhost` and `127.0.0.1` count as different origins.
- **"Đăng nhập sai quá nhiều lần"**: the API allows 10 login attempts per IP per 15 minutes, held in memory. Rehearsal scripts that log in often hit it; restart the API to clear it.
- **Starting a screening returns the existing run**: screening is idempotent on the immutable input (application, CV version, JD version, config). A changed JD version or AI config creates a new run.
- **`/health/ready` shows `worker: unknown`**: the worker heartbeat field is informational; it can read `unknown` while jobs still process normally. Check the worker terminal for errors.
- **Live output varies**: the same CV can score differently across live runs; in the smoke, `1.pdf` was scored once and insufficient once. Do not promise a specific number on stage.

## 7. Measured smoke (2026-11-23, live provider, local Mac)

These numbers come from a fresh `reset.mjs` setup, with the UI driven in headless Chromium through the steps above, using two dev-set CVs (`data/Python Developer/0.pdf` and `1.pdf`, the lowest-numbered sheets under the `set-10x2.yaml` selection rule). They are observations, not a benchmark.

| Step                                           | Duration                                        |
| ---------------------------------------------- | ----------------------------------------------- |
| Reset + migrate + seed                         | ~1.5 s                                          |
| Create job + JD draft + submit (UI)            | ~0.5 s                                          |
| CV upload                                      | 55–110 ms                                       |
| Start screening → saved ("Đã lưu yêu cầu")     | 150–180 ms                                      |
| Start → result visible in UI, CV 0             | 12.7–15.8 s (runs: 11.9–14.6 s queued→finished) |
| Start → result visible in UI, CV 1             | 13.1–22.7 s                                     |
| AI service down → failure visible (2 attempts) | ~8.4 s                                          |
| Retry after AI restart → result visible        | ~8.5 s                                          |
| Decision save                                  | 70–80 ms                                        |

T8.11 appends its measured validation and troubleshooting below this section.

## 8. Rehearse the final gate (T8.11, 2026-11-23)

The automated local rehearsal passed the seven deterministic full-stack scenarios, including a newly created browser journey, recovery and a database-plus-PDF restore. The detailed command results, evidence paths, live observation and committee checklist are in [T8-validation.md](T8-validation.md). These are local demonstration observations, not a production-readiness claim.

Stop any manually started API, worker, web or AI server before running the tests: they use ports 3100, 5173 and 8100 and refuse to share those ports. Keep the local PostgreSQL and Redis services available. The tests create separate disposable databases, private storage directories and queue names; they do not reset your working database or `rms_ai_demo`.

Load the external study environment in the process that runs the gate. You do not need to create or copy a `.env` file in this checkout:

```sh
(set -a; . /Users/hung/Study/RMS-AI/.env; set +a; node scripts/verify-t8.mjs)
```

That command runs the provider-free checks, deterministic browser suite, recovery suite and restore suite. Add `--live` to opt into one live smoke as well. The individual commands and measured results are recorded in the validation report. The supervisor stops its application servers when each suite ends. Private screenshots, traces, logs and backup files remain under `tests/e2e/test-results/`; keep them private.

The single T8.11 live smoke reached the result and source display in **23.0 seconds**, using `ag/gemini-3.8-flash-low` with `ag/gemini-4-argon-medium` configured for escalation. Three verified quotes matched the stored source offsets, and the source disclosure showed the highlighted quote. The recorded fingerprint was `d5db034ce9fb…`; the full value and trace are in the validation report. No score was asserted, and the next live result may differ.

### What the failure rehearsal showed

- **Long processing.** With a controlled 66-second delay, the page showed “Hồ sơ vẫn đang được xử lý — đôi khi mất hơn một phút.” at 61.4 seconds. Refresh preserved the run, and the result completed. You can leave the page while work continues.
- **Provider timeout.** Two automatic attempts exhausted after about 8 seconds with the injected timeout. Choosing **Thử lại bằng lần phân tích mới** after recovery completed a new run and kept the failed one in history.
- **Worker stopped during analysis.** Recovery waited for the original four-minute lease. The run then completed with a second attempt. A recently restarted worker does not make a previously running request fail immediately; keep the original run open while it recovers.
- **Redis unavailable.** The request was saved with degraded dispatch, then completed about 1.6 seconds after the test connection recovered. Refreshing did not lose it.
- **First screening after idle.** After 45 seconds without screenings and a silently dropped producer socket, the API alone delivered the new request to the queue in 694 ms, with one dispatch attempt. The worker was restarted only after that delivery was verified. If you see a long queued wait in a real rehearsal, check the API/worker logs for “Screening dispatch unavailable” and confirm that only one demo API/worker pair uses the shared queue.
- **Restore.** A stopped-writer backup restored into a separate disposable database and storage directory. A fresh login opened the saved result and downloaded the exact original PDF. Keep the database dump and private PDFs together when you use the manual backup procedure in section 5.

### If the test tooling stalls

If Node 26 stalls while installing the pinned browser, install it once from the repository root with:

```sh
pnpm dlx node@24 tests/e2e/node_modules/@playwright/test/cli.js install chromium
```

The application and final test commands still run on Node 26. The suite saves its browser traces directly to avoid the affected automatic trace-merge path. Open a saved trace with the Playwright trace viewer, or open the run's HTML report under `tests/e2e/playwright-report/`.

All five required T8.11 commands passed, including the separate five-case recovery suite and the single live smoke. The standalone restore verified seven private PDFs and four completed results. After the final run, the API, worker, AI service, web server, test helpers and reused PostgreSQL/Redis containers were stopped; start PostgreSQL and Redis again before your next rehearsal.
