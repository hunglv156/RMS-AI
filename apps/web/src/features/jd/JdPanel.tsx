import { useState } from "react";
import type { Job, JdVersion } from "@rms-ai/contracts";
import { useLoad, useWorkspace } from "../../app/context";
import { ActionForm, Badge, date, Empty, LoadState, Pager } from "../../app/ui";
import { JDEditor, blankJD } from "../../components/JDEditor";
import type { JobDescription } from "../../lib/api/types";
import { validateJD } from "../../lib/validation";
export function JdPanel({ job, onChange }: { job: Job; onChange: () => void }) {
  const { client, session } = useWorkspace();
  const [page, setPage] = useState(1),
    [editing, setEditing] = useState<JdVersion | "new">();
  const load = useLoad(
    (s) => client.jdVersions(job.id, { page, sort: "-version_no" }, s),
    [client, job.id, page],
  );
  const changed = () => {
    setEditing(undefined);
    load.reload();
    onChange();
  };
  const author = session.user.role !== "reviewer";
  const actorName = (id?: string | null) =>
    id && id === session.user.id ? "bạn" : undefined;
  return (
    <section className="p-card">
      <div className="p-section-title">
        <div>
          <p className="p-eyebrow">NỀN TẢNG CỦA MỖI ĐÁNH GIÁ</p>
          <h2>Mô tả công việc</h2>
        </div>
        {author && (
          <button
            className="button secondary"
            onClick={() => setEditing("new")}
          >
            + Bản nháp mới
          </button>
        )}
      </div>
      <p className="muted">
        Mỗi phiên bản lưu một bước tiến. JD đã phê duyệt được giữ nguyên để đối
        chiếu.
      </p>
      <LoadState {...load} />
      {editing && (
        <JdForm
          key={editing === "new" ? "new" : editing.id}
          value={editing === "new" ? undefined : editing}
          job={job}
          onSaved={changed}
          onCancel={() => setEditing(undefined)}
        />
      )}
      {load.data && (
        <>
          {!load.data.items.length && !editing && (
            <Empty title="Bắt đầu bằng một JD rõ ràng">
              Tạo bản nháp với 1–8 tiêu chí, sau đó gửi người có quyền phê
              duyệt.
            </Empty>
          )}
          <div className="p-timeline">
            {load.data.items.map((v) => (
              <article key={v.id} className="p-version">
                <div className="p-section-title">
                  <h3>
                    Phiên bản {v.version_no}{" "}
                    {job.active_jd_version_id === v.id && (
                      <span className="p-badge">Đang sử dụng</span>
                    )}
                  </h3>
                  <Badge value={v.state} />
                </div>
                <h4>{v.title}</h4>
                <p>{v.summary || "Chưa có tóm tắt."}</p>
                <details>
                  <summary>{v.criteria.length} tiêu chí đánh giá</summary>
                  {v.criteria.map((c) => (
                    <div className="p-criterion" key={c.code}>
                      <strong>
                        {c.label} · {c.weight} điểm
                      </strong>
                      <p>{c.description}</p>
                      <small>
                        {c.priority === "must_have" ? "Bắt buộc" : "Ưu tiên"} ·{" "}
                        {c.keywords.join(", ") || "Chưa có từ khóa"}
                      </small>
                    </div>
                  ))}
                </details>
                <ol className="p-events">
                  <li>
                    Tạo · {date(v.created_at)}
                    {actorName(v.created_by) && ` · ${actorName(v.created_by)}`}
                  </li>
                  {v.submitted_at && (
                    <li>
                      Gửi duyệt · {date(v.submitted_at)}
                      {actorName(v.submitted_by) &&
                        ` · ${actorName(v.submitted_by)}`}
                    </li>
                  )}
                  {v.approved_at && (
                    <li>
                      Phê duyệt · {date(v.approved_at)}
                      {actorName(v.approved_by) &&
                        ` · ${actorName(v.approved_by)}`}
                    </li>
                  )}
                </ol>
                <div className="p-actions">
                  {author && v.state === "draft" && (
                    <>
                      <button
                        className="button secondary"
                        onClick={() => setEditing(v)}
                      >
                        Chỉnh sửa
                      </button>
                      <ActionForm
                        label="Gửi phê duyệt"
                        onSubmit={async () => {
                          await client.submitJd(v.id, { revision: v.revision });
                          changed();
                        }}
                      >
                        <span className="sr-only">
                          Gửi phiên bản {v.version_no}
                        </span>
                      </ActionForm>
                    </>
                  )}
                  {session.user.role !== "recruiter" &&
                    v.state === "pending_approval" && (
                      <>
                        <ActionForm
                          label="Phê duyệt JD"
                          disabled={job.status === "closed"}
                          onSubmit={async () => {
                            await client.approveJd(v.id, {
                              revision: v.revision,
                            });
                            changed();
                          }}
                        >
                          <span className="sr-only">
                            Phê duyệt phiên bản {v.version_no}
                          </span>
                        </ActionForm>
                        <details>
                          <summary>Trả về bản nháp</summary>
                          <ActionForm
                            label="Trả về để chỉnh sửa"
                            onSubmit={async (f) => {
                              await client.returnJdToDraft(v.id, {
                                revision: v.revision,
                                reason: String(f.get("reason")),
                              });
                              changed();
                            }}
                          >
                            <label>
                              Lý do
                              <textarea
                                name="reason"
                                required
                                maxLength={2000}
                              />
                            </label>
                          </ActionForm>
                        </details>
                      </>
                    )}
                  {author && (
                    <ActionForm
                      label="Nhân bản thành bản nháp"
                      onSubmit={async () => {
                        await client.cloneJd(v.id, { revision: v.revision });
                        changed();
                      }}
                    >
                      <span className="sr-only">
                        Nhân bản phiên bản {v.version_no}
                      </span>
                    </ActionForm>
                  )}
                </div>
              </article>
            ))}
          </div>
          <Pager page={page} total={load.data.total} onChange={setPage} />
        </>
      )}
    </section>
  );
}
function JdForm({
  value,
  job,
  onSaved,
  onCancel,
}: {
  value?: JdVersion;
  job: Job;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { client } = useWorkspace();
  const [jd, setJd] = useState<JobDescription>(() =>
      value
        ? {
            id: job.id,
            title: value.title,
            summary: value.summary,
            criteria: value.criteria,
          }
        : { ...structuredClone(blankJD), id: job.id, title: job.title },
    ),
    [valid, setValid] = useState(true),
    [issues, setIssues] = useState<string[]>([]);
  return (
    <div className="p-jd-form jd-panel">
      <h3>{value ? "Chỉnh sửa bản nháp" : "Bản nháp mới"}</h3>
      <ActionForm
        label="Lưu bản nháp"
        disabled={!valid}
        onSubmit={async () => {
          const errors = validateJD(jd);
          setIssues(errors);
          if (errors.length)
            throw new Error("Kiểm tra các tiêu chí trước khi lưu.");
          const body = {
            title: jd.title,
            summary: jd.summary,
            criteria: jd.criteria,
          };
          if (value)
            await client.updateJd(value.id, {
              ...body,
              revision: value.revision,
            });
          else await client.createJd(job.id, body);
          onSaved();
        }}
      >
        <JDEditor jd={jd} onChange={setJd} onValidity={setValid} />
        {issues.length > 0 && (
          <ul className="p-error">
            {issues.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        )}
      </ActionForm>
      <button className="text-button" onClick={onCancel}>
        Hủy chỉnh sửa
      </button>
    </div>
  );
}
