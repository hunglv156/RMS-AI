import { Link } from "react-router-dom";
import { Sprout } from "lucide-react";
import { useWorkspace, useLoad } from "./context";
import { Heading, Empty, LoadState, Badge, date } from "./ui";
import { runLabels } from "../features/screenings/ScreeningPanel";
export function Dashboard() {
  const { client, session } = useWorkspace();
  const load = useLoad((s) => client.dashboard(s), [client]);
  return (
    <>
      <Heading
        eyebrow="MỖI NGÀY, MỘT CƠ HỘI MỚI"
        title={`Chào ${session.user.display_name},`}
      >
        Cùng xây dựng đội ngũ tiếp theo của bạn.
      </Heading>
      <section className="p-welcome">
        <div>
          <span className="p-eyebrow">TỪ TIỀM NĂNG ĐẾN ĐỒNG HÀNH</span>
          <h2>
            Đúng người.
            <br />
            Vững bước cùng nhau.
          </h2>
          <p>Hiểu từng hồ sơ. Đưa ra lựa chọn có căn cứ.</p>
          <Link className="button primary" to="/jobs">
            Khám phá vị trí tuyển dụng ↗
          </Link>
        </div>
        <div className="p-plant" aria-hidden="true">
          <Sprout strokeWidth={1} />
          <span>Growing together.</span>
        </div>
      </section>
      <LoadState {...load} />
      {load.data && (
        <>
          <div className="s-stats">
            {Object.entries({
              jobs_open: "Vị trí đang tuyển",
              applications: "Hồ sơ ứng tuyển",
              awaiting_review: "Chờ quyết định",
              shortlist: "Danh sách ngắn",
              hold: "Cân nhắc thêm",
              reject: "Chưa phù hợp",
              screening_failures: "Phân tích gặp lỗi",
            }).map(([key, label]) => (
              <div className="p-card" key={key}>
                <strong>
                  {load.data!.counts[key as keyof typeof load.data.counts]}
                </strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <div className="p-detail-grid">
            {(
              [
                ["Chờ góc nhìn của bạn", load.data.pending_reviews],
                ["Cần thử lại", load.data.latest_failures],
              ] as const
            ).map(([title, rows]) => (
              <section className="p-card" key={title}>
                <h2>{title}</h2>
                {!rows.length && <Empty title="Mọi thứ đã gọn gàng" />}
                {rows.map((r) => (
                  <Link
                    className="s-dashboard-row"
                    key={r.id}
                    to={`/applications/${r.application_id}?job=${r.job_id}&run=${r.id}`}
                  >
                    <strong>
                      Hồ sơ #{r.application_id.slice(0, 8)} ·{" "}
                      {runLabels[r.status]}
                    </strong>
                    <small>
                      {date(r.queued_at)} ·{" "}
                      {r.error_code || "Mở bằng chứng & ghi quyết định"}
                    </small>
                  </Link>
                ))}
              </section>
            ))}
          </div>
          <section className="p-card">
            <h2>Hồ sơ mới tiếp nhận</h2>
            {!load.data.recent_applications.length && (
              <Empty title="Chưa có hồ sơ ứng tuyển" />
            )}
            {load.data.recent_applications.map((a) => (
              <Link
                className="s-dashboard-row"
                key={a.id}
                to={`/applications/${a.id}?job=${a.job_id}`}
              >
                <Badge value={a.stage} />
                <span>Hồ sơ {a.id.slice(0, 8)}</span>
                <small>{date(a.created_at)}</small>
              </Link>
            ))}
          </section>
        </>
      )}
    </>
  );
}
