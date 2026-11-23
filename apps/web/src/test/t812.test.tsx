import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type {
  Application,
  Dashboard as DashboardData,
  Job,
  JdVersion,
  PlatformClient,
  Session,
} from "@rms-ai/contracts";
import { Workspace } from "../app/context";
import { Dashboard } from "../app/Dashboard";
import { ApplicationDetail } from "../features/applications/ApplicationDetail";
import { JdPanel } from "../features/jd/JdPanel";
const session = {
  user: { id: "reviewer", display_name: "Mai Reviewer", role: "reviewer" },
} as Session;
const application = {
  id: "application-id",
  candidate_id: "private-candidate-id",
  candidate_display_name: "Taylor Example",
  job_id: "job",
  resume_id: "resume",
  stage: "new",
  created_at: "2026-11-23T08:00:00Z",
} as Application;
const job = { id: "job", title: "Backend Engineer", status: "open" } as Job;
const page = <T,>(items: T[]) => ({
  items,
  total: items.length,
  page: 1,
  pageSize: 20,
});
function mount(
  node: React.ReactNode,
  client: Partial<PlatformClient>,
  path = "/",
) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Workspace.Provider
        value={{
          client: client as PlatformClient,
          session,
          refreshSession: vi.fn(),
        }}
      >
        {node}
      </Workspace.Provider>
    </MemoryRouter>,
  );
}
describe("T8.12 authorized display names", () => {
  it("shows a reviewer the candidate name without requesting candidates or users", async () => {
    const candidate = vi.fn(),
      users = vi.fn();
    mount(
      <Routes>
        <Route path="/applications/:id" element={<ApplicationDetail />} />
      </Routes>,
      {
        job: async () => job,
        applications: async () => page([application]),
        jdVersions: async () => page([]),
        screeningHistory: async () => page([]),
        screeningConfig: async () => {
          throw new Error("unavailable");
        },
        candidate,
        users,
      },
      "/applications/application-id?job=job",
    );
    expect(
      await screen.findByRole("heading", { name: "Taylor Example" }),
    ).toBeVisible();
    expect(screen.getAllByText("Taylor Example")).toHaveLength(2);
    expect(screen.queryByText(/private-candidate-id/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Taylor Example/ }),
    ).not.toBeInTheDocument();
    expect(candidate).not.toHaveBeenCalled();
    expect(users).not.toHaveBeenCalled();
  });
  it("uses pending run names even when the application is outside the recent list", async () => {
    const candidate = vi.fn();
    const data = {
      counts: {
        jobs_open: 1,
        applications: 12,
        awaiting_review: 1,
        shortlist: 0,
        reject: 0,
        hold: 0,
        screening_failures: 0,
      },
      recent_applications: [application],
      latest_failures: [],
      pending_reviews: [
        {
          id: "run",
          application_id: "older-application",
          job_id: "job",
          candidate_display_name: "Jordan Pending",
          status: "completed",
          queued_at: application.created_at,
        },
      ],
    } as unknown as DashboardData;
    mount(<Dashboard />, {
      dashboard: async () => data,
      job: async () => job,
      candidate,
    });
    expect(await screen.findByText("Jordan Pending")).toBeVisible();
    expect(screen.getByText("Taylor Example")).toBeVisible();
    expect(screen.queryByText(/older-application/)).not.toBeInTheDocument();
    expect(candidate).not.toHaveBeenCalled();
  });
  it("attributes every JD transition to its returned actor name", async () => {
    const actor = (id: string, display_name: string) => ({ id, display_name });
    const jd = {
      id: "jd",
      title: "Backend Engineer",
      summary: "Build services",
      criteria: [],
      state: "approved",
      version_no: 1,
      created_at: application.created_at,
      submitted_at: application.created_at,
      approved_at: application.created_at,
      created_by_actor: actor("author", "An Author"),
      submitted_by_actor: actor("submitter", "Linh Submitter"),
      approved_by_actor: actor("reviewer", "Mai Reviewer"),
      returned_by_actor: actor("returner", "Binh Approver"),
    } as unknown as JdVersion;
    mount(<JdPanel job={job} onChange={vi.fn()} />, {
      jdVersions: async () => page([jd]),
    });
    expect(await screen.findByText(/An Author/)).toBeVisible();
    expect(screen.getByText(/Linh Submitter/)).toBeVisible();
    expect(screen.getByText(/Mai Reviewer \(bạn\)/)).toBeVisible();
    expect(screen.getByText(/Binh Approver/)).toBeVisible();
  });
});
