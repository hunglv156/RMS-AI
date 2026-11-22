import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  LevelBadge,
  ReviewBanner,
  Results,
  levelLabels,
} from "../components/Results";
import { JDEditor, blankJD } from "../components/JDEditor";
import { ApiError, errorMessages, friendlyError } from "../lib/api/client";
import { validateJD } from "../lib/validation";
import { mockEnvelope } from "../lib/api/mock";
import type { Level } from "../lib/api/types";
import { samples } from "../fixtures/samples";

describe("criterion levels", () => {
  it.each(Object.entries(levelLabels))("renders %s as %s", (level, label) => {
    render(<LevelBadge level={level as Level} />);
    expect(screen.getByText(label)).toHaveClass(`level-${level}`);
  });
});
describe("review and publication", () => {
  it("shows the actual escalation model", async () => {
    const d = await mockEnvelope("escalated");
    render(<ReviewBanner result={d.screening} />);
    expect(screen.getByText("Cần người xem lại")).toBeVisible();
    expect(
      screen.getByText(/Đã sàng lọc lại bằng ag\/gemini-4-argon-medium/),
    ).toBeVisible();
  });
  it("shows needs_review even without the global review flag", async () => {
    const d = await mockEnvelope("regular");
    d.screening = structuredClone(d.screening);
    d.screening.escalation = undefined;
    d.screening.total.requires_manual_review = false;
    d.screening.criteria[0].validation.level = "needs_review";
    render(<ReviewBanner result={d.screening} />);
    expect(screen.getByText("Cần người xem lại")).toBeVisible();
  });
  it("hides banner when no review is needed", async () => {
    const d = await mockEnvelope("regular");
    const r = structuredClone(d.screening);
    r.escalation = undefined;
    r.total.requires_manual_review = false;
    render(<ReviewBanner result={r} />);
    expect(screen.queryByText("Cần người xem lại")).not.toBeInTheDocument();
  });
  it("does not present an unpublished score as zero", async () => {
    const d = await mockEnvelope("regular");
    render(<Results data={d} jd={samples[0].jd} fileName="ho-so.pdf" />);
    expect(screen.getByText("Chưa đủ căn cứ đánh giá")).toBeVisible();
    expect(screen.getByText("—")).toBeVisible();
    expect(screen.getByText(/Ngưỡng công bố: 80%/)).toBeVisible();
    expect(screen.queryByText(/Đã sàng lọc lại bằng/)).not.toBeInTheDocument();
  });
  it("renders checked and unchecked evidence and the published score", async () => {
    const d = structuredClone(await mockEnvelope("escalated"));
    d.screening.criteria[0].evidence[0].verification.valid = false;
    render(<Results data={d} jd={samples[0].jd} fileName="ho-so.pdf" />);
    expect(screen.getByText("47,5")).toBeVisible();
    expect(screen.getByText("Chưa xác minh trích dẫn")).toBeVisible();
    expect(screen.getAllByText("Đã xác minh trích dẫn").length).toBeGreaterThan(
      0,
    );
    expect(document.querySelector("mark")).toHaveTextContent(
      "Experienced software developer",
    );
  });
});
describe("API errors", () => {
  it.each([
    "invalid_jd",
    "invalid_pdf",
    "encrypted_pdf",
    "empty_text",
    "file_too_large",
    "unsupported_type",
    "llm_error",
    "llm_timeout",
    "llm_not_configured",
  ])("maps %s to Vietnamese", (code) => {
    expect(friendlyError(new ApiError(code))).toBe(errorMessages[code]);
    expect(errorMessages[code].length).toBeGreaterThan(20);
  });
  it("never displays arbitrary backend details", () => {
    expect(friendlyError(new Error("secret gateway URL"))).not.toContain(
      "secret",
    );
    expect(friendlyError(new ApiError("secret"))).not.toContain("secret");
  });
});
describe("JD validation and editor", () => {
  it("accepts the real sample JDs", () => {
    for (const s of samples) expect(validateJD(s.jd)).toEqual([]);
  });
  it("requires at least one criterion", () => {
    expect(validateJD({ ...samples[0].jd, criteria: [] })).toContain(
      "Cần ít nhất một tiêu chí.",
    );
  });
  it.each([0, -1, NaN, Infinity])(
    "rejects nonpositive or nonfinite weight %s",
    (weight) => {
      expect(
        validateJD({
          ...blankJD,
          title: "Backend",
          criteria: [
            {
              ...blankJD.criteria[0],
              label: "Python",
              description: "Python development",
              weight,
            },
          ],
        }).length,
      ).toBeGreaterThan(0);
    },
  );
  it("rejects duplicate IDs and extra fields", () => {
    const jd = samples[0].jd;
    expect(
      validateJD({ ...jd, criteria: [jd.criteria[0], jd.criteria[0]] }),
    ).toContain("Mã tiêu chí không được trùng nhau.");
    expect(validateJD({ ...jd, unexpected: true }).length).toBeGreaterThan(0);
  });
  it("blocks malformed JSON without replacing the last valid JD", () => {
    const change = vi.fn(),
      valid = vi.fn();
    render(
      <JDEditor jd={samples[0].jd} onChange={change} onValidity={valid} />,
    );
    fireEvent.click(screen.getByText("JSON"));
    fireEvent.change(screen.getByLabelText("Mô tả công việc dạng JSON"), {
      target: { value: "{" },
    });
    expect(valid).toHaveBeenLastCalledWith(false);
    expect(change).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("JSON chưa hợp lệ");
    fireEvent.click(screen.getByText("Biểu mẫu"));
    expect(valid).toHaveBeenLastCalledWith(true);
    expect(screen.getByLabelText("Tên vị trí")).toHaveValue(samples[0].title);
  });
});
