import { useState, type ReactNode, type FormEvent } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CircleCheck,
  CircleDashed,
  CircleDot,
  CircleX,
  Clock3,
  Inbox,
  LoaderCircle,
  Lock,
  RefreshCw,
  Sparkles,
  Star,
  type LucideIcon,
} from "lucide-react";
import { message } from "../lib/api/platform";
const dateTime = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }),
  dateOnly = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
/** Vietnamese date and time without seconds, e.g. "07:54 23/11/2026". */
export const date = (s: string | null) =>
  s ? dateTime.format(new Date(s)) : "—";
export const day = (s: string | null) =>
  s ? dateOnly.format(new Date(s)) : "—";
export const num = (n: number, digits = 1) =>
  n.toLocaleString("vi-VN", { maximumFractionDigits: digits });
export const shortId = (id: string) => `#${id.slice(0, 8)}`;
export const labels: Record<string, string> = {
  queued: "Đang chờ",
  running: "Đang phân tích",
  retry_wait: "Chờ thử lại",
  completed: "Hoàn tất",
  failed: "Chưa hoàn tất",
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
  reject: "Chưa phù hợp",
  hold: "Cân nhắc thêm",
};
/** Each status carries a distinct shape so it never relies on colour alone. */
const icons: Record<string, LucideIcon> = {
  queued: Clock3,
  running: LoaderCircle,
  retry_wait: RefreshCw,
  completed: CircleCheck,
  failed: CircleX,
  open: CircleDot,
  closed: Lock,
  draft: CircleDashed,
  pending_approval: Clock3,
  approved: CircleCheck,
  new: Sparkles,
  shortlist: Star,
  reject: CircleX,
  hold: Clock3,
};
export function Badge({ value, label }: { value: string; label?: string }) {
  const Icon = icons[value];
  return (
    <span className={`p-badge p-${value}`}>
      {Icon && (
        <Icon
          size={13}
          aria-hidden="true"
          className={value === "running" ? "spin" : undefined}
        />
      )}
      {label ?? labels[value] ?? value}
    </span>
  );
}
export function Heading({
  eyebrow = "KHÔNG GIAN TUYỂN DỤNG",
  title,
  children,
  meta,
  actions,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="p-heading">
      <div>
        <p className="p-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {children && <p className="muted">{children}</p>}
        {meta && <div className="p-heading-meta">{meta}</div>}
      </div>
      {actions && <div className="p-heading-actions">{actions}</div>}
    </header>
  );
}
export function Empty({
  title = "Chưa có dữ liệu",
  children,
  action,
  icon: Icon = Inbox,
}: {
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="p-empty">
      <span className="p-empty-icon" aria-hidden="true">
        <Icon size={24} />
      </span>
      <h3>{title}</h3>
      <p>{children ?? "Dữ liệu mới sẽ xuất hiện tại đây."}</p>
      {action && <div className="p-empty-action">{action}</div>}
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
    <div className="p-loading" role="status">
      <LoaderCircle className="spin" size={20} aria-hidden="true" />
      <span>Đang tải dữ liệu…</span>
    </div>
  ) : error ? (
    <div className="p-error p-error-block" role="alert">
      <AlertCircle size={20} aria-hidden="true" />
      <div>
        <strong>Chưa tải được dữ liệu</strong>
        <p>{error}</p>
      </div>
      <button className="button secondary" onClick={reload}>
        <RefreshCw size={15} aria-hidden="true" />
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
  variant = "primary",
}: {
  onSubmit: (data: FormData) => Promise<unknown>;
  children: ReactNode;
  label?: string;
  disabled?: boolean;
  className?: string;
  variant?: "primary" | "secondary";
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
    <form className={`p-form ${className}`} onSubmit={submit} aria-busy={busy}>
      {children}
      {error && (
        <p className="p-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="p-notice">
          <CircleCheck size={16} aria-hidden="true" />
          {notice}
        </p>
      )}
      <button className={`button ${variant}`} disabled={busy || disabled}>
        {busy ? (
          <>
            <LoaderCircle size={16} className="spin" aria-hidden="true" />
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
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav className="p-pager" aria-label="Phân trang">
      <span>
        {num(total, 0)} kết quả · Trang {page}/{pages}
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
    </nav>
  );
}
export function Search({
  value,
  onChange,
  label = "Tìm kiếm",
  placeholder = "Nhập tên để tìm…",
}: {
  value: string;
  onChange: (s: string) => void;
  label?: string;
  placeholder?: string;
}) {
  return (
    <label className="p-search">
      {label}
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
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
  autoComplete,
}: {
  label: string;
  name: string;
  value?: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  return (
    <label>
      {label}
      <input
        name={name}
        defaultValue={value}
        type={type}
        required={required}
        autoComplete={autoComplete}
        maxLength={type === "password" ? 1024 : 300}
        minLength={type === "password" ? 12 : undefined}
      />
    </label>
  );
}
