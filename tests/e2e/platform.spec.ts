import {
  test,
  expect,
  login,
  api,
  info,
  control,
  jdBody,
  jsonOk,
  createCase,
  appUrl,
  start,
  runDetail,
  finished,
  consistency,
  evidence,
} from "./support";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

// Auth throttling is process-local (10 logins/IP/15 min). A fresh API per
// scenario preserves real security behavior while isolating repeated test logins.
test.beforeEach(async ({ request }) => {
  await control(request, "/api/restart");
});
test.afterEach(async ({ request }) => {
  const settings = await info(request);
  if (!settings.live) await control(request, "/fault", {});
  await control(request, "/redis/up");
});

test("full persisted browser journey, double submit, approved tamper and denied access", async ({
  page,
  browser,
}, testInfo) => {
  const internalRequests: string[] = [];
  page.on("request", (r) => {
    if (/8100|internal\/v1|api\/ai/.test(r.url()))
      internalRequests.push(r.url());
  });
  await login(page, "recruiter");
  const title = `T811 browser ${randomUUID()}`;
  await page.goto("/jobs");
  await page.getByRole("button", { name: "Tạo vị trí", exact: true }).click();
  await page.getByLabel("Tên vị trí tuyển dụng", { exact: true }).fill(title);
  const created = page.waitForResponse(
    (r) => r.url().endsWith("/api/v1/jobs") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Tạo vị trí tuyển dụng", exact: true })
    .click();
  const job = await (await created).json();
  await page.getByRole("button", { name: "Bản nháp mới", exact: true }).click();
  await page.getByRole("button", { name: "JSON", exact: true }).click();
  await page
    .getByLabel("Mô tả công việc dạng JSON")
    .fill(JSON.stringify({ id: job.id, ...jdBody }));
  const saved = page.waitForResponse(
    (r) =>
      r.url().endsWith(`/jobs/${job.id}/jd-versions`) &&
      r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Lưu bản nháp", exact: true }).click();
  let jd = await (await saved).json();
  await page
    .getByRole("button", { name: "Gửi phê duyệt", exact: true })
    .click();
  await expect(
    page.getByText("Đã gửi", { exact: false }).first(),
  ).toBeVisible();
  await login(page, "admin");
  await page.goto(`/jobs/${job.id}`);
  await page.getByRole("button", { name: "Phê duyệt JD", exact: true }).click();
  await expect(page.getByText("Đang sử dụng", { exact: true })).toBeVisible();
  jd = await (await page.request.get(`/api/v1/jd-versions/${jd.id}`)).json();
  const users = await (
    await page.request.get("/api/v1/users?pageSize=100")
  ).json();
  const reviewer = users.items.find(
    (u: any) => u.normalized_email === "reviewer@demo.example",
  );
  expect(reviewer).toBeTruthy();
  await jsonOk(
    await api(page, "PUT", `/jobs/${job.id}/assignments`, {
      user_ids: [reviewer.id],
    }),
    200,
  );
  const tamper = await api(page, "PATCH", `/jd-versions/${jd.id}`, {
    ...jdBody,
    title: "Tamper",
    revision: jd.revision,
  });
  expect(tamper.status()).toBe(409);
  expect((await control(page.request, "/tamper", { id: jd.id })).denied).toBe(
    true,
  );
  expect(
    (await (await page.request.get(`/api/v1/jd-versions/${jd.id}`)).json())
      .title,
  ).toBe(jdBody.title);
  await page.goto("/candidates");
  await page
    .getByRole("button", { name: "Thêm ứng viên", exact: true })
    .click();
  const name = `Taylor T811 ${randomUUID()}`;
  await page.getByLabel("Họ và tên").fill(name);
  const candidateResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/v1/candidates") && r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Tạo hồ sơ ứng viên", exact: true })
    .click();
  const candidate = await (await candidateResponse).json();
  const settings = await info(page.request);
  await page.getByLabel("Chọn CV PDF").setInputFiles(settings.pdf);
  const uploaded = page.waitForResponse(
    (r) =>
      r.url().endsWith(`/candidates/${candidate.id}/resumes`) &&
      r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Tải CV PDF", exact: true }).click();
  const resume = await (await uploaded).json();
  await page.getByLabel("Vị trí đang tuyển").selectOption(job.id);
  const linked = page.waitForResponse(
    (r) =>
      r.url().endsWith(`/jobs/${job.id}/applications`) &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Tạo hồ sơ ứng tuyển", exact: true })
    .click();
  const application = await (await linked).json();
  expect(application.candidate_display_name).toBe(name);
  const c = { job, jd, candidate, resume, application };
  await control(page.request, "/fault", { delay: 5 });
  const begunAt = performance.now();
  const admitted = page.waitForResponse(
    (r) =>
      r.url().endsWith(`/jobs/${job.id}/screenings`) &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Bắt đầu sàng lọc", exact: true })
    .click();
  const admission = await admitted;
  expect(admission.status()).toBe(202);
  const createLatencyMs = performance.now() - begunAt;
  expect(createLatencyMs).toBeLessThan(2000);
  const run = (await admission.json()).runs[0];
  expect(run.candidate_display_name).toBe(name);
  expect(Object.keys(run.requested_by_actor).sort()).toEqual([
    "display_name",
    "id",
  ]);
  const second = await start(page, c);
  expect(second.run.id).toBe(run.id);
  const key = randomUUID();
  const [a, b] = await Promise.all([start(page, c, key), start(page, c, key)]);
  expect(a.run.id).toBe(run.id);
  expect(b.run.id).toBe(run.id);
  await expect
    .poll(async () => (await runDetail(page, run.id)).status)
    .toBe("running");
  await page.goto(appUrl(c, run.id));
  await page.reload();
  await expect(page).toHaveURL(new RegExp(`run=${run.id}`));
  const completed = await finished(page, run.id);
  const provenance = consistency(
    completed,
    readFileSync(settings.pdf),
    "deterministic",
  );
  await expect(
    page.getByText("Chưa công bố điểm", { exact: false }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("Chưa có trích dẫn để đối chiếu.", { exact: true }).first(),
  ).toBeVisible();
  const download = page.waitForResponse((r) =>
    r.url().endsWith(`/resumes/${resume.id}/content`),
  );
  await page
    .getByRole("button", { name: /Mở đúng PDF của lần phân tích/ })
    .click();
  expect((await download).status()).toBe(200);
  const blobLink = page.getByRole("link", { name: "Mở PDF đã tải ↗" });
  await expect(blobLink).toBeVisible();
  const blobBytes = await blobLink.evaluate(async (a: HTMLAnchorElement) =>
    Array.from(new Uint8Array(await (await fetch(a.href)).arrayBuffer())),
  );
  expect(Buffer.from(blobBytes).equals(readFileSync(settings.pdf))).toBe(true);
  const bytes = await (
    await page.request.get(`/api/v1/resumes/${resume.id}/content`)
  ).body();
  expect(bytes.equals(readFileSync(settings.pdf))).toBe(true);
  const history = await (
    await page.request.get(`/api/v1/applications/${application.id}/screenings`)
  ).json();
  expect(history.total).toBe(1);
  const resultBefore = JSON.stringify(completed.result);
  const shortlistBefore = (
    await (await page.request.get("/api/v1/dashboard")).json()
  ).counts.shortlist;
  await evidence(testInfo, page, "deterministic-result", {
    ...provenance,
    runId: run.id,
    createLatencyMs,
    statusLatencyMs: completed.statusLatencyMs,
  });
  expect(completed.statusLatencyMs).toBeLessThan(1000);
  await login(page, "reviewer");
  await page.goto(appUrl(c, run.id));
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
  await page.getByRole("radio", { name: /Đưa vào danh sách ngắn/ }).check();
  const note =
    "Synthetic committee review: invite for an interview and verify Python experience.";
  await page
    .getByRole("textbox", { name: /Lý do & bước tiếp theo/ })
    .fill(note);
  await page.getByRole("button", { name: "Lưu quyết định của tôi" }).click();
  await expect(page.getByText(note, { exact: true })).toBeVisible();
  expect(JSON.stringify((await runDetail(page, run.id)).result)).toBe(
    resultBefore,
  );
  await evidence(testInfo, page, "human-decision", { note, runId: run.id });
  const fresh = await browser.newContext();
  const freshPage = await fresh.newPage();
  await login(freshPage, "recruiter");
  await freshPage.goto(appUrl(c, run.id));
  await expect(
    freshPage.getByText(name, { exact: true }).first(),
  ).toBeVisible();
  await expect(freshPage.getByText(note, { exact: true })).toBeVisible();
  expect((await runDetail(freshPage, run.id)).status).toBe("completed");
  await freshPage.goto("/");
  const dashboard = await (
    await freshPage.request.get("/api/v1/dashboard")
  ).json();
  expect(dashboard.counts.shortlist).toBe(shortlistBefore + 1);
  expect(
    dashboard.recent_applications.find((a: any) => a.id === application.id)
      .stage,
  ).toBe("shortlist");
  await evidence(testInfo, freshPage, "fresh-login-dashboard", dashboard);
  await fresh.close();
  const anonymous = await browser.newContext();
  expect(
    (
      await anonymous.request.get(
        `http://127.0.0.1:5173/api/v1/resumes/${resume.id}/content`,
      )
    ).status(),
  ).toBe(401);
  await anonymous.close();
  await login(page, "unassigned");
  expect((await page.request.get(`/api/v1/jobs/${job.id}`)).status()).toBe(404);
  expect(
    (await page.request.get(`/api/v1/resumes/${resume.id}/content`)).status(),
  ).toBe(404);
  await page.goto(appUrl(c, run.id));
  await expect(page.getByText(/chưa được cấp quyền/).first()).toBeVisible();
  await evidence(testInfo, page, "access-denied", {
    anonymousDownload: 401,
    unassignedJob: 404,
    unassignedDownload: 404,
  });
  await login(page, "admin");
  await page.goto("/audit");
  const audit = await (
    await page.request.get(`/api/v1/audit-events?job_id=${job.id}&pageSize=100`)
  ).json();
  const actions = audit.items.map((e: any) => e.action);
  for (const action of [
    "jd.approved",
    "screening.requested",
    "screening.completed",
    "review.created",
  ])
    expect(actions).toContain(action);
  const resumeAudit = await (
    await page.request.get(
      `/api/v1/audit-events?resource_id=${resume.id}&pageSize=100`,
    )
  ).json();
  const resumeActions = resumeAudit.items.map((e: any) => e.action);
  expect(resumeActions).toContain("resume.uploaded");
  expect(resumeActions).toContain("resume.download_authorized");
  const reviews = await (
    await page.request.get(`/api/v1/applications/${application.id}/reviews`)
  ).json();
  expect(reviews.items.find((r: any) => r.note === note).reviewer).toEqual({
    id: reviewer.id,
    display_name: reviewer.display_name,
  });
  expect(reviews.items.find((r: any) => r.note === note).reviewer_id).toBe(
    reviewer.id,
  );
  await evidence(testInfo, page, "audit", {
    actions,
    resumeActions,
    jobId: job.id,
  });
  expect(internalRequests).toEqual([]);
  await control(page.request, "/fault", {});
});

test("recovery: controlled 60-second pending state survives refresh", async ({
  page,
}, testInfo) => {
  await login(page);
  const c = await createCase(page);
  await control(page.request, "/fault", { delay: 66 });
  const begun = Date.now();
  const { run, elapsedMs } = await start(page, c);
  await page.goto(appUrl(c, run.id));
  await expect
    .poll(async () => (await runDetail(page, run.id)).status)
    .toBe("running");
  await page.reload();
  await expect(
    page
      .getByText(
        /Hồ sơ vẫn đang được xử lý|vẫn đang xử lý|vẫn đang phân tích|đang được xử lý/,
      )
      .first(),
  ).toBeVisible({ timeout: 80_000 });
  expect(Date.now() - begun).toBeGreaterThanOrEqual(60_000);
  await evidence(testInfo, page, "pending-over-60s", {
    elapsedMs: Date.now() - begun,
    createLatencyMs: elapsedMs,
    runId: run.id,
  });
  const result = await finished(page, run.id, 30_000);
  expect(result.status).toBe("completed");
  await control(page.request, "/fault", {});
});

test("recovery: provider timeout exhausts attempts, explicit retry preserves failure", async ({
  page,
}, testInfo) => {
  await login(page);
  const c = await createCase(page);
  await control(page.request, "/fault", { timeout: true });
  const begun = Date.now();
  const { run } = await start(page, c);
  const failed = await finished(page, run.id);
  expect(failed.status).toBe("failed");
  expect(failed.attempt_count).toBe(2);
  expect(failed.error_code).toBe("provider_unavailable");
  await page.goto(appUrl(c, run.id));
  await expect(
    page.getByRole("button", {
      name: "Thử lại bằng lần phân tích mới",
      exact: true,
    }),
  ).toBeVisible();
  await evidence(testInfo, page, "provider-timeout", {
    runId: run.id,
    durationMs: Date.now() - begun,
    errorCode: failed.error_code,
    attempts: failed.attempt_count,
  });
  await control(page.request, "/fault", {});
  const retryResponse = page.waitForResponse((r) =>
    r.url().endsWith(`/screenings/${run.id}/retries`),
  );
  await page
    .getByRole("button", {
      name: "Thử lại bằng lần phân tích mới",
      exact: true,
    })
    .click();
  const retry = (await (await retryResponse).json()).runs[0];
  expect(retry.id).not.toBe(run.id);
  expect((await finished(page, retry.id)).status).toBe("completed");
  expect((await runDetail(page, run.id)).status).toBe("failed");
  const history = await (
    await page.request.get(
      `/api/v1/applications/${c.application.id}/screenings`,
    )
  ).json();
  expect(history.total).toBe(2);
  await evidence(testInfo, page, "retry-completed", {
    oldId: run.id,
    newId: retry.id,
  });
});

test("recovery: kill worker in real provider call, restart after production lease", async ({
  page,
}, testInfo) => {
  await login(page);
  const c = await createCase(page);
  await control(page.request, "/fault", { delay: 90 });
  const { run } = await start(page, c);
  await expect
    .poll(async () => (await runDetail(page, run.id)).status)
    .toBe("running");
  // Give extraction time to reach the controlled provider before SIGKILL.
  await page.waitForTimeout(2000);
  const killedAt = Date.now();
  await control(page.request, "/worker/kill");
  await control(page.request, "/fault", {});
  await control(page.request, "/worker/start");
  await page.goto(appUrl(c, run.id));
  const recovered = await finished(page, run.id, 290_000);
  expect(recovered.status).toBe("completed");
  expect(recovered.attempt_count).toBe(2);
  expect(Date.now() - killedAt).toBeGreaterThan(220_000);
  await evidence(testInfo, page, "worker-restarted", {
    runId: run.id,
    recoveryMs: Date.now() - killedAt,
    attempts: recovered.attempt_count,
    leaseMs: 240000,
  });
});

test("recovery: Redis outage retains durable work and cold worker reconnects", async ({
  page,
}, testInfo) => {
  await login(page);
  const c = await createCase(page);
  await control(page.request, "/worker/kill");
  await control(page.request, "/redis/down");
  await control(page.request, "/worker/start");
  const { run, body, elapsedMs } = await start(page, c);
  expect(body.dispatch_state).toBe("degraded");
  expect((await runDetail(page, run.id)).status).toBe("queued");
  await page.goto(appUrl(c, run.id));
  await page.waitForTimeout(3000);
  expect(
    (await control(page.request, "/outbox", { id: run.id })).delivered_at,
  ).toBeNull();
  await evidence(testInfo, page, "redis-outage", {
    runId: run.id,
    createLatencyMs: elapsedMs,
    dispatch: body.dispatch_state,
  });
  const restoredAt = Date.now();
  await control(page.request, "/redis/up");
  expect((await finished(page, run.id, 30_000)).status).toBe("completed");
  await evidence(testInfo, page, "redis-recovered", {
    runId: run.id,
    recoveryMs: Date.now() - restoredAt,
  });
});

test("recovery: T8.6b first screening after idle and silently dropped producer socket dispatches promptly", async ({
  page,
}, testInfo) => {
  await login(page);
  const warm = await createCase(page);
  expect((await finished(page, (await start(page, warm)).run.id)).status).toBe(
    "completed",
  );
  const c = await createCase(page);
  await page.waitForTimeout(45_000);
  await control(page.request, "/redis/blackhole");
  const begun = Date.now();
  const { run, elapsedMs } = await start(page, c);
  await expect
    .poll(
      async () =>
        Boolean(
          (await control(page.request, "/outbox", { id: run.id })).delivered_at,
        ),
      { timeout: 5000, intervals: [100] },
    )
    .toBe(true);
  const deliveredMs = Date.now() - begun;
  expect(deliveredMs).toBeLessThan(4000);
  // No healthy second relay may mask the API's dead producer connection.
  expect((await runDetail(page, run.id)).status).toBe("queued");
  await control(page.request, "/worker/start");
  expect((await finished(page, run.id)).status).toBe("completed");
  await page.goto(appUrl(c, run.id));
  await evidence(testInfo, page, "idle-socket-regression", {
    idleMs: 45000,
    createLatencyMs: elapsedMs,
    deliveredMs,
    outbox: await control(page.request, "/outbox", { id: run.id }),
  });
});

test("restore: DB dump plus private storage into disposable targets, download and result", async ({
  page,
  browser,
}, testInfo) => {
  await login(page);
  const c = await createCase(page);
  const { run } = await start(page, c);
  const result = await finished(page, run.id);
  expect(result.status).toBe("completed");
  const before = await page.request.get(
    `/api/v1/resumes/${c.resume.id}/content`,
  );
  const bytes = await before.body();
  const restored = await control(page.request, "/restore");
  // Restored sessions are persisted; also check a wholly fresh browser login.
  const fresh = await browser.newContext();
  const restoredPage = await fresh.newPage();
  await login(restoredPage);
  const after = await restoredPage.request.get(
    `/api/v1/resumes/${c.resume.id}/content`,
  );
  expect(after.status()).toBe(200);
  expect((await after.body()).equals(bytes)).toBe(true);
  expect(JSON.stringify((await runDetail(restoredPage, run.id)).result)).toBe(
    JSON.stringify(result.result),
  );
  await restoredPage.goto(appUrl(c, run.id));
  await expect(
    restoredPage.getByText("Chưa công bố điểm", { exact: false }).first(),
  ).toBeVisible();
  await evidence(testInfo, restoredPage, "restored-result", {
    ...restored,
    runId: run.id,
    downloadBytes: bytes.length,
  });
  await fresh.close();
});

test("live: one opt-in production provider smoke @live", async ({
  page,
}, testInfo) => {
  const settings = await info(page.request);
  expect(settings.live).toBe(true);
  await login(page);
  const c = await createCase(page);
  const begun = Date.now();
  const { run, elapsedMs } = await start(page, c);
  await page.goto(appUrl(c, run.id));
  const result = await finished(page, run.id, 180_000);
  const provenance = consistency(result, readFileSync(settings.pdf), "live");
  expect(provenance.model).not.toBe("deterministic-v1");
  // No assertion on scores, classifications or quantity of live quotes.
  const quoteButton = page
    .locator("summary")
    .filter({ hasText: /Đối chiếu nguồn/ })
    .first();
  if (provenance.verifiedQuotes) {
    await expect(quoteButton).toBeVisible();
    await quoteButton.click();
    await expect(
      page.locator(".s-source[open] pre mark").first(),
    ).toBeVisible();
  }
  await evidence(testInfo, page, "live-provider", {
    ...provenance,
    durationMs: Date.now() - begun,
    createLatencyMs: elapsedMs,
    models: result.result.manifest.models,
    runId: run.id,
  });
});
