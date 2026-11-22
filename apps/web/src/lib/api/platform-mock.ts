import type {
  PlatformClient,
  User,
  Session,
  Job,
  Candidate,
  JdVersion,
  Resume,
  Application,
  ListQuery,
  RunDetail,
} from "@rms-ai/contracts";
import { PlatformError } from "./platform";
// Explicit in-memory UI preview. Never a fallback for HTTP failures.
export function createMockPlatformClient(): PlatformClient {
  const now = () => new Date().toISOString(),
    id = () => crypto.randomUUID();
  const user: User = {
    id: id(),
    display_name: "An · Bản xem trước",
    normalized_email: "admin@demo.example",
    role: "admin",
    disabled_at: null,
    created_at: now(),
  };
  let current: Session | undefined;
  const users: User[] = [user],
    jobs: Job[] = [],
    candidates: Candidate[] = [],
    versions: JdVersion[] = [],
    resumes: Resume[] = [],
    applications: Application[] = [],
    runs: RunDetail[] = [];
  const files = new Map<string, File>();
  const page = <T>(rows: T[], q?: ListQuery) => ({
    items: rows.slice(
      ((q?.page ?? 1) - 1) * (q?.pageSize ?? 20),
      (q?.page ?? 1) * (q?.pageSize ?? 20),
    ),
    total: rows.length,
    page: q?.page ?? 1,
    pageSize: q?.pageSize ?? 20,
  });
  const find = <T extends { id: string }>(rows: T[], key: string) => {
    const r = rows.find((v) => v.id === key);
    if (!r) throw new PlatformError("not_found", 404);
    return r;
  };
  const auth = () => {
    if (!current) throw new PlatformError("unauthenticated", 401);
    return current;
  };
  const revision = (row: { revision: number }, n: number) => {
    if (row.revision !== n) throw new PlatformError("revision_conflict", 409);
  };
  const workflow = (key: string, n: number, state?: JdVersion["state"]) => {
    auth();
    const v = find(versions, key);
    revision(v, n);
    if (state === "approved" && v.state !== "pending_approval")
      throw new PlatformError("invalid_input", 400);
    if (state === "pending_approval" && v.state !== "draft")
      throw new PlatformError("invalid_input", 400);
    if (state === "draft" && v.state !== "pending_approval")
      throw new PlatformError("conflict", 409);
    v.revision++;
    if (state) v.state = state;
    if (state === "pending_approval") {
      v.submitted_at = now();
      v.submitted_by = user.id;
    }
    if (state === "approved") {
      v.approved_at = now();
      v.approved_by = user.id;
      v.content_sha256 = "0".repeat(64);
      find(jobs, v.job_id).active_jd_version_id = v.id;
    }
    return structuredClone(v);
  };
  const addJd = (
    jobId: string,
    b: Pick<JdVersion, "title" | "summary" | "criteria">,
  ) => {
    auth();
    find(jobs, jobId);
    const v: JdVersion = {
      ...structuredClone(b),
      id: id(),
      job_id: jobId,
      version_no: versions.filter((v) => v.job_id === jobId).length + 1,
      state: "draft",
      revision: 1,
      submitted_at: null,
      submitted_by: null,
      approved_at: null,
      approved_by: null,
      content_sha256: null,
      created_by: user.id,
      created_at: now(),
    };
    versions.unshift(v);
    return structuredClone(v);
  };
  const client: PlatformClient = {
    login: async (b) => {
      const match = users.find(
        (u) => u.normalized_email === b.email && !u.disabled_at,
      );
      if (!match || b.password.length < 12)
        throw new PlatformError("invalid_credentials", 401);
      current = {
        user: match,
        allowed_actions: [],
        csrf_token: "mock-csrf",
        expires_at: new Date(Date.now() + 28800000).toISOString(),
      };
      return structuredClone(current);
    },
    me: async () => structuredClone(auth()),
    logout: async () => {
      current = undefined;
    },
    users: async (q) => {
      auth();
      return page(
        users.filter(
          (u) =>
            (!q?.role || u.role === q.role) &&
            u.display_name
              .toLowerCase()
              .includes((q?.search ?? "").toLowerCase()),
        ),
        q,
      );
    },
    createUser: async (b) => {
      auth();
      const u: User = {
        id: id(),
        normalized_email: b.email,
        display_name: b.display_name,
        role: b.role,
        disabled_at: null,
        created_at: now(),
      };
      users.push(u);
      return { ...u };
    },
    updateUser: async (key, b) => {
      auth();
      const u = find(users, key);
      Object.assign(u, {
        ...(b.display_name ? { display_name: b.display_name } : {}),
        ...(b.role ? { role: b.role } : {}),
        ...(b.disabled !== undefined
          ? { disabled_at: b.disabled ? now() : null }
          : {}),
      });
      return { ...u };
    },
    jobs: async (q) => {
      auth();
      return page(
        jobs.filter(
          (j) =>
            (!q?.status || j.status === q.status) &&
            j.title.toLowerCase().includes((q?.search ?? "").toLowerCase()),
        ),
        q,
      );
    },
    job: async (key) => {
      auth();
      return { ...find(jobs, key) };
    },
    createJob: async (b) => {
      auth();
      const j: Job = {
        id: id(),
        title: b.title,
        status: "open",
        revision: 1,
        active_jd_version_id: null,
        created_by: user.id,
        created_at: now(),
        updated_at: now(),
      };
      jobs.unshift(j);
      return { ...j };
    },
    updateJob: async (key, b) => {
      auth();
      const j = find(jobs, key);
      revision(j, b.revision);
      Object.assign(j, b, { revision: j.revision + 1, updated_at: now() });
      return { ...j };
    },
    assignReviewers: async (key, b) => {
      auth();
      find(jobs, key);
      return structuredClone(b);
    },
    jdVersions: async (key, q) => {
      auth();
      return page(structuredClone(versions.filter((v) => v.job_id === key)), q);
    },
    jdVersion: async (key) => {
      auth();
      return structuredClone(find(versions, key));
    },
    createJd: async (key, b) => addJd(key, b),
    updateJd: async (key, b) => {
      auth();
      const v = find(versions, key);
      revision(v, b.revision);
      if (v.state !== "draft") throw new PlatformError("conflict", 409);
      Object.assign(v, b, { revision: v.revision + 1 });
      return structuredClone(v);
    },
    submitJd: async (key, b) => workflow(key, b.revision, "pending_approval"),
    approveJd: async (key, b) => {
      if (find(jobs, find(versions, key).job_id).status === "closed")
        throw new PlatformError("conflict", 409);
      return workflow(key, b.revision, "approved");
    },
    returnJdToDraft: async (key, b) => workflow(key, b.revision, "draft"),
    cloneJd: async (key, b) => {
      auth();
      const v = find(versions, key);
      revision(v, b.revision);
      return addJd(v.job_id, {
        title: v.title,
        summary: v.summary,
        criteria: v.criteria,
      });
    },
    candidates: async (q) => {
      auth();
      return page(
        candidates.filter((c) =>
          c.display_name
            .toLowerCase()
            .includes((q?.search ?? "").toLowerCase()),
        ),
        q,
      );
    },
    candidate: async (key) => {
      auth();
      return { ...find(candidates, key) };
    },
    createCandidate: async (b) => {
      auth();
      const c: Candidate = {
        ...b,
        email: b.email ?? null,
        phone: b.phone ?? null,
        id: id(),
        created_by: user.id,
        created_at: now(),
        updated_at: now(),
      };
      candidates.unshift(c);
      return { ...c };
    },
    updateCandidate: async (key, b) => {
      auth();
      const c = find(candidates, key);
      Object.assign(c, b, { updated_at: now() });
      return { ...c };
    },
    uploadResume: async (key, file) => {
      auth();
      find(candidates, key);
      if (file.type !== "application/pdf" || !file.size || file.size > 10485760)
        throw new PlatformError("invalid_pdf", 400);
      const r: Resume = {
        id: id(),
        candidate_id: key,
        version_no: resumes.filter((r) => r.candidate_id === key).length + 1,
        original_filename: file.name,
        mime_type: "application/pdf",
        byte_size: file.size,
        file_sha256: "0".repeat(64),
        status: "uploaded",
        uploaded_by: user.id,
        uploaded_at: now(),
      };
      resumes.unshift(r);
      files.set(r.id, file);
      return { ...r };
    },
    downloadResume: async (key) => {
      auth();
      const f = files.get(key);
      if (!f) throw new PlatformError("not_found", 404);
      return f;
    },
    applications: async (key, q) => {
      auth();
      return page(
        applications.filter(
          (a) =>
            a.job_id === key &&
            find(candidates, a.candidate_id)
              .display_name.toLowerCase()
              .includes((q?.search ?? "").toLowerCase()),
        ),
        q,
      );
    },
    createApplication: async (key, b) => {
      auth();
      if (
        find(jobs, key).status === "closed" ||
        find(resumes, b.resume_id).candidate_id !== b.candidate_id ||
        applications.some(
          (a) => a.job_id === key && a.candidate_id === b.candidate_id,
        )
      )
        throw new PlatformError("conflict", 409);
      const a: Application = {
        ...b,
        id: id(),
        job_id: key,
        stage: "new",
        current_review_id: null,
        revision: 1,
        created_by: user.id,
        created_at: now(),
      };
      applications.unshift(a);
      return { ...a };
    },
    updateApplication: async (key, b) => {
      auth();
      const a = find(applications, key);
      revision(a, b.revision);
      if (find(resumes, b.resume_id).candidate_id !== a.candidate_id)
        throw new PlatformError("invalid_input", 400);
      Object.assign(a, b, { revision: a.revision + 1 });
      return { ...a };
    },
    // The preview exposes honest failed terminal outcomes until a deterministic full envelope is supplied.
    screeningConfig: async () => {
      throw new PlatformError("preview_not_available", 503);
    },
    startScreening: async (key, b) => {
      auth();
      const jd = find(versions, b.jd_version_id);
      if (jd.job_id !== key || jd.state !== "approved")
        throw new PlatformError("invalid_input", 400);
      const created = b.application_ids.map((aid) => {
        const a = find(applications, aid);
        if (a.job_id !== key) throw new PlatformError("invalid_input", 400);
        const r: RunDetail = {
          id: id(),
          job_id: key,
          application_id: a.id,
          resume_id: a.resume_id,
          jd_version_id: jd.id,
          scoring_config_id: "00000000-0000-4000-8000-000000000001",
          generation: 1,
          retry_of_run_id: null,
          status: "queued",
          attempt_count: 0,
          queued_at: now(),
          started_at: null,
          finished_at: null,
          next_retry_at: null,
          error_code: null,
          safe_error_detail: null,
          result: null,
        };
        runs.push(r);
        return { ...r };
      });
      return { runs: created, dispatch_state: "pending" };
    },
    screening: async (key) => {
      auth();
      const r = find(runs, key);
      const age = Date.now() - Date.parse(r.queued_at);
      if (age > 3000) {
        r.status = "failed";
        r.error_code = "preview_not_available";
        r.safe_error_detail = "Bản xem trước không gọi dịch vụ AI.";
        r.finished_at = now();
      } else if (age > 1000) {
        r.status = "running";
        r.started_at ??= now();
        r.attempt_count = 1;
      }
      return structuredClone(r);
    },
    screeningHistory: async (key, q) => {
      auth();
      return page(
        runs.filter((r) => r.application_id === key),
        q,
      );
    },
    retryScreening: async (key) => {
      auth();
      const r = find(runs, key);
      if (r.status !== "failed") throw new PlatformError("conflict", 409);
      const result = await client.startScreening(
        r.job_id,
        { application_ids: [r.application_id], jd_version_id: r.jd_version_id },
        id(),
      );
      const fresh = find(runs, result.runs[0].id);
      fresh.retry_of_run_id = r.id;
      fresh.generation = r.generation + 1;
      return { runs: [{ ...fresh }], dispatch_state: "pending" };
    },
    review: async () => {
      throw new PlatformError("preview_not_available", 503);
    },
    reviewHistory: async (_key, q) => {
      auth();
      return page([], q);
    },
    dashboard: async () => {
      auth();
      return {
        counts: {
          jobs_open: jobs.filter((j) => j.status === "open").length,
          applications: applications.length,
          awaiting_review: 0,
          shortlist: 0,
          reject: 0,
          hold: 0,
          screening_failures: runs.filter((r) => r.status === "failed").length,
        },
        recent_applications: applications,
        latest_failures: runs.filter((r) => r.status === "failed"),
        pending_reviews: [],
      };
    },
    auditEvents: async (q) => {
      auth();
      return page([], q);
    },
  };
  return client;
}
