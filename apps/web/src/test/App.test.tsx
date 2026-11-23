import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
  vi,
  type MockInstance,
} from "vitest";
import App from "../App";
import userEvent from "@testing-library/user-event";
import { createPlatformClient } from "../lib/api/platform";
import type {
  Session,
  Job,
  JdVersion,
  Candidate,
  Resume,
} from "@rms-ai/contracts";
const uid = "00000000-0000-4000-8000-000000000001",
  jid = "00000000-0000-4000-8000-000000000011",
  cid = "00000000-0000-4000-8000-000000000021",
  rid = "00000000-0000-4000-8000-000000000031",
  aid = "00000000-0000-4000-8000-000000000041",
  vid = "00000000-0000-4000-8000-000000000051",
  time = "2026-11-23T08:00:00.000Z";
const session: Session = {
  user: {
    id: uid,
    normalized_email: "admin@demo.example",
    display_name: "Demo Admin",
    role: "admin",
    created_at: time,
    disabled_at: null,
  },
  csrf_token: "session-csrf-token",
  allowed_actions: ["jobs.create"],
  expires_at: "2026-11-24T08:00:00.000Z",
};
const job: Job = {
  id: jid,
  title: "Backend Engineer",
  status: "open",
  active_jd_version_id: null,
  revision: 1,
  created_by: uid,
  created_at: time,
  updated_at: time,
};
const candidate: Candidate = {
  id: cid,
  display_name: "Ứng viên Tổng hợp",
  email: null,
  phone: null,
  provenance: "synthetic",
  created_by: uid,
  created_at: time,
  updated_at: time,
};
const resume: Resume = {
  id: rid,
  candidate_id: cid,
  version_no: 1,
  original_filename: "demo.pdf",
  mime_type: "application/pdf",
  byte_size: 8,
  file_sha256: "a".repeat(64),
  status: "uploaded",
  uploaded_by: uid,
  uploaded_at: time,
};
const version: JdVersion = {
  id: vid,
  job_id: jid,
  version_no: 1,
  title: job.title,
  summary: "Build services",
  criteria: [
    {
      code: "python",
      label: "Python",
      description: "Build Python APIs",
      weight: 1,
      priority: "must_have",
      keywords: ["python"],
    },
  ],
  state: "draft",
  revision: 1,
  submitted_by: null,
  submitted_at: null,
  approved_by: null,
  approved_at: null,
  content_sha256: null,
  created_by: uid,
  created_by_actor: { id: uid, display_name: "Demo Admin" },
  created_at: time,
};
const page = (items: unknown[]) => ({
  items,
  total: items.length,
  page: 1,
  pageSize: 20,
});
const response = (body: unknown, status = 200) =>
  new Response(status === 204 ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
let fetchMock: MockInstance<typeof fetch>;
beforeEach(() => {
  window.history.replaceState({}, "", "/");
  fetchMock = vi.spyOn(globalThis, "fetch");
});
afterEach(() => vi.restoreAllMocks());
function mount() {
  render(<App client={createPlatformClient()} />);
}
describe("platform journeys over contract-valid HTTP", () => {
  it("logs in, sends credentials/CSRF and logs out without storing session tokens", async () => {
    fetchMock.mockImplementation(async (input, init) => {
      const path = String(input);
      if (path.endsWith("/auth/me"))
        return response({ error: { code: "unauthenticated" } }, 401);
      if (path.endsWith("/auth/login")) return response(session);
      if (path.endsWith("/auth/logout")) {
        expect(init?.credentials).toBe("same-origin");
        expect(init?.headers).toMatchObject({
          "X-CSRF-Token": session.csrf_token,
        });
        return response(null, 204);
      }
      throw Error(path);
    });
    mount();
    fireEvent.change(await screen.findByLabelText("Email công việc"), {
      target: { value: "admin@demo.example" },
    });
    fireEvent.change(screen.getByLabelText("Mật khẩu"), {
      target: { value: "synthetic-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Đăng nhập →" }));
    expect(
      await screen.findByRole("heading", { name: "Chào Demo Admin," }),
    ).toBeVisible();
    expect(
      fetchMock.mock.calls.find((c) =>
        String(c[0]).endsWith("/auth/login"),
      )?.[1],
    ).toMatchObject({ credentials: "same-origin", method: "POST" });
    expect(
      fetchMock.mock.calls.some((c) => String(c[0]).includes("/internal/")),
    ).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Đăng xuất" }));
    expect(await screen.findByLabelText("Email công việc")).toBeVisible();
  });
  it("saves draft edits with revision, submits and approves an immutable version", async () => {
    let jd = structuredClone(version);
    fetchMock.mockImplementation(async (input, init) => {
      const p = String(input),
        m = init?.method ?? "GET";
      if (p.endsWith("/auth/me")) return response(session);
      if (p === `/api/v1/jobs/${jid}`) return response(job);
      if (p.includes("/applications?")) return response(page([]));
      if (p.includes("/users?")) return response(page([]));
      if (p.includes("/jd-versions?")) return response(page([jd]));
      if (p === `/api/v1/jd-versions/${vid}` && m === "PATCH") {
        const b = JSON.parse(String(init?.body));
        expect(b.revision).toBe(1);
        expect(b).not.toHaveProperty("id");
        expect(init?.headers).toMatchObject({
          "X-CSRF-Token": session.csrf_token,
        });
        jd = { ...jd, ...b, revision: 2 };
        return response(jd);
      }
      if (p.endsWith("/submit")) {
        expect(JSON.parse(String(init?.body))).toEqual({ revision: 2 });
        jd = {
          ...jd,
          state: "pending_approval",
          revision: 3,
          submitted_at: time,
          submitted_by: uid,
          submitted_by_actor: { id: uid, display_name: "Demo Admin" },
        };
        return response(jd);
      }
      if (p.endsWith("/approve")) {
        expect(JSON.parse(String(init?.body))).toEqual({ revision: 3 });
        jd = {
          ...jd,
          state: "approved",
          revision: 4,
          approved_at: time,
          approved_by: uid,
          approved_by_actor: { id: uid, display_name: "Demo Admin" },
          content_sha256: "b".repeat(64),
        };
        return response(jd);
      }
      throw Error(`${m} ${p}`);
    });
    window.history.replaceState({}, "", `/jobs/${jid}`);
    mount();
    expect(
      await screen.findByText(
        (_, e) =>
          e?.tagName === "LI" &&
          /^Tạo.+ · Demo Admin \(bạn\)$/.test(e.textContent ?? ""),
      ),
    ).toBeVisible();
    expect(screen.queryByText(/00000001/)).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "Chỉnh sửa" }));
    fireEvent.change(screen.getByLabelText("Tóm tắt công việc"), {
      target: { value: "Updated services" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Lưu bản nháp" }));
    await waitFor(() =>
      expect(
        fetchMock.mock.calls.filter((c) =>
          String(c[0]).includes("/jd-versions?"),
        ).length,
      ).toBeGreaterThanOrEqual(2),
    );
    await screen.findByText("Updated services");
    fireEvent.click(
      await screen.findByRole("button", { name: "Gửi phê duyệt" }),
    );
    expect(
      await screen.findByText(
        (_, e) =>
          e?.tagName === "LI" &&
          /^Gửi duyệt.+ · Demo Admin \(bạn\)$/.test(e.textContent ?? ""),
      ),
    ).toBeVisible();
    fireEvent.click(
      await screen.findByRole("button", { name: "Phê duyệt JD" }),
    );
    expect(await screen.findByText("Đã phê duyệt")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Chỉnh sửa" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Nhân bản thành bản nháp" }),
    ).toBeEnabled();
  });
  it("uploads PDF with CSRF then links the exact resume to a job and reloads application detail", async () => {
    fetchMock.mockImplementation(async (input, init) => {
      const p = String(input),
        m = init?.method ?? "GET";
      if (p.endsWith("/auth/me")) return response(session);
      if (p === `/api/v1/candidates/${cid}`) return response(candidate);
      if (p.startsWith("/api/v1/jobs?")) return response(page([job]));
      if (p === `/api/v1/candidates/${cid}/resumes`) {
        expect(init?.headers).toMatchObject({
          "X-CSRF-Token": session.csrf_token,
        });
        expect(init?.headers).not.toHaveProperty("Content-Type");
        expect((init?.body as FormData).get("cv")).toBeInstanceOf(File);
        return response(resume, 201);
      }
      if (p === `/api/v1/jobs/${jid}/applications` && m === "POST") {
        expect(JSON.parse(String(init?.body))).toEqual({
          candidate_id: cid,
          resume_id: rid,
        });
        return response(
          {
            id: aid,
            job_id: jid,
            candidate_id: cid,
            resume_id: rid,
            stage: "new",
            current_review_id: null,
            revision: 1,
            created_by: uid,
            created_at: time,
          },
          201,
        );
      }
      if (p === `/api/v1/jobs/${jid}`) return response(job);
      if (p.includes("/applications?"))
        return response(
          page([
            {
              id: aid,
              job_id: jid,
              candidate_id: cid,
              resume_id: rid,
              stage: "new",
              current_review_id: null,
              revision: 1,
              created_by: uid,
              created_at: time,
            },
          ]),
        );
      throw Error(`${m} ${p}`);
    });
    window.history.replaceState({}, "", `/candidates/${cid}`);
    mount();
    const input = await screen.findByLabelText("Chọn CV PDF");
    await userEvent.upload(
      input,
      new File(["%PDF-1.4"], "demo.pdf", { type: "application/pdf" }),
    );
    fireEvent.submit(input.closest("form")!);
    await screen.findByText("demo.pdf");
    fireEvent.change(screen.getByLabelText("Vị trí đang tuyển"), {
      target: { value: jid },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Tạo hồ sơ ứng tuyển" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Hồ sơ ứng tuyển" }),
    ).toBeVisible();
    expect(screen.getByText(rid)).toBeVisible();
    expect(window.location.search).toBe(`?job=${jid}`);
  });
  it("preserves input on conflict and shows server support reference", async () => {
    const c = createPlatformClient();
    fetchMock
      .mockResolvedValueOnce(response(session))
      .mockResolvedValueOnce(
        response(
          { error: { code: "revision_conflict", request_id: "req-demo" } },
          409,
        ),
      );
    await c.me();
    await expect(
      c.updateJob(jid, { title: "Edited", revision: 1 }),
    ).rejects.toMatchObject({ status: 409, requestId: "req-demo" });
  });
  it("keeps reviewer navigation scoped and denies direct candidate/admin screens", async () => {
    fetchMock.mockResolvedValue(
      response({ ...session, user: { ...session.user, role: "reviewer" } }),
    );
    mount();
    await screen.findByRole("heading", { name: "Chào Demo Admin," });
    expect(
      screen.queryByRole("link", { name: "Ứng viên" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: "Quản trị" }),
    ).not.toBeInTheDocument();
  });
});
