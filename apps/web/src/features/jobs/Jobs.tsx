import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  BriefcaseBusiness,
  ChevronRight,
  FileCheck2,
  FileClock,
  Plus,
  Settings2,
  Users,
} from "lucide-react";
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
  day,
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
          label="Tìm vị trí"
          placeholder="Nhập tên vị trí…"
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
        {session.user.role !== "reviewer" && (
          <button
            className="button primary"
            aria-expanded={create}
            onClick={() => setCreate(!create)}
          >
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
                <span className="p-job-icon" aria-hidden="true">
                  <BriefcaseBusiness size={20} />
                </span>
                <div>
                  <h2 title={j.title}>{j.title}</h2>
                  <p>
                    <span>Tạo ngày {day(j.created_at)}</span>
                    <span
                      className={
                        j.active_jd_version_id ? "p-ok" : "p-attention"
                      }
                    >
                      {j.active_jd_version_id ? (
                        <FileCheck2 size={14} aria-hidden="true" />
                      ) : (
                        <FileClock size={14} aria-hidden="true" />
                      )}
                      {j.active_jd_version_id
                        ? "Có JD đã phê duyệt"
                        : "Chưa có JD chính thức"}
                    </span>
                  </p>
                </div>
                <Badge value={j.status} />
                <ChevronRight size={20} aria-hidden="true" />
              </Link>
            ))}
          </div>
          {!load.data.items.length && (
            <section className="p-card">
              <Empty
                title={
                  search
                    ? "Không có vị trí phù hợp"
                    : "Chưa có vị trí tuyển dụng"
                }
                icon={BriefcaseBusiness}
              >
                {search
                  ? `Không tìm thấy vị trí nào khớp “${search}”. Thử một tên khác.`
                  : session.user.role === "reviewer"
                    ? "Bạn chưa được phân công vị trí nào. Liên hệ quản trị viên để được cấp quyền."
                    : "Tạo vị trí tuyển dụng đầu tiên để bắt đầu."}
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
        <ArrowLeft size={15} aria-hidden="true" />
        Vị trí tuyển dụng
      </Link>
      <LoadState {...load} />
      {load.data && (
        <>
          <Heading
            eyebrow="VỊ TRÍ TUYỂN DỤNG"
            title={load.data.title}
            meta={
              <>
                <Badge value={load.data.status} />
                <span>Tạo ngày {day(load.data.created_at)}</span>
                <span>
                  {load.data.active_jd_version_id
                    ? "Có JD đã phê duyệt"
                    : "Chưa có JD chính thức"}
                </span>
              </>
            }
          />
          <div className="p-job-layout">
            <div className="p-job-main">
              <JdPanel job={load.data} onChange={load.reload} />
            </div>
            <div className="p-job-side">
              <section className="p-card">
                <div className="p-section-title">
                  <div>
                    <h2>Hồ sơ ứng tuyển</h2>
                    {apps.data && (
                      <p className="p-subtle">
                        {apps.data.total} hồ sơ đang gắn với vị trí này
                      </p>
                    )}
                  </div>
                  {session.user.role !== "reviewer" &&
                    load.data.status === "open" && (
                      <Link className="button secondary" to="/candidates">
                        <Plus size={16} aria-hidden="true" />
                        Thêm ứng viên
                      </Link>
                    )}
                </div>
                {(search || (apps.data?.total ?? 0) > 5) && (
                  <Search
                    value={search}
                    label="Tìm hồ sơ"
                    onChange={(v) => {
                      setSearch(v);
                      setPage(1);
                    }}
                  />
                )}
                <LoadState {...apps} />
                {apps.data && (
                  <>
                    {apps.data.items.length ? (
                      <div className="p-rows">
                        {apps.data.items.map((a) => (
                          <Link
                            key={a.id}
                            className="p-row"
                            to={`/applications/${a.id}?job=${id}`}
                          >
                            <span className="p-avatar" aria-hidden="true">
                              {(a.candidate_display_name ?? "Ứng viên").slice(
                                0,
                                1,
                              )}
                            </span>
                            <div>
                              <strong>
                                {a.candidate_display_name ?? "Ứng viên"}
                              </strong>
                              <small>Tiếp nhận {date(a.created_at)}</small>
                            </div>
                            <Badge value={a.stage} />
                            <ChevronRight size={18} aria-hidden="true" />
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <Empty title="Đang chờ những câu chuyện mới" icon={Users}>
                        {search
                          ? "Không có hồ sơ khớp từ khóa này."
                          : "Tạo ứng viên, tải PDF và liên kết vào vị trí này để bắt đầu."}
                      </Empty>
                    )}
                    <Pager
                      page={page}
                      total={apps.data.total}
                      onChange={setPage}
                    />
                  </>
                )}
              </section>
              {session.user.role !== "reviewer" && (
                <details className="p-card p-disclosure-card">
                  <summary>
                    <Settings2 size={17} aria-hidden="true" />
                    Thông tin & trạng thái vị trí
                  </summary>
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
                    <p className="p-subtle">
                      Đóng vị trí sẽ ngừng tiếp nhận hồ sơ mới và phê duyệt JD.
                    </p>
                  </ActionForm>
                </details>
              )}
              {session.user.role === "admin" && <Assignments jobId={id} />}
            </div>
          </div>
        </>
      )}
    </>
  );
}
