import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import type {
  Application,
  Job,
  JdVersion,
  PlatformClient,
  RunDetail,
  Session,
  Source,
} from "@rms-ai/contracts";
import { Workspace } from "../app/context";
import { SourceEvidence, sourceRange } from "../components/Results";
import { ScreeningPanel } from "../features/screenings/ScreeningPanel";
import { ReviewPanel } from "../features/reviews/ReviewPanel";
import { PlatformError } from "../lib/api/platform";
const source: Source = {
  text: "😀 <script>Python</script>",
  pages: [
    { start_offset: 0, end_offset: 25, page_number: 2, method: "text_layer" },
  ],
  normalized_text_sha256: "a".repeat(64),
  offset_unit: "unicode_code_points",
  extractor_version: "fixture",
  normalization_version: "fixture",
};
const session = {
  user: { id: "person", display_name: "An", role: "recruiter" },
} as Session;
const application = {
  id: "app",
  job_id: "job",
  resume_id: "resume",
  revision: 7,
} as Application;
const job = { id: "job", active_jd_version_id: "jd", status: "open" } as Job;
const jd = {
  id: "jd",
  title: "Engineer",
  version_no: 1,
  state: "approved",
  criteria: [],
} as unknown as JdVersion;
const page = <T,>(items: T[]) => ({
  items,
  total: items.length,
  page: 1,
  pageSize: 10,
});
const run = {
  id: "run",
  application_id: "app",
  job_id: "job",
  resume_id: "resume",
  jd_version_id: "jd",
  status: "failed",
  generation: 1,
  attempt_count: 2,
  queued_at: "2026-11-23T01:00:00Z",
  error_code: "provider_unavailable",
  safe_error_detail: "Provider unavailable",
  result: null,
} as RunDetail;
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
describe("T8.9 persisted screening and human review", () => {
  it("highlights Unicode code points as escaped text and refuses false/out-of-range source offsets", () => {
    const v = {
      valid: true,
      ambiguous: false,
      start_offset: 10,
      end_offset: 16,
    };
    expect(sourceRange(source, "Python", v)?.start).toBe(10);
    const { container } = render(
      <SourceEvidence source={source} quote="Python" verification={v} />,
    );
    expect(screen.getByText(/Trang 2/)).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("mark")?.textContent).toBe("Python");
    expect(
      sourceRange(source, "Python", { ...v, start_offset: 11 }),
    ).toBeNull();
    expect(sourceRange(source, "Python", { ...v, end_offset: 999 })).toBeNull();
    expect(sourceRange(source, "Python", { ...v, valid: false })).toBeNull();
  });
  it("recovers selected run on refresh and submits an explicit idempotent retry without deleting failure history", async () => {
    const retry = vi.fn().mockResolvedValue({
      runs: [{ ...run, id: "retry", status: "queued" }],
      dispatch_state: "degraded",
    });
    const detail = vi
      .fn()
      .mockImplementation(async (id: string) => ({ ...run, id }));
    mount(
      <ScreeningPanel
        application={application}
        job={job}
        onReviewed={vi.fn()}
      />,
      {
        jdVersions: async () => page([jd]),
        jdVersion: async () => jd,
        screeningHistory: async () => page([run]),
        screeningConfig: async () => {
          throw new Error("offline");
        },
        screening: detail,
        retryScreening: retry,
      },
      "/?run=run",
    );
    await screen.findByText(/Provider unavailable/);
    expect(detail).toHaveBeenCalledWith("run", expect.any(AbortSignal));
    fireEvent.click(screen.getByText("Thử lại bằng lần phân tích mới"));
    await waitFor(() =>
      expect(retry).toHaveBeenCalledWith("run", expect.any(String)),
    );
    expect(
      await screen.findByText(/Hàng đợi đang kết nối lại/),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(detail).toHaveBeenCalledWith("retry", expect.any(AbortSignal)),
    );
  });
  it("offers a new run instead of a doomed retry when the frozen config changed", async () => {
    const start = vi.fn().mockResolvedValue({
      runs: [{ ...run, id: "fresh", status: "queued" }],
      dispatch_state: "queued",
    });
    const retry = vi.fn();
    mount(
      <ScreeningPanel
        application={application}
        job={job}
        onReviewed={vi.fn()}
      />,
      {
        jdVersions: async () => page([jd]),
        jdVersion: async () => jd,
        screeningHistory: async () =>
          page([{ ...run, error_code: "config_changed" }]),
        screeningConfig: async () => {
          throw new Error("offline");
        },
        screening: async (id: string) => ({
          ...run,
          id,
          error_code: "config_changed",
        }),
        startScreening: start,
        retryScreening: retry,
      },
    );
    expect(
      await screen.findByText(
        "Cấu hình AI đã thay đổi so với lần phân tích này.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText("Thử lại bằng lần phân tích mới")).toBeNull();
    fireEvent.click(screen.getByText("Phân tích mới với cấu hình hiện tại"));
    await waitFor(() =>
      expect(start).toHaveBeenCalledWith(
        "job",
        { application_ids: ["app"], jd_version_id: "jd" },
        expect.any(String),
      ),
    );
    expect(retry).not.toHaveBeenCalled();
  });
  it("requires a trimmed human note, sends revision and preserves note on conflict", async () => {
    const review = vi
      .fn()
      .mockRejectedValue(new PlatformError("revision_conflict", 409));
    mount(
      <ReviewPanel
        application={application}
        run={{ ...run, status: "completed" }}
        latestRunId="newer"
        onReviewed={vi.fn()}
      />,
      { review, reviewHistory: async () => page([]) },
    );
    expect(screen.getByText("Lưu quyết định của tôi")).toBeDisabled();
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "  Confirm Python ownership  " },
    });
    fireEvent.click(screen.getByText("Lưu quyết định của tôi"));
    await waitFor(() =>
      expect(review).toHaveBeenCalledWith("run", {
        decision: "hold",
        note: "Confirm Python ownership",
        expected_application_revision: 7,
      }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Dữ liệu vừa được cập nhật",
    );
    expect(screen.getByRole("textbox")).toHaveValue(
      "  Confirm Python ownership  ",
    );
    expect(
      screen.getByText("Bạn đang xem một lần phân tích cũ."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Tải lại hồ sơ, giữ ghi chú của tôi"),
    ).toBeInTheDocument();
  });
  it("sends the chosen decision and attributes history to a person", async () => {
    const review = vi.fn().mockResolvedValue({});
    const onReviewed = vi.fn();
    mount(
      <ReviewPanel
        application={{ ...application, current_review_id: "r1" }}
        run={{ ...run, status: "completed" }}
        latestRunId="run"
        onReviewed={onReviewed}
      />,
      {
        review,
        reviewHistory: async () =>
          page([
            {
              id: "r1",
              application_id: "app",
              screening_run_id: "run",
              reviewer_id: "person",
              decision: "shortlist",
              note: "Strong Python evidence",
              supersedes_review_id: null,
              created_at: "2026-11-23T01:00:00Z",
            },
          ]),
      },
    );
    expect(await screen.findAllByText("An (bạn)")).not.toHaveLength(0);
    fireEvent.click(screen.getByLabelText(/Đưa vào danh sách ngắn/));
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Interview" },
    });
    fireEvent.click(screen.getByText("Lưu quyết định của tôi"));
    await waitFor(() =>
      expect(review).toHaveBeenCalledWith("run", {
        decision: "shortlist",
        note: "Interview",
        expected_application_revision: 7,
      }),
    );
    expect(onReviewed).toHaveBeenCalled();
  });
  it("stops polling once every persisted run is terminal", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const history = vi.fn().mockResolvedValue(page([run]));
      mount(
        <ScreeningPanel
          application={application}
          job={job}
          onReviewed={vi.fn()}
        />,
        {
          jdVersions: async () => page([jd]),
          jdVersion: async () => jd,
          screeningHistory: history,
          screeningConfig: async () => {
            throw new Error("offline");
          },
          screening: async () => run,
        },
      );
      await screen.findByText(/Provider unavailable/);
      const calls = history.mock.calls.length;
      await vi.advanceTimersByTimeAsync(10_000);
      expect(history.mock.calls.length).toBe(calls);
    } finally {
      vi.useRealTimers();
    }
  });
});
