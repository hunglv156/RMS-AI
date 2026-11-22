import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowUpRight, Plus } from "lucide-react";
import { useLoad, useWorkspace } from "../../app/context";
import {
  ActionForm,
  Badge,
  date,
  Empty,
  Field,
  Heading,
  LoadState,
  Pager,
  Search,
} from "../../app/ui";
import { JdPanel } from "../jd/JdPanel";
import { Assignments } from "../admin/Admin";
export function Jobs() {
  const { client, session } = useWorkspace(),
    navigate = useNavigate();
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [create, setCreate] = useState(false);
  const load = useLoad(
    (s) => client.jobs({ page, search }, s),
    [client, page, search],
  );
  return (
    <>
      <Heading title="Vị trí tuyển dụng">
        Mở ra cơ hội mới. Tìm những mảnh ghép phù hợp.
      </Heading>
      <div className="p-toolbar">
        <Search
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
        {session.user.role !== "reviewer" && (
          <button className="button primary" onClick={() => setCreate(!create)}>
            <Plus size={17} />
            Tạo vị trí
          </button>
        )}
      </div>
      {create && (
        <section className="p-card">
          <h2>Một cơ hội mới</h2>
          <ActionForm
            label="Tạo vị trí tuyển dụng"
            onSubmit={async (f) => {
              const j = await client.createJob({
                title: String(f.get("title")),
              });
              navigate(`/jobs/${j.id}`);
            }}
          >
            <Field label="Tên vị trí tuyển dụng" name="title" required />
          </ActionForm>
        </section>
      )}
      <LoadState {...load} />
      {load.data && (
        <>
          <div className="p-list">
            {load.data.items.map((j) => (
              <Link
                className="p-card p-job-row"
                key={j.id}
                to={`/jobs/${j.id}`}
              >
                <span className="p-job-icon">✳</span>
                <div>
                  <h2>{j.title}</h2>
                  <p>
                    Tạo ngày {date(j.created_at)} ·{" "}
                    {j.active_jd_version_id
                      ? "Có JD đã phê duyệt"
                      : "Chưa chọn JD chính thức"}
                  </p>
                </div>
                <Badge value={j.status} />
                <ArrowUpRight size={20} />
              </Link>
            ))}
          </div>
          {!load.data.items.length && (
            <section className="p-card">
              <Empty title="Chưa có vị trí phù hợp">
                Thử tên khác hoặc tạo vị trí tuyển dụng đầu tiên.
              </Empty>
            </section>
          )}
          <Pager page={page} total={load.data.total} onChange={setPage} />
        </>
      )}
    </>
  );
}
export function JobDetail() {
  const { id = "" } = useParams();
  const { client, session } = useWorkspace();
  const [page, setPage] = useState(1),
    [search, setSearch] = useState("");
  const load = useLoad((s) => client.job(id, s), [client, id]);
  const apps = useLoad(
    (s) => client.applications(id, { page, search }, s),
    [client, id, page, search],
  );
  return (
    <>
      <Link className="p-back" to="/jobs">
        ← Vị trí tuyển dụng
      </Link>
      <LoadState {...load} />
      {load.data && (
        <>
          <Heading title={load.data.title}>
            <Badge value={load.data.status} />
          </Heading>
          {session.user.role !== "reviewer" && (
            <details className="p-card">
              <summary>Thông tin & trạng thái vị trí</summary>
              <ActionForm
                onSubmit={async (f) => {
                  await client.updateJob(id, {
                    title: String(f.get("title")),
                    status: f.get("status") as "open" | "closed",
                    revision: load.data!.revision,
                  });
                  load.reload();
                }}
              >
                <Field
                  label="Tên vị trí tuyển dụng"
                  name="title"
                  value={load.data.title}
                  required
                />
                <label>
                  Trạng thái
                  <select name="status" defaultValue={load.data.status}>
                    <option value="open">Đang tuyển</option>
                    <option value="closed">Đã đóng</option>
                  </select>
                </label>
                <p className="muted">
                  Đóng vị trí sẽ ngừng tiếp nhận hồ sơ mới và phê duyệt JD.
                </p>
              </ActionForm>
            </details>
          )}
          <JdPanel job={load.data} onChange={load.reload} />
          {session.user.role === "admin" && <Assignments jobId={id} />}
          <section className="p-card">
            <div className="p-section-title">
              <h2>Hồ sơ ứng tuyển</h2>
              {session.user.role !== "reviewer" &&
                load.data.status === "open" && (
                  <Link className="button secondary" to="/candidates">
                    Thêm ứng viên <Plus size={16} />
                  </Link>
                )}
            </div>
            <Search
              value={search}
              onChange={(v) => {
                setSearch(v);
                setPage(1);
              }}
            />
            <LoadState {...apps} />
            {apps.data && (
              <>
                {apps.data.items.length ? (
                  <div className="p-list">
                    {apps.data.items.map((a) => (
                      <Link
                        key={a.id}
                        className="p-record"
                        to={`/applications/${a.id}?job=${id}`}
                      >
                        <div>
                          <strong>Hồ sơ #{a.id.slice(0, 8)}</strong>
                          <small>Tiếp nhận {date(a.created_at)}</small>
                        </div>
                        <Badge value={a.stage} />
                        <ArrowUpRight size={18} />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Empty title="Đang chờ những câu chuyện mới">
                    Tạo ứng viên, tải PDF và liên kết vào vị trí này để bắt đầu.
                  </Empty>
                )}
                <Pager page={page} total={apps.data.total} onChange={setPage} />
              </>
            )}
          </section>
        </>
      )}
    </>
  );
}
