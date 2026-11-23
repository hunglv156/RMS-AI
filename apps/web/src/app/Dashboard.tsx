import { Link } from "react-router-dom";
import {
  AlertTriangle,
  BriefcaseBusiness,
  ChevronRight,
  ClipboardCheck,
  FileText,
  Sprout,
  type LucideIcon,
} from "lucide-react";
import { useWorkspace, useLoad } from "./context";
import { Heading, Empty, LoadState, Badge, date, num, shortId } from "./ui";
import { useCandidateNames, useJobTitles } from "./names";
import { runErrorTitles } from "../features/screenings/ScreeningPanel";
const today = new Intl.DateTimeFormat("vi-VN", {
  weekday: "long",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});
export function Dashboard() {
  const { client, session } = useWorkspace();
  const load = useLoad((s) => client.dashboard(s), [client]);
  const d = load.data;
  const candidateOf = Object.fromEntries(
    d?.recent_applications.map((a) => [a.id, a.candidate_id]) ?? [],
  );
  const names = useCandidateNames(Object.values(candidateOf));
  const titles = useJobTitles([
    ...(d?.recent_applications.map((a) => a.job_id) ?? []),
    ...(d?.pending_reviews.map((r) => r.job_id) ?? []),
    ...(d?.latest_failures.map((r) => r.job_id) ?? []),
  ]);
  const who = (applicationId: string) =>
    names[candidateOf[applicationId]] ?? `Hồ sơ ${shortId(applicationId)}`;
  const kpis: [keyof NonNullable<typeof d>["counts"], string, LucideIcon][] = [
    ["jobs_open", "Vị trí đang tuyển", BriefcaseBusiness],
    ["applications", "Hồ sơ ứng tuyển", FileText],
    ["awaiting_review", "Chờ quyết định", ClipboardCheck],
    ["screening_failures", "Phân tích gặp lỗi", AlertTriangle],
  ];
  const decided = d ? d.counts.shortlist + d.counts.hold + d.counts.reject : 0;
  return (
    <>
      <Heading
        eyebrow={today.format(new Date()).toLocaleUpperCase("vi-VN")}
        title={`Chào ${session.user.display_name},`}
      >
        Cùng xây dựng đội ngũ tiếp theo của bạn.
      </Heading>
      <section className="p-welcome" aria-labelledby="p-welcome-title">
        <div>
          <span className="p-eyebrow">TỪ TIỀM NĂNG ĐẾN ĐỒNG HÀNH</span>
          <h2 id="p-welcome-title">Đúng người. Vững bước cùng nhau.</h2>
          <p>Hiểu từng hồ sơ. Đưa ra lựa chọn có căn cứ.</p>
          <Link className="button primary" to="/jobs">
            Khám phá vị trí tuyển dụng
            <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div className="p-plant" aria-hidden="true">
          <Sprout strokeWidth={1} />
          <span>Growing together.</span>
        </div>
      </section>
      <LoadState {...load} />
      {d && (
        <>
          <h2 className="sr-only">Số liệu tổng quan</h2>
          <div className="s-stats">
            {kpis.map(([key, label, Icon]) => (
              <div
                className={`p-card s-stat ${key === "screening_failures" && d.counts[key] ? "s-stat-alert" : ""}`}
                key={key}
              >
                <span className="s-stat-icon" aria-hidden="true">
                  <Icon size={18} />
                </span>
                <strong>{num(d.counts[key], 0)}</strong>
                <span>{label}</span>
              </div>
            ))}
            <div className="p-card s-stat s-decided">
              <span className="s-stat-label">Quyết định đã ghi</span>
              <div
                className="s-bar"
                role="img"
                aria-label={`Danh sách ngắn ${d.counts.shortlist}, cân nhắc thêm ${d.counts.hold}, chưa phù hợp ${d.counts.reject}`}
              >
                {(["shortlist", "hold", "reject"] as const).map((k) =>
                  d.counts[k] ? (
                    <i
                      key={k}
                      className={`s-bar-${k}`}
                      style={{ flexGrow: d.counts[k] }}
                    />
                  ) : null,
                )}
                {!decided && <i className="s-bar-none" />}
              </div>
              <ul>
                {(["shortlist", "hold", "reject"] as const).map((k) => (
                  <li key={k}>
                    <Badge value={k} />
                    <strong>{num(d.counts[k], 0)}</strong>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="p-detail-grid">
            {(
              [
                [
                  "Chờ góc nhìn của bạn",
                  "Kết quả đã sẵn sàng, đang chờ người quyết định.",
                  d.pending_reviews,
                ],
                [
                  "Cần thử lại",
                  "Những lần phân tích chưa hoàn tất gần đây.",
                  d.latest_failures,
                ],
              ] as const
            ).map(([title, hint, rows]) => (
              <section className="p-card" key={title}>
                <div className="p-section-title">
                  <div>
                    <h2>{title}</h2>
                    <p className="p-subtle">{hint}</p>
                  </div>
                  <span className="p-count">{num(rows.length, 0)}</span>
                </div>
                {!rows.length && (
                  <Empty title="Mọi thứ đã gọn gàng" icon={ClipboardCheck}>
                    Không có hồ sơ nào cần xử lý lúc này.
                  </Empty>
                )}
                <div className="p-rows">
                  {rows.map((r) => (
                    <Link
                      className="p-row"
                      key={r.id}
                      to={`/applications/${r.application_id}?job=${r.job_id}&run=${r.id}`}
                    >
                      <div>
                        <strong>{who(r.application_id)}</strong>
                        <small>
                          {titles[r.job_id] ?? "Vị trí tuyển dụng"} ·{" "}
                          {date(r.queued_at)}
                        </small>
                        {r.error_code && (
                          <small className="p-row-error">
                            {runErrorTitles[r.error_code] ??
                              "Dịch vụ chưa thể hoàn tất phân tích."}
                          </small>
                        )}
                      </div>
                      <Badge value={r.status} />
                      <ChevronRight size={18} aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <section className="p-card">
            <div className="p-section-title">
              <h2>Hồ sơ mới tiếp nhận</h2>
              <Link className="p-link" to="/jobs">
                Xem theo vị trí
              </Link>
            </div>
            {!d.recent_applications.length && (
              <Empty title="Chưa có hồ sơ ứng tuyển">
                Hồ sơ sẽ xuất hiện khi một CV được liên kết vào vị trí.
              </Empty>
            )}
            <div className="p-rows">
              {d.recent_applications.map((a) => (
                <Link
                  className="p-row"
                  key={a.id}
                  to={`/applications/${a.id}?job=${a.job_id}`}
                >
                  <span className="p-avatar" aria-hidden="true">
                    {who(a.id)
                      .replace(/^Hồ sơ #/, "")
                      .slice(0, 1)}
                  </span>
                  <div>
                    <strong>{who(a.id)}</strong>
                    <small>
                      {titles[a.job_id] ?? "Vị trí tuyển dụng"} · Tiếp nhận{" "}
                      {date(a.created_at)}
                    </small>
                  </div>
                  <Badge value={a.stage} />
                  <ChevronRight size={18} aria-hidden="true" />
                </Link>
              ))}
            </div>
          </section>
        </>
      )}
    </>
  );
}
