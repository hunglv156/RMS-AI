import type {
  ActiveConfig,
  JobDescription,
  SampleJD,
  ScreeningClient,
  ScreeningEnvelope,
} from "./types";
export const errorMessages: Record<string, string> = {
  invalid_jd: "Mô tả công việc chưa hợp lệ. Hãy kiểm tra lại các tiêu chí.",
  invalid_pdf: "Không đọc được tệp PDF này. Hãy xuất lại PDF và thử lại.",
  encrypted_pdf: "PDF đang được bảo vệ bằng mật khẩu. Hãy tải bản đã mở khóa.",
  empty_text: "Chưa tìm thấy nội dung trong CV. Hãy thử bản PDF rõ nét hơn.",
  file_too_large: "Tệp quá lớn. Hãy giảm dung lượng PDF rồi tải lại.",
  unsupported_type: "Định dạng chưa được hỗ trợ. Vui lòng chọn tệp PDF.",
  llm_error: "Dịch vụ phân tích đang gặp sự cố. Bạn có thể thử lại.",
  llm_timeout: "Phân tích mất nhiều thời gian hơn dự kiến. Hãy thử lại sau.",
  llm_not_configured:
    "Dịch vụ phân tích chưa sẵn sàng. Vui lòng liên hệ quản trị viên.",
  network_error: "Không kết nối được dịch vụ. Hãy kiểm tra kết nối và thử lại.",
};
export class ApiError extends Error {
  constructor(public code: string) {
    super(errorMessages[code] ?? "Có lỗi xảy ra. Vui lòng thử lại.");
  }
}
export function friendlyError(error: unknown): string {
  return error instanceof ApiError
    ? error.message
    : errorMessages.network_error;
}
export function createHttpClient(base = "/api/ai"): ScreeningClient {
  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${base}/internal/v1/${path}`, init);
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new ApiError(body?.error?.code ?? "unknown");
    }
    return response.json() as Promise<T>;
  }
  return {
    config: (signal) => request<ActiveConfig>("screening-config", { signal }),
    samples: async (signal) =>
      (await request<{ items: SampleJD[] }>("sample-jds", { signal })).items,
    screen: (cv: File, jd: JobDescription, signal: AbortSignal) => {
      const body = new FormData();
      body.append("cv", cv);
      body.append("jd", JSON.stringify(jd));
      return request<ScreeningEnvelope>("screenings", {
        method: "POST",
        body,
        signal,
      });
    },
  };
}
export async function getClient(): Promise<ScreeningClient> {
  return import.meta.env.VITE_USE_MOCK === "1"
    ? (await import("./mock")).mockClient
    : createHttpClient();
}
