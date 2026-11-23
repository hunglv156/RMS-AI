import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  BriefcaseBusiness,
  Users,
  ShieldCheck,
  ScrollText,
  UserCog,
  Leaf,
  Moon,
  Sun,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useWorkspace } from "./context";
import { labels } from "./ui";
import { message } from "../lib/api/platform";
export function ThemeButton() {
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem("la-theme") === "dark";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("la-theme", dark ? "dark" : "light");
    } catch {
      /* Optional preference. */
    }
  }, [dark]);
  return (
    <button
      className="p-icon"
      aria-label={dark ? "Chuyển giao diện sáng" : "Chuyển giao diện tối"}
      onClick={() => setDark(!dark)}
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
export function Shell({ onLogout }: { onLogout: () => void }) {
  const { session, client } = useWorkspace();
  const [open, setOpen] = useState(false),
    [error, setError] = useState("");
  const sidebar = useRef<HTMLElement>(null);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  // After sign-in and each route change, keyboard and screen-reader users start at the content.
  useEffect(() => {
    if (document.activeElement === document.body || !document.activeElement)
      document.getElementById("main")?.focus({ preventScroll: true });
    else if (
      !document.getElementById("main")?.contains(document.activeElement) &&
      !sidebar.current?.contains(document.activeElement)
    )
      document.getElementById("main")?.focus({ preventScroll: true });
  }, [loc.pathname]);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebar.current
      ?.querySelector<HTMLButtonElement>(".p-mobile-close")
      ?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab") return;
      const elements = Array.from(
        sidebar.current?.querySelectorAll<HTMLElement>("a[href], button") ?? [],
      ).filter((e) => e.getClientRects().length);
      const first = elements[0],
        last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
      if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, [open]);
  const nav = [
    ["/dashboard", "Tổng quan", LayoutDashboard],
    ["/jobs", "Vị trí tuyển dụng", BriefcaseBusiness],
    ...(session.user.role !== "reviewer"
      ? [["/candidates", "Ứng viên", Users] as const]
      : []),
    ...(session.user.role === "admin"
      ? [
          ["/admin", "Quản trị", UserCog] as const,
          ["/audit", "Nhật ký hoạt động", ScrollText] as const,
        ]
      : []),
  ] as const;
  return (
    <div className="p-shell">
      <a href="#main" className="skip-link">
        Đến nội dung chính
      </a>
      <aside
        ref={sidebar}
        id="workspace-navigation"
        className={`p-sidebar ${open ? "p-sidebar-open" : ""}`}
      >
        <a className="p-logo" href="/dashboard">
          lá<span>.</span>
          <Leaf size={20} />
        </a>
        <p className="p-sidebar-caption">TUYỂN DỤNG, THẬT TỰ NHIÊN.</p>
        <button
          className="p-mobile-close p-icon"
          aria-label="Đóng điều hướng"
          onClick={() => setOpen(false)}
        >
          <X />
        </button>
        <div className="p-workspace">
          <span className="p-workspace-mark">L</span>
          <div>
            <strong>Không gian tuyển dụng</strong>
            <small>Nền tảng nội bộ</small>
          </div>
        </div>
        <p className="p-nav-caption">KHÔNG GIAN LÀM VIỆC</p>
        <nav aria-label="Điều hướng chính">
          {nav.map(([to, label, Icon]) => (
            <NavLink key={to} to={to}>
              <Icon size={19} aria-hidden="true" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-sidebar-bottom">
          <div className="p-care">
            <Leaf size={23} />
            <strong>Chọn người, bằng sự thấu hiểu.</strong>
            <p>
              AI hỗ trợ phân tích.
              <br />
              Con người đưa ra quyết định.
            </p>
          </div>
          <div className="p-profile">
            <span className="p-avatar">
              {session.user.display_name.slice(0, 1)}
            </span>
            <div>
              <strong>{session.user.display_name}</strong>
              <small>{labels[session.user.role]}</small>
            </div>
            <button
              className="p-icon"
              aria-label="Đăng xuất"
              onClick={async () => {
                try {
                  await client.logout();
                  onLogout();
                } catch (e) {
                  setError(message(e));
                }
              }}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      {open && (
        <button
          className="p-overlay"
          aria-label="Đóng menu"
          onClick={() => setOpen(false)}
        />
      )}
      <div className="p-body">
        <header className="p-topbar">
          <button
            className="p-menu p-icon"
            aria-label="Mở điều hướng"
            aria-expanded={open}
            aria-controls="workspace-navigation"
            onClick={() => setOpen(true)}
          >
            <Menu />
          </button>
          <p className="p-crumbs">
            <span className="p-crumbs-root">Không gian làm việc</span>
            <span aria-hidden="true" className="p-crumbs-root">
              /
            </span>
            <strong>
              {nav.find(([to]) => loc.pathname.startsWith(to))?.[1] ??
                "Hồ sơ ứng tuyển"}
            </strong>
          </p>
          <div className="p-topbar-right">
            <span className="p-private">
              <ShieldCheck size={14} /> Không gian riêng tư
            </span>
            <ThemeButton />
          </div>
        </header>
        {import.meta.env.VITE_USE_MOCK === "1" && (
          <div className="p-mock" role="status">
            BẢN XEM TRƯỚC · Mock PlatformClient · Dữ liệu mô phỏng trong bộ nhớ,
            không kết nối máy chủ.
          </div>
        )}
        <main id="main" className="p-main" tabIndex={-1}>
          {error && (
            <p className="p-error" role="alert">
              {error}
            </p>
          )}
          <Outlet />
        </main>
        <footer className="p-footer">
          lá. · Gieo cơ hội, nuôi dưỡng tiềm năng.
          <span>Đánh giá có căn cứ. Quyết định bởi con người.</span>
        </footer>
      </div>
    </div>
  );
}
