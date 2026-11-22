import { afterEach, describe, expect, it, vi } from "vitest";
import { createPlatformClient } from "../lib/api/platform";
import { createMockPlatformClient } from "../lib/api/platform-mock";
import { filteredUsers } from "../features/admin/Admin";
import type { User } from "@rms-ai/contracts";
afterEach(() => vi.restoreAllMocks());
describe("platform boundary and admin filtering", () => {
  it("applies user search/role across server pages when T8.2 ignores those filters", async () => {
    const users: User[] = Array.from({ length: 101 }, (_, i) => ({
      id: `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
      display_name: i === 100 ? "An Tuyển dụng" : "Demo Admin",
      normalized_email: `demo-${i}@demo.example`,
      role: i === 100 ? "reviewer" : "admin",
      disabled_at: null,
      created_at: "2026-11-23T08:00:00.000Z",
    }));
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (input) => {
        const url = new URL(String(input), "http://localhost"),
          page = Number(url.searchParams.get("page"));
        return new Response(
          JSON.stringify({
            items: users.slice((page - 1) * 100, page * 100),
            total: 101,
            page,
            pageSize: 100,
          }),
        );
      });
    const result = await filteredUsers(
      createPlatformClient(),
      { page: 1, search: "tuyển", role: "reviewer" },
      new AbortController().signal,
    );
    expect(result.total).toBe(1);
    expect(result.items[0].id).toBe(users[100].id);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("keeps approved mock versions immutable and exposes queued/running/failed states honestly", async () => {
    const client = createMockPlatformClient();
    await client.login({
      email: "admin@demo.example",
      password: "preview-password",
    });
    const job = await client.createJob({ title: "Demo Backend" }),
      candidate = await client.createCandidate({
        display_name: "Synthetic Demo",
        provenance: "synthetic",
      });
    const cv = await client.uploadResume(
      candidate.id,
      new File(["%PDF-1.4"], "demo.pdf", { type: "application/pdf" }),
    );
    const app = await client.createApplication(job.id, {
      candidate_id: candidate.id,
      resume_id: cv.id,
    });
    const draft = await client.createJd(job.id, {
      title: job.title,
      summary: "Demo",
      criteria: [
        {
          code: "python",
          label: "Python",
          description: "APIs",
          priority: "must_have",
          weight: 1,
          keywords: [],
        },
      ],
    });
    const pending = await client.submitJd(draft.id, {
      revision: draft.revision,
    });
    const approved = await client.approveJd(pending.id, {
      revision: pending.revision,
    });
    await expect(
      client.updateJd(approved.id, {
        title: "Changed",
        summary: "Changed",
        criteria: approved.criteria,
        revision: approved.revision,
      }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      client.returnJdToDraft(approved.id, {
        revision: approved.revision,
        reason: "No mutation",
      }),
    ).rejects.toMatchObject({ status: 409 });
    const queued = await client.startScreening(
      job.id,
      { application_ids: [app.id], jd_version_id: approved.id },
      "demo-key",
    );
    expect(queued.runs[0].status).toBe("queued");
    const clock = vi
      .spyOn(Date, "now")
      .mockReturnValue(Date.parse(queued.runs[0].queued_at) + 1500);
    expect((await client.screening(queued.runs[0].id)).status).toBe("running");
    clock.mockReturnValue(Date.parse(queued.runs[0].queued_at) + 4000);
    const failed = await client.screening(queued.runs[0].id);
    expect(failed.status).toBe("failed");
    expect(failed.result).toBeNull();
    expect(failed.safe_error_detail).toContain("không gọi");
    const retry = await client.retryScreening(failed.id, "retry-key");
    expect(retry.runs[0].retry_of_run_id).toBe(failed.id);
    expect((await client.screeningHistory(app.id)).items).toHaveLength(2);
  });
});
