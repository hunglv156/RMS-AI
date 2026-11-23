import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  Badge,
  Empty,
  LoadState,
  Pager,
  date,
  day,
  labels,
  num,
} from "../app/ui";
import { LevelBadge, Results, levelLabels } from "../components/Results";
import { mockEnvelope } from "../lib/api/mock";
import { samples } from "../fixtures/samples";
import type { Level } from "../lib/api/types";

describe("T8.10 presentation primitives", () => {
  it("formats dates and numbers for vi-VN without seconds", () => {
    const at = new Date(2026, 10, 23, 7, 54, 41).toISOString();
    expect(date(at)).toMatch(/^07:54,? 23\/11\/2026$/);
    expect(day(at)).toBe("23/11/2026");
    expect(date(null)).toBe("—");
    expect(num(42.94)).toBe("42,9");
    expect(num(1250, 0)).toBe("1.250");
  });
  it.each(
    Object.keys(labels).filter((k) => !/^(admin|recruiter|reviewer)$/.test(k)),
  )("status %s carries a shape as well as colour", (value) => {
    const { container } = render(<Badge value={value} />);
    const badge = container.querySelector(".p-badge")!;
    expect(badge).toHaveTextContent(labels[value]);
    expect(badge.querySelector("svg[aria-hidden='true']")).not.toBeNull();
  });
  it.each(Object.keys(levelLabels))("criterion level %s has an icon", (l) => {
    const { container } = render(<LevelBadge level={l as Level} />);
    expect(container.querySelector(".badge svg")).not.toBeNull();
  });
  it("hides pagination for a single page and labels multi-page navigation", () => {
    const change = vi.fn();
    const { container, rerender } = render(
      <Pager page={1} total={3} onChange={change} />,
    );
    expect(container).toBeEmptyDOMElement();
    rerender(<Pager page={1} total={45} onChange={change} />);
    expect(
      screen.getByRole("navigation", { name: "Phân trang" }),
    ).toBeVisible();
    expect(screen.getByText("45 kết quả · Trang 1/3")).toBeVisible();
    expect(screen.getByLabelText("Trang trước")).toBeDisabled();
    fireEvent.click(screen.getByLabelText("Trang sau"));
    expect(change).toHaveBeenCalledWith(2);
  });
  it("offers a retry from an error and announces loading", () => {
    const reload = vi.fn();
    const { rerender } = render(
      <LoadState loading={false} error="Mất kết nối" reload={reload} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Mất kết nối");
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(reload).toHaveBeenCalled();
    rerender(<LoadState loading error="" reload={reload} />);
    expect(screen.getByRole("status")).toHaveTextContent("Đang tải dữ liệu…");
  });
  it("renders empty states with guidance and an optional action", () => {
    render(
      <Empty title="Chưa có ứng viên" action={<button>Thêm ứng viên</button>}>
        Thêm hồ sơ đầu tiên.
      </Empty>,
    );
    expect(
      screen.getByRole("heading", { name: "Chưa có ứng viên" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Thêm ứng viên" })).toBeVisible();
  });
  it("marks withheld scores with a non-colour cue and an accessible meter", async () => {
    const d = await mockEnvelope("regular");
    const { container } = render(
      <Results data={d} jd={samples[0].jd} fileName="CV #1" />,
    );
    expect(container.querySelector(".score-withheld")).not.toBeNull();
    expect(screen.getByText("Chưa đạt ngưỡng")).toBeVisible();
    expect(screen.getByRole("meter", { name: "Độ bao phủ" })).toHaveAttribute(
      "aria-valuemax",
      "100",
    );
  });
});
