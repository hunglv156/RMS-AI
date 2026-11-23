import { useState } from "react";
import { useWorkspace, useLoad } from "../../app/context";
import { ScrollText } from "lucide-react";
import { Heading, LoadState, Empty, Pager, date, shortId } from "../../app/ui";
import { usePeople } from "../reviews/ReviewPanel";
const actions: Record<string, string> = {
  "auth.login": "Đăng nhập",
  "auth.logout": "Đăng xuất",
  "auth.login_failed": "Đăng nhập thất bại",
  "auth.session_denied": "Từ chối phiên không hợp lệ",
  "auth.action_denied": "Từ chối thao tác không được phép",
  "auth.csrf_denied": "Từ chối yêu cầu thiếu CSRF",
  "auth.origin_denied": "Từ chối nguồn không hợp lệ",
  "auth.throttled": "Tạm khóa đăng nhập",
  "user.created": "Tạo tài khoản",
  "user.updated": "Cập nhật tài khoản",
  "job.created": "Tạo vị trí",
  "job.updated": "Cập nhật vị trí",
  "job.assignments_updated": "Giao người đánh giá",
  "jd.created": "Tạo JD nháp",
  "jd.updated": "Sửa JD nháp",
  "jd.submitted": "Gửi JD chờ duyệt",
  "jd.approved": "Phê duyệt JD",
  "jd.returned_to_draft": "Trả JD về nháp",
  "jd.cloned": "Sao chép JD",
  "candidate.created": "Tạo ứng viên",
  "candidate.updated": "Cập nhật ứng viên",
  "resume.uploaded": "Tải CV lên",
  "resume.download_authorized": "Tải CV xuống",
  "application.created": "Tạo hồ sơ ứng tuyển",
  "application.resume_replaced": "Đổi phiên bản CV",
  "screening.requested": "Yêu cầu phân tích",
  "screening.retried": "Thử lại phân tích",
  "screening.started": "Bắt đầu xử lý phân tích",
  "screening.retry_wait": "Chờ thử lại phân tích",
  "screening.completed": "Hoàn tất phân tích",
  "screening.failed": "Phân tích gặp lỗi",
  "review.created": "Ghi quyết định",
  "demo.seeded": "Dữ liệu demo tổng hợp",
};
const resources: Record<string, string> = {
  user: "Tài khoản",
  session: "Phiên đăng nhập",
  job: "Vị trí",
  jd_version: "Phiên bản JD",
  candidate: "Ứng viên",
  resume: "CV",
  application: "Hồ sơ ứng tuyển",
  screening_run: "Lần phân tích",
  review: "Quyết định",
  human_review: "Quyết định",
  screening: "Lần phân tích",
  jd: "Phiên bản JD",
  demo: "Dữ liệu demo",
};
export function Audit() {
  const { client } = useWorkspace();
  const jobs = useLoad((s) => client.jobs({ pageSize: 100 }, s), [client]);
  const person = usePeople();
  const [page, setPage] = useState(1),
    [action, setAction] = useState(""),
    [job, setJob] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const load = useLoad(
    (s) =>
      client.auditEvents(
        {
          page,
          pageSize: 20,
          action: action || undefined,
          job_id: job || undefined,
          from: from ? new Date(from).toISOString() : undefined,
          to: to ? new Date(to).toISOString() : undefined,
        },
        s,
      ),
    [client, page, action, job, from, to],
  );
  return (
    <>
      <Heading eyebrow="MINH BẠCH TRONG TỪNG BƯỚC" title="Dấu vết hoạt động">
        Lịch sử lưu trữ của không gian tuyển dụng.
      </Heading>
      <section className="p-card">
        <div className="s-filters">
          <label>
            Hoạt động
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả hoạt động</option>
              {Object.entries(actions).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Vị trí tuyển dụng
            <select
              value={job}
              onChange={(e) => {
                setJob(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả vị trí</option>
              {jobs.data?.items.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Từ ngày
            <input
              type="datetime-local"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            Đến ngày
            <input
              type="datetime-local"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
            />
          </label>
        </div>
        <LoadState {...load} />
        {load.data && (
          <>
            {!load.data.items.length && (
              <Empty title="Chưa có hoạt động phù hợp" icon={ScrollText}>
                Thử bỏ bớt bộ lọc hoặc chọn khoảng thời gian khác.
              </Empty>
            )}
            <ol className="s-audit-list">
              {load.data.items.map((e) => (
                <li key={e.id} className="s-audit">
                  <time dateTime={e.created_at}>{date(e.created_at)}</time>
                  <div>
                    <strong>{actions[e.action] || e.action}</strong>
                    <p>
                      {e.actor_type === "user"
                        ? person(e.actor_id)
                        : e.actor_type === "worker"
                          ? "Tiến trình phân tích"
                          : "Hệ thống"}{" "}
                      ·{" "}
                      {resources[e.resource_type.toLowerCase()] ??
                        e.resource_type}{" "}
                      {e.resource_id ? shortId(e.resource_id) : ""}
                    </p>
                    <details>
                      <summary>Chi tiết đối chiếu</summary>
                      <dl>
                        <div>
                          <dt>Mã sự kiện</dt>
                          <dd>#{e.id}</dd>
                        </div>
                        <div>
                          <dt>Đối tượng</dt>
                          <dd>
                            {e.resource_type} · {e.resource_id}
                          </dd>
                        </div>
                        <div>
                          <dt>Mã yêu cầu</dt>
                          <dd>{e.request_id}</dd>
                        </div>
                      </dl>
                      <pre>{JSON.stringify(e.safe_metadata, null, 2)}</pre>
                    </details>
                  </div>
                </li>
              ))}
            </ol>
            <Pager page={page} total={load.data.total} onChange={setPage} />
          </>
        )}
      </section>
    </>
  );
}
