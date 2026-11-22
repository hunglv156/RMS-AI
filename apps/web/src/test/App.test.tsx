import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import App from "../App";
import { mockConfig, mockEnvelope } from "../lib/api/mock";
import { ApiError } from "../lib/api/client";
import { samples } from "../fixtures/samples";
const { screenMock } = vi.hoisted(() => ({ screenMock: vi.fn() }));
vi.mock("../lib/api/client", async (original) => ({
  ...(await original<typeof import("../lib/api/client")>()),
  getClient: async () => ({
    config: async () => mockConfig,
    samples: async () => samples,
    screen: screenMock,
  }),
}));
async function prepare() {
  render(<App />);
  await screen.findByRole("option", { name: samples[0].title });
  fireEvent.change(screen.getByLabelText("Vị trí tuyển dụng"), {
    target: { value: samples[0].id },
  });
  fireEvent.change(screen.getByLabelText("Tải CV PDF"), {
    target: {
      files: [new File(["%PDF-1.4"], "cv.pdf", { type: "application/pdf" })],
    },
  });
}
describe("screening workflow", () => {
  it("moves focus to the results area after screening completes", async () => {
    screenMock.mockResolvedValue(await mockEnvelope("escalated"));
    await prepare();
    fireEvent.click(screen.getByRole("button", { name: "Bắt đầu sàng lọc" }));
    await screen.findByText("Mỗi nhận định, một căn cứ.");
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("heading", { name: "Mỗi nhận định, một căn cứ." }),
      ),
    );
  });

  it("requires a valid JD and PDF and cancels in-flight work", async () => {
    let signal: AbortSignal | undefined;
    screenMock.mockImplementation((_f, _jd, s) => {
      signal = s;
      return new Promise(() => {});
    });
    render(<App />);
    expect(
      screen.getByRole("button", { name: "Bắt đầu sàng lọc" }),
    ).toBeDisabled();
    await screen.findByRole("option", { name: samples[0].title });
    fireEvent.change(screen.getByLabelText("Vị trí tuyển dụng"), {
      target: { value: samples[0].id },
    });
    fireEvent.change(screen.getByLabelText("Tải CV PDF"), {
      target: {
        files: [new File(["%PDF"], "cv.pdf", { type: "application/pdf" })],
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Bắt đầu sàng lọc" }));
    await screen.findByText("Đang đọc từng chi tiết…");
    await waitFor(() => expect(signal).toBeDefined());
    fireEvent.click(screen.getByRole("button", { name: "Dừng chờ kết quả" }));
    expect(signal?.aborted).toBe(true);
    expect(screen.getByText(/Đã dừng chờ kết quả/)).toBeVisible();
    await waitFor(() =>
      expect(document.activeElement).toBe(
        screen.getByRole("button", { name: "Bắt đầu sàng lọc" }),
      ),
    );
  });
  it("renders a friendly service failure and allows retry", async () => {
    screenMock.mockRejectedValue(new ApiError("llm_timeout"));
    await prepare();
    fireEvent.click(screen.getByRole("button", { name: "Bắt đầu sàng lọc" }));
    expect(await screen.findByText("Chưa thể hoàn tất sàng lọc")).toBeVisible();
    expect(screen.getByRole("button", { name: "Thử lại" })).toBeEnabled();
  });
  it("rejects a non-PDF upload", async () => {
    render(<App />);
    fireEvent.change(screen.getByLabelText("Tải CV PDF"), {
      target: { files: [new File(["x"], "cv.docx")] },
    });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Vui lòng chọn tệp PDF",
    );
  });
});
