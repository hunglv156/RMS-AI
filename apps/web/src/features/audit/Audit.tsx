import { useState } from "react";
import { useWorkspace, useLoad } from "../../app/context";
import { Heading, LoadState, Empty, Pager, date } from "../../app/ui";
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
  "screening.completed": "Hoàn tất phân tích",
  "screening.failed": "Phân tích gặp lỗi",
  "review.created": "Ghi quyết định",
  "demo.seeded": "Dữ liệu demo tổng hợp",
};
export function Audit() {
  const { client } = useWorkspace();
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
            Mã vị trí
            <input
              value={job}
              onChange={(e) => {
                setJob(e.target.value);
                setPage(1);
              }}
            />
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
              <Empty title="Chưa có hoạt động phù hợp" />
            )}
            {load.data.items.map((e) => (
              <article key={e.id} className="s-audit">
                <div>
                  <strong>{actions[e.action] || e.action}</strong>
                  <small>
                    {date(e.created_at)} · #{e.id}
                  </small>
                </div>
                <p>
                  Người thực hiện:{" "}
                  {e.actor_type === "user"
                    ? person(e.actor_id)
                    : e.actor_type === "worker"
                      ? "Tiến trình phân tích"
                      : "Hệ thống"}
                </p>
                <small>
                  {e.resource_type} · {e.resource_id}
                </small>
                <details>
                  <summary>Chi tiết đối chiếu</summary>
                  <p>Mã yêu cầu: {e.request_id}</p>
                  <pre>{JSON.stringify(e.safe_metadata, null, 2)}</pre>
                </details>
              </article>
            ))}
            <Pager page={page} total={load.data.total} onChange={setPage} />
          </>
        )}
      </section>
    </>
  );
}
