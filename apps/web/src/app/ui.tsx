import { useState, type ReactNode, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Inbox, LoaderCircle } from "lucide-react";
import { message } from "../lib/api/platform";
export const date = (s: string | null) =>
  s ? new Date(s).toLocaleString("vi-VN") : "—";
export const labels: Record<string, string> = {
  admin: "Quản trị viên",
  recruiter: "Chuyên viên tuyển dụng",
  reviewer: "Người đánh giá",
  open: "Đang tuyển",
  closed: "Đã đóng",
  draft: "Bản nháp",
  pending_approval: "Chờ phê duyệt",
  approved: "Đã phê duyệt",
  new: "Mới tiếp nhận",
  shortlist: "Danh sách ngắn",
  reject: "Không phù hợp",
  hold: "Cân nhắc thêm",
};
export function Badge({ value }: { value: string }) {
  return <span className={`p-badge p-${value}`}>{labels[value] ?? value}</span>;
}
export function Heading({
  eyebrow = "KHÔNG GIAN TUYỂN DỤNG",
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="p-heading">
      <p className="p-eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      {children && <p className="muted">{children}</p>}
    </header>
  );
}
export function Empty({
  title = "Chưa có dữ liệu",
  children,
}: {
  title?: string;
  children?: ReactNode;
}) {
  return (
    <div className="p-empty">
      <Inbox size={32} />
      <h3>{title}</h3>
      <p>{children ?? "Dữ liệu mới sẽ xuất hiện tại đây."}</p>
    </div>
  );
}
export function LoadState({
  loading,
  error,
  reload,
}: {
  loading: boolean;
  error: string;
  reload: () => void;
}) {
  return loading ? (
    <div className="p-empty" role="status">
      <LoaderCircle className="spin" />
      <p>Đang tải dữ liệu…</p>
    </div>
  ) : error ? (
    <div className="p-error" role="alert">
      <strong>Chưa tải được dữ liệu</strong>
      <p>{error}</p>
      <button className="button secondary" onClick={reload}>
        Thử lại
      </button>
    </div>
  ) : null;
}
export function ActionForm({
  onSubmit,
  children,
  label = "Lưu thay đổi",
  disabled = false,
  className = "",
}: {
  onSubmit: (data: FormData) => Promise<unknown>;
  children: ReactNode;
  label?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const f = e.currentTarget;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await onSubmit(new FormData(f));
      setNotice("Đã lưu thành công.");
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className={`p-form ${className}`} onSubmit={submit}>
      {children}
      {error && (
        <p className="p-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="p-notice">
          {notice}
        </p>
      )}
      <button className="button primary" disabled={busy || disabled}>
        {busy ? (
          <>
            <LoaderCircle size={16} className="spin" />
            Đang lưu…
          </>
        ) : (
          label
        )}
      </button>
    </form>
  );
}
export function Pager({
  page,
  total,
  pageSize = 20,
  onChange,
}: {
  page: number;
  total: number;
  pageSize?: number;
  onChange: (p: number) => void;
}) {
  return (
    <div className="p-pager">
      <span>
        {total} kết quả · Trang {page}/
        {Math.max(1, Math.ceil(total / pageSize))}
      </span>
      <div>
        <button
          aria-label="Trang trước"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ArrowLeft size={16} />
        </button>
        <button
          aria-label="Trang sau"
          disabled={page * pageSize >= total}
          onClick={() => onChange(page + 1)}
        >
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
export function Search({
  value,
  onChange,
}: {
  value: string;
  onChange: (s: string) => void;
}) {
  return (
    <label className="p-search">
      Tìm kiếm
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Nhập tên để tìm…"
      />
    </label>
  );
}
export function Field({
  label,
  name,
  value,
  type = "text",
  required = false,
}: {
  label: string;
  name: string;
  value?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label>
      {label}
      <input
        name={name}
        defaultValue={value}
        type={type}
        required={required}
        maxLength={type === "password" ? 1024 : 300}
        minLength={type === "password" ? 12 : undefined}
      />
    </label>
  );
}
