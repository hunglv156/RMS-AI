import { createMockPlatformClient } from "./platform-mock";
import type { PlatformClient, Session, ListQuery } from "@rms-ai/contracts";
export class PlatformError extends Error {
  constructor(
    public code: string,
    public status = 0,
    public requestId?: string,
  ) {
    super(
      messages[code] ??
        (status === 404
          ? "Không tìm thấy dữ liệu hoặc bạn chưa được cấp quyền."
          : status === 403
            ? "Bạn chưa có quyền thực hiện thao tác này."
            : "Chưa thể hoàn tất. Hãy thử lại."),
    );
  }
}
const messages: Record<string, string> = {
  invalid_origin:
    "Địa chỉ trang chưa khớp cấu hình máy chủ. Mở đúng địa chỉ của không gian làm việc.",
  ai_unavailable: "Dịch vụ phân tích chưa sẵn sàng. Hãy thử lại sau.",
  screening_in_progress: "Hồ sơ đang có một lần phân tích. Hãy xem lịch sử.",
  config_changed: "Cấu hình AI đã thay đổi. Hãy tạo lần phân tích mới.",
  invalid_credentials: "Email hoặc mật khẩu chưa đúng.",
  login_throttled: "Đăng nhập sai quá nhiều lần. Hãy thử lại sau 15 phút.",
  unauthenticated: "Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.",
  invalid_csrf: "Phiên bảo mật đã thay đổi. Hãy tải lại trang.",
  revision_conflict: "Dữ liệu vừa được cập nhật. Hãy tải lại trước khi lưu.",
  conflict: "Dữ liệu đã thay đổi hoặc hồ sơ đã được liên kết. Hãy tải lại.",
  invalid_input: "Thông tin chưa hợp lệ. Hãy kiểm tra các trường.",
  invalid_pdf: "Tệp chưa phải PDF hợp lệ.",
  file_too_large: "PDF phải nhỏ hơn hoặc bằng 10 MB.",
  network_error: "Không kết nối được máy chủ. Kiểm tra kết nối rồi thử lại.",
};
export const message = (e: unknown) =>
  e instanceof PlatformError
    ? `${e.message}${e.requestId ? ` (Mã hỗ trợ: ${e.requestId})` : ""}`
    : e instanceof Error
      ? e.message
      : messages.network_error;
export function createPlatformClient(base = "/api/v1"): PlatformClient {
  let csrf = "";
  const query = (q?: ListQuery & object) => {
    const params = new URLSearchParams();
    Object.entries(q ?? {}).forEach(([k, v]) => {
      if (v !== undefined && v !== "") params.set(k, String(v));
    });
    return params.size ? `?${params}` : "";
  };
  async function req<T>(
    path: string,
    method = "GET",
    body?: unknown,
    signal?: AbortSignal,
    key?: string,
  ): Promise<T> {
    let res: Response;
    try {
      res = await fetch(`${base}${path}`, {
        method,
        credentials: "same-origin",
        signal,
        headers: {
          ...(body instanceof FormData
            ? {}
            : body !== undefined
              ? { "Content-Type": "application/json" }
              : {}),
          ...(method !== "GET" && csrf ? { "X-CSRF-Token": csrf } : {}),
          ...(key ? { "Idempotency-Key": key } : {}),
        },
        body:
          body === undefined
            ? undefined
            : body instanceof FormData
              ? body
              : JSON.stringify(body),
      });
    } catch (e) {
      if (signal?.aborted) throw e;
      throw new PlatformError("network_error");
    }
    if (!res.ok) {
      const b = await res.json().catch(() => null);
      if (res.status === 401) {
        csrf = "";
        window.dispatchEvent(new Event("platform:unauthorized"));
      }
      throw new PlatformError(
        b?.error?.code ?? b?.code ?? "unknown",
        res.status,
        b?.error?.request_id ?? res.headers.get("X-Request-ID") ?? undefined,
      );
    }
    if (res.status === 204) return undefined as T;
    return (path.endsWith("/content") ? res.blob() : res.json()) as Promise<T>;
  }
  const session = async (
    p: string,
    m = "GET",
    b?: unknown,
    s?: AbortSignal,
  ) => {
    const v = await req<Session>(p, m, b, s);
    csrf = v.csrf_token;
    return v;
  };
  return {
    login: (b, s) => session("/auth/login", "POST", b, s),
    me: (s) => session("/auth/me", "GET", undefined, s),
    logout: async (s) => {
      await req("/auth/logout", "POST", undefined, s);
      csrf = "";
    },
    users: (q, s) => req(`/users${query(q)}`, "GET", undefined, s),
    createUser: (b, s) => req("/users", "POST", b, s),
    updateUser: (id, b, s) => req(`/users/${id}`, "PATCH", b, s),
    jobs: (q, s) => req(`/jobs${query(q)}`, "GET", undefined, s),
    job: (id, s) => req(`/jobs/${id}`, "GET", undefined, s),
    createJob: (b, s) => req("/jobs", "POST", b, s),
    updateJob: (id, b, s) => req(`/jobs/${id}`, "PATCH", b, s),
    assignReviewers: (id, b, s) => req(`/jobs/${id}/assignments`, "PUT", b, s),
    jdVersions: (id, q, s) =>
      req(`/jobs/${id}/jd-versions${query(q)}`, "GET", undefined, s),
    jdVersion: (id, s) => req(`/jd-versions/${id}`, "GET", undefined, s),
    createJd: (id, b, s) => req(`/jobs/${id}/jd-versions`, "POST", b, s),
    updateJd: (id, b, s) => req(`/jd-versions/${id}`, "PATCH", b, s),
    submitJd: (id, b, s) => req(`/jd-versions/${id}/submit`, "POST", b, s),
    returnJdToDraft: (id, b, s) =>
      req(`/jd-versions/${id}/return-to-draft`, "POST", b, s),
    approveJd: (id, b, s) => req(`/jd-versions/${id}/approve`, "POST", b, s),
    cloneJd: (id, b, s) => req(`/jd-versions/${id}/clone`, "POST", b, s),
    candidates: (q, s) => req(`/candidates${query(q)}`, "GET", undefined, s),
    candidate: (id, s) => req(`/candidates/${id}`, "GET", undefined, s),
    createCandidate: (b, s) => req("/candidates", "POST", b, s),
    updateCandidate: (id, b, s) => req(`/candidates/${id}`, "PATCH", b, s),
    uploadResume: (id, cv, s) => {
      const f = new FormData();
      f.append("cv", cv);
      return req(`/candidates/${id}/resumes`, "POST", f, s);
    },
    downloadResume: (id, s) =>
      req(`/resumes/${id}/content`, "GET", undefined, s),
    applications: (id, q, s) =>
      req(`/jobs/${id}/applications${query(q)}`, "GET", undefined, s),
    createApplication: (id, b, s) =>
      req(`/jobs/${id}/applications`, "POST", b, s),
    updateApplication: (id, b, s) => req(`/applications/${id}`, "PATCH", b, s),
    screeningConfig: (s) => req("/screening-config", "GET", undefined, s),
    startScreening: (id, b, k, s) =>
      req(`/jobs/${id}/screenings`, "POST", b, s, k),
    screening: (id, s) => req(`/screenings/${id}`, "GET", undefined, s),
    screeningHistory: (id, q, s) =>
      req(`/applications/${id}/screenings${query(q)}`, "GET", undefined, s),
    retryScreening: (id, k, s) =>
      req(`/screenings/${id}/retries`, "POST", undefined, s, k),
    review: (id, b, s) => req(`/screenings/${id}/reviews`, "POST", b, s),
    reviewHistory: (id, q, s) =>
      req(`/applications/${id}/reviews${query(q)}`, "GET", undefined, s),
    dashboard: (s) => req("/dashboard", "GET", undefined, s),
    auditEvents: (q, s) => req(`/audit-events${query(q)}`, "GET", undefined, s),
  };
}
export const platformClient: PlatformClient =
  import.meta.env.VITE_USE_MOCK === "1"
    ? createMockPlatformClient()
    : createPlatformClient();
