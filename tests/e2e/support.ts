import {
  test as base,
  expect,
  type Page,
  type APIRequestContext,
  type TestInfo,
} from "@playwright/test";
import { createHash, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
export { expect };
// Avoid Playwright 1.58's Node 26 ZIP merge path: save the real browser trace
// directly. No trace is fabricated or omitted, and API calls on page.request
// belong to this same browser context. Separate fresh contexts get screenshots.
export const test = base.extend({
  context: async ({ context }, use, testInfo) => {
    await context.tracing.start({
      screenshots: true,
      snapshots: true,
      sources: true,
    });
    await use(context);
    const path = testInfo.outputPath("trace.zip");
    await context.tracing.stop({ path });
    await testInfo.attach("trace", { path, contentType: "application/zip" });
  },
});
export const jdBody = {
  title: "Synthetic Python Engineer",
  summary: "Assess documented backend experience only.",
  criteria: [
    {
      code: "python",
      label: "Python APIs",
      description: "Experience building Python APIs.",
      weight: 1,
      priority: "must_have",
      keywords: ["Python"],
    },
    {
      code: "sql",
      label: "PostgreSQL",
      description: "Experience writing PostgreSQL SQL queries.",
      weight: 1,
      priority: "nice_to_have",
      keywords: ["PostgreSQL", "SQL"],
    },
  ],
};
export async function control(
  request: APIRequestContext,
  path: string,
  data?: object,
) {
  const response = await request.post(`http://127.0.0.1:3199${path}`, {
    data: data ?? {},
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json();
}
export async function info(request: APIRequestContext) {
  return control(request, "/info");
}
export async function login(page: Page, role = "admin") {
  const settings = await info(page.request);
  await page.goto("/login");
  await expect(
    page
      .getByLabel("Email công việc")
      .or(page.getByRole("button", { name: /Đăng xuất/ }))
      .first(),
  ).toBeVisible();
  // Always a new real login, even if this page already has a session.
  if (!(await page.getByLabel("Email công việc").isVisible())) {
    await page.getByRole("button", { name: /Đăng xuất/ }).click();
  }
  await page.getByLabel("Email công việc").fill(`${role}@demo.example`);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(settings.password);
  await page.getByRole("button", { name: "Đăng nhập →" }).click();
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.getByLabel("Email công việc")).toHaveCount(0);
}
export async function api(
  page: Page,
  method: string,
  path: string,
  data?: any,
  headers: Record<string, string> = {},
) {
  const me = await page.request.get("/api/v1/auth/me");
  const session = await me.json();
  return page.request.fetch(`/api/v1${path}`, {
    method,
    data,
    headers: {
      Origin: "http://127.0.0.1:5173",
      "X-CSRF-Token": session.csrf_token,
      ...headers,
    },
  });
}
export async function jsonOk(response: any, status?: number) {
  expect(response.status(), await response.text()).toBe(status ?? 201);
  return response.json();
}
export async function createCase(page: Page) {
  const job = await jsonOk(
    await api(page, "POST", "/jobs", { title: `T811 ${randomUUID()}` }),
  );
  let jd = await jsonOk(
    await api(page, "POST", `/jobs/${job.id}/jd-versions`, jdBody),
  );
  jd = await jsonOk(
    await api(page, "POST", `/jd-versions/${jd.id}/submit`, {
      revision: jd.revision,
    }),
    200,
  );
  jd = await jsonOk(
    await api(page, "POST", `/jd-versions/${jd.id}/approve`, {
      revision: jd.revision,
    }),
    200,
  );
  const candidate = await jsonOk(
    await api(page, "POST", "/candidates", {
      display_name: `Synthetic ${randomUUID()}`,
      provenance: "synthetic",
    }),
  );
  const settings = await info(page.request);
  const me = await (await page.request.get("/api/v1/auth/me")).json();
  const upload = await page.request.post(
    `/api/v1/candidates/${candidate.id}/resumes`,
    {
      headers: {
        Origin: "http://127.0.0.1:5173",
        "X-CSRF-Token": me.csrf_token,
      },
      multipart: {
        cv: {
          name: "synthetic.pdf",
          mimeType: "application/pdf",
          buffer: readFileSync(settings.pdf),
        },
      },
    },
  );
  const resume = await jsonOk(upload);
  const application = await jsonOk(
    await api(page, "POST", `/jobs/${job.id}/applications`, {
      candidate_id: candidate.id,
      resume_id: resume.id,
    }),
  );
  return { job, jd, candidate, resume, application };
}
export const appUrl = (c: any, run?: string) =>
  `/applications/${c.application.id}?job=${c.job.id}${run ? `&run=${run}` : ""}`;
export async function start(page: Page, c: any, key = randomUUID()) {
  const before = performance.now();
  const r = await api(
    page,
    "POST",
    `/jobs/${c.job.id}/screenings`,
    { application_ids: [c.application.id], jd_version_id: c.jd.id },
    { "Idempotency-Key": key },
  );
  const elapsedMs = performance.now() - before;
  expect(r.status(), await r.text()).toBe(202);
  const body = await r.json();
  return { run: body.runs[0], elapsedMs, body };
}
export async function runDetail(page: Page, id: string) {
  const before = performance.now();
  const r = await page.request.get(`/api/v1/screenings/${id}`);
  const elapsedMs = performance.now() - before;
  expect(r.status()).toBe(200);
  return { ...(await r.json()), statusLatencyMs: elapsedMs };
}
export async function finished(page: Page, id: string, timeout = 45_000) {
  await expect
    .poll(async () => (await runDetail(page, id)).status, {
      timeout,
      intervals: [500, 1000],
    })
    .toMatch(/completed|failed/);
  return runDetail(page, id);
}
export function consistency(run: any, pdf: Buffer, mode: string) {
  const r = run.result;
  expect(run.status).toBe("completed");
  expect(r.manifest.mode).toBe(mode);
  expect(r.fingerprint).toBe(r.manifest.fingerprint);
  expect(r.fingerprint).toMatch(/^[a-f0-9]{64}$/);
  const source = r.source;
  expect(source.text).toContain("Taylor Example");
  expect(source.offset_unit).toBe("unicode_code_points");
  expect(createHash("sha256").update(source.text).digest("hex")).toBe(
    source.normalized_text_sha256,
  );
  expect(r.screening.versions.cv_sha256).toBe(source.normalized_text_sha256);
  expect(createHash("sha256").update(pdf).digest("hex")).not.toBe(
    source.normalized_text_sha256,
  );
  expect(source.pages.length).toBeGreaterThan(0);
  const chars = Array.from(source.text);
  for (const page of source.pages) {
    expect(page.start_offset).toBeGreaterThanOrEqual(0);
    expect(page.end_offset).toBeLessThanOrEqual(chars.length);
  }
  let verified = 0;
  for (const c of r.screening.criteria)
    for (const e of c.evidence) {
      if (e.verification.valid) {
        verified++;
        expect(
          chars
            .slice(e.verification.start_offset, e.verification.end_offset)
            .join(""),
        ).toBe(e.evidence.quote);
      }
    }
  return {
    verifiedQuotes: verified,
    model: r.screening.llm.model,
    fingerprint: r.fingerprint,
    sourceHash: source.normalized_text_sha256,
  };
}
export async function evidence(
  testInfo: TestInfo,
  page: Page,
  name: string,
  data: any,
) {
  await testInfo.attach(`${name}.json`, {
    body: JSON.stringify(data, null, 2),
    contentType: "application/json",
  });
  await page.screenshot({
    path: testInfo.outputPath(`${name}.png`),
    fullPage: true,
    animations: "disabled",
  });
}
