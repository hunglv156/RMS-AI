import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Candidate, Resume } from "@rms-ai/contracts";
import { ArrowLeft, ChevronRight, FileUp, Plus, Users } from "lucide-react";
import { useLoad, useWorkspace } from "../../app/context";
import { ResumeUpload, ResumeDownload } from "./ResumeControls";
import {
  ActionForm,
  date,
  day,
  Empty,
  Field,
  Heading,
  LoadState,
  Pager,
  Search,
} from "../../app/ui";
export function CandidateFields({ value }: { value?: Candidate }) {
  return (
    <>
      <Field
        label="Họ và tên"
        name="display_name"
        value={value?.display_name}
        required
      />
      <div className="p-form-grid">
        <Field
          label="Email"
          type="email"
          name="email"
          value={value?.email ?? ""}
        />
        <Field label="Số điện thoại" name="phone" value={value?.phone ?? ""} />
      </div>
      <label>
        Nguồn hồ sơ
        <select
          name="provenance"
          defaultValue={value?.provenance ?? "synthetic"}
        >
          <option value="synthetic">Dữ liệu tổng hợp (synthetic)</option>
          <option value="demo_public">Dữ liệu công khai dùng cho demo</option>
        </select>
      </label>
      <small className="muted">
        Chỉ sử dụng hồ sơ tổng hợp hoặc dữ liệu công khai được phép dùng cho
        demo.
      </small>
    </>
  );
}
const input = (f: FormData) => ({
  display_name: String(f.get("display_name")),
  email: String(f.get("email")) || null,
  phone: String(f.get("phone")) || null,
  provenance: f.get("provenance") as "synthetic" | "demo_public",
});
export function Candidates() {
  const { client, session } = useWorkspace(),
    navigate = useNavigate();
  const [page, setPage] = useState(1),
    [search, setSearch] = useState(""),
    [create, setCreate] = useState(false);
  const load = useLoad(
    (s) => client.candidates({ page, search }, s),
    [client, page, search],
  );
  if (session.user.role === "reviewer")
    return (
      <Empty title="Hồ sơ theo vị trí được phân công">
        Mở một vị trí để xem các hồ sơ bạn được phép đánh giá.
      </Empty>
    );
  return (
    <>
      <Heading title="Ứng viên">Mỗi hồ sơ, một tiềm năng để khám phá.</Heading>
      <div className="p-toolbar">
        <Search
          value={search}
          label="Tìm ứng viên"
          placeholder="Tên hoặc email…"
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
        />
        <button
          className="button primary"
          aria-expanded={create}
          onClick={() => setCreate(!create)}
        >
          <Plus size={17} aria-hidden="true" />
          Thêm ứng viên
        </button>
      </div>
      {create && (
        <section className="p-card">
          <h2>Gặp gỡ một ứng viên mới</h2>
          <ActionForm
            label="Tạo hồ sơ ứng viên"
            onSubmit={async (f) => {
              const c = await client.createCandidate(input(f));
              navigate(`/candidates/${c.id}`);
            }}
          >
            <CandidateFields />
          </ActionForm>
        </section>
      )}
      <LoadState {...load} />
      {load.data && (
        <>
          <section className="p-card">
            {load.data.items.length ? (
              <div className="p-rows">
                {load.data.items.map((c) => (
                  <Link className="p-row" key={c.id} to={`/candidates/${c.id}`}>
                    <span className="p-avatar" aria-hidden="true">
                      {c.display_name.slice(0, 1)}
                    </span>
                    <div>
                      <strong>{c.display_name}</strong>
                      <small>
                        {c.email ?? "Chưa có email"} · Thêm ngày{" "}
                        {day(c.created_at)}
                      </small>
                    </div>
                    <span className="p-tag">
                      {c.provenance === "synthetic"
                        ? "Hồ sơ tổng hợp"
                        : "Demo công khai"}
                    </span>
                    <ChevronRight size={18} aria-hidden="true" />
                  </Link>
                ))}
              </div>
            ) : (
              <Empty
                title={
                  search ? "Không có ứng viên phù hợp" : "Chưa có ứng viên"
                }
                icon={Users}
              >
                {search
                  ? "Thử tìm với tên hoặc email khác."
                  : "Thêm hồ sơ ứng viên đầu tiên để tải CV và liên kết vào vị trí."}
              </Empty>
            )}
            <Pager page={page} total={load.data.total} onChange={setPage} />
          </section>
        </>
      )}
    </>
  );
}
export function CandidateDetail() {
  const { id = "" } = useParams();
  const { client, session } = useWorkspace();
  const load = useLoad((s) => client.candidate(id, s), [client, id]);
  const [resumes, setResumes] = useState<Resume[]>([]),
    [resumeId, setResumeId] = useState(""),
    [jobId, setJobId] = useState(""),
    [page, setPage] = useState(1);
  const jobs = useLoad(
    (s) => client.jobs({ status: "open", page }, s),
    [client, page],
  );
  const navigate = useNavigate();
  if (session.user.role === "reviewer")
    return <Empty title="Mở hồ sơ từ vị trí được phân công" />;
  return (
    <>
      <Link className="p-back" to="/candidates">
        <ArrowLeft size={15} aria-hidden="true" />
        Ứng viên
      </Link>
      <LoadState {...load} />
      {load.data && (
        <>
          <Heading title={load.data.display_name}>
            {load.data.email ?? "Hồ sơ tổng hợp cho không gian tuyển dụng"}
          </Heading>
          <div className="p-detail-grid">
            <section className="p-card">
              <h2>Thông tin ứng viên</h2>
              <ActionForm
                key={load.data.updated_at}
                onSubmit={async (f) => {
                  await client.updateCandidate(id, input(f));
                  load.reload();
                }}
              >
                <CandidateFields value={load.data} />
              </ActionForm>
            </section>
            <div>
              <section className="p-card">
                <div className="p-section-title">
                  <h2>CV riêng tư</h2>
                  <FileUp size={22} />
                </div>
                <p className="muted">
                  PDF tiếng Anh · Tối đa 10 MB. Mỗi lần tải tạo một phiên bản
                  mới.
                </p>
                <ResumeUpload
                  candidateId={id}
                  onUploaded={(r) => {
                    setResumes((v) => [r, ...v]);
                    setResumeId(r.id);
                  }}
                />
                {resumes.length ? (
                  <div className="p-list">
                    {resumes.map((r) => (
                      <div className="p-record" key={r.id}>
                        <div>
                          <strong>{r.original_filename}</strong>
                          <small>
                            Phiên bản {r.version_no} · {date(r.uploaded_at)}
                          </small>
                        </div>
                        <ResumeDownload id={r.id} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="p-hint">
                    CV vừa tải sẽ hiện tại đây. Các phiên bản đã liên kết được
                    giữ trong từng hồ sơ ứng tuyển.
                  </p>
                )}
              </section>
              <section className="p-card">
                <h2>Liên kết vào vị trí</h2>
                <p className="muted">
                  Chọn đúng phiên bản CV cho hồ sơ ứng tuyển mới.
                </p>
                <LoadState {...jobs} />
                <ActionForm
                  label="Tạo hồ sơ ứng tuyển"
                  disabled={!resumeId || !jobId}
                  onSubmit={async () => {
                    const a = await client.createApplication(jobId, {
                      candidate_id: id,
                      resume_id: resumeId,
                    });
                    navigate(`/applications/${a.id}?job=${jobId}`);
                  }}
                >
                  <label>
                    Phiên bản CV
                    <select
                      value={resumeId}
                      onChange={(e) => setResumeId(e.target.value)}
                      required
                    >
                      <option value="">Tải CV PDF trước khi liên kết</option>
                      {resumes.map((r) => (
                        <option key={r.id} value={r.id}>
                          v{r.version_no} · {r.original_filename}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Vị trí đang tuyển
                    <select
                      value={jobId}
                      onChange={(e) => setJobId(e.target.value)}
                      required
                    >
                      <option value="">Chọn vị trí tuyển dụng</option>
                      {jobs.data?.items.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.title}
                        </option>
                      ))}
                    </select>
                  </label>
                </ActionForm>
                {jobs.data && (
                  <Pager
                    page={page}
                    total={jobs.data.total}
                    onChange={setPage}
                  />
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </>
  );
}
