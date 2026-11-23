import { useActorName } from "../../app/actors";
import { useEffect, useState } from "react";
import { Check, CircleCheck, Clock3, FilePlus2, Star } from "lucide-react";
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
  const [status, setStatus] = useState(""),
    [focus, setFocus] = useState<string>();
  // Actions remove their own button; return focus to the version and announce the outcome.
  useEffect(() => {
    if (!focus || !load.data) return;
    (
      document.getElementById(focus) ?? document.getElementById("jd-title")
    )?.focus();
    setFocus(undefined);
  }, [focus, load.data]);
  const changed = (done = "", target = "jd-title") => {
    setStatus(done);
    setFocus(target);
    setEditing(undefined);
    load.reload();
    onChange();
  };
  const author = session.user.role !== "reviewer";
  const actorName = useActorName();
  return (
    <section className="p-card">
      <div className="p-section-title">
        <div>
          <p className="p-eyebrow">NỀN TẢNG CỦA MỖI ĐÁNH GIÁ</p>
          <h2 id="jd-title" tabIndex={-1}>
            Mô tả công việc
          </h2>
        </div>
        {author && (
          <button
            className="button secondary"
            onClick={() => setEditing("new")}
          >
            <FilePlus2 size={16} aria-hidden="true" />
            Bản nháp mới
          </button>
        )}
      </div>
      <p className="p-subtle">
        Mỗi phiên bản lưu một bước tiến. JD đã phê duyệt được giữ nguyên để đối
        chiếu.
      </p>
      {status && (
        <p className="p-notice p-panel-notice" role="status">
          <CircleCheck size={16} aria-hidden="true" />
          {status}
        </p>
      )}
      <LoadState {...load} />
      {editing && (
        <JdForm
          key={editing === "new" ? "new" : editing.id}
          value={editing === "new" ? undefined : editing}
          job={job}
          onSaved={() => changed("Đã lưu bản nháp.")}
          onCancel={() => setEditing(undefined)}
        />
      )}
      {load.data && (
        <>
          {!load.data.items.length && !editing && (
            <Empty title="Bắt đầu bằng một JD rõ ràng" icon={FilePlus2}>
              Tạo bản nháp với 1–8 tiêu chí, sau đó gửi người có quyền phê
              duyệt.
            </Empty>
          )}
          <div className="p-timeline">
            {load.data.items.map((v) => (
              <article
                key={v.id}
                className={`p-version p-version-${v.state}`}
                aria-labelledby={`jd-${v.id}`}
              >
                <div className="p-version-head">
                  <h3 id={`jd-${v.id}`} tabIndex={-1}>
                    Phiên bản {v.version_no}
                  </h3>
                  <Badge value={v.state} />
                  {job.active_jd_version_id === v.id && (
                    <span className="p-badge p-active">
                      <Star size={13} aria-hidden="true" />
                      Đang sử dụng
                    </span>
                  )}
                </div>
                <h4>{v.title}</h4>
                <p className="p-version-summary">
                  {v.summary || "Chưa có tóm tắt."}
                </p>
                <ol className="p-steps" aria-label="Tiến trình phê duyệt">
                  <li className="p-step-done">
                    <span aria-hidden="true">
                      <Check size={12} />
                    </span>
                    <div>
                      <strong>Tạo</strong>
                      <small>
                        {date(v.created_at)} · {actorName(v.created_by_actor)}
                      </small>
                    </div>
                  </li>
                  <li className={v.submitted_at ? "p-step-done" : ""}>
                    <span aria-hidden="true">
                      {v.submitted_at ? <Check size={12} /> : "2"}
                    </span>
                    <div>
                      <strong>Gửi duyệt</strong>
                      <small>
                        {v.submitted_at
                          ? `${date(v.submitted_at)} · ${actorName(v.submitted_by_actor)}`
                          : "Chưa gửi"}
                      </small>
                    </div>
                  </li>
                  <li
                    className={
                      v.approved_at
                        ? "p-step-done"
                        : v.state === "pending_approval"
                          ? "p-step-current"
                          : ""
                    }
                  >
                    <span aria-hidden="true">
                      {v.approved_at ? <Check size={12} /> : "3"}
                    </span>
                    <div>
                      <strong>Phê duyệt</strong>
                      <small>
                        {v.approved_at
                          ? `${date(v.approved_at)} · ${actorName(v.approved_by_actor)}`
                          : v.state === "pending_approval"
                            ? "Đang chờ người phê duyệt"
                            : "Chưa đến bước này"}
                      </small>
                    </div>
                  </li>
                  {v.returned_by_actor && (
                    <li className="p-step-done">
                      <span aria-hidden="true">
                        <Check size={12} />
                      </span>
                      <div>
                        <strong>Trả về bản nháp</strong>
                        <small>{actorName(v.returned_by_actor)}</small>
                      </div>
                    </li>
                  )}
                </ol>
                <details className="p-criteria">
                  <summary>
                    {v.criteria.length} tiêu chí đánh giá · Tổng trọng số{" "}
                    {v.criteria.reduce((t, c) => t + c.weight, 0)}
                  </summary>
                  <ol>
                    {v.criteria.map((c) => (
                      <li className="p-criterion" key={c.code}>
                        <div>
                          <strong>{c.label}</strong>
                          <span
                            className={`p-tag ${c.priority === "must_have" ? "p-tag-must" : ""}`}
                          >
                            {c.priority === "must_have"
                              ? "Bắt buộc"
                              : "Ưu tiên"}
                          </span>
                          <span className="p-weight">{c.weight} điểm</span>
                        </div>
                        <p>{c.description}</p>
                        {c.keywords.length > 0 && (
                          <small>Từ khóa: {c.keywords.join(", ")}</small>
                        )}
                      </li>
                    ))}
                  </ol>
                </details>
                {session.user.role !== "recruiter" &&
                  v.state === "pending_approval" && (
                    <p className="p-callout">
                      <Clock3 size={16} aria-hidden="true" />
                      {job.status === "closed"
                        ? "Vị trí đã đóng nên chưa thể phê duyệt JD. Mở lại vị trí để tiếp tục."
                        : "JD này đang chờ bạn xem xét. Phê duyệt sẽ khóa nội dung để dùng cho sàng lọc."}
                    </p>
                  )}
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
                          changed(
                            `Đã gửi phiên bản ${v.version_no} để phê duyệt.`,
                            `jd-${v.id}`,
                          );
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
                            changed(
                              `Đã phê duyệt phiên bản ${v.version_no}. JD đã sẵn sàng cho sàng lọc.`,
                              `jd-${v.id}`,
                            );
                          }}
                        >
                          <span className="sr-only">
                            Phê duyệt phiên bản {v.version_no}
                          </span>
                        </ActionForm>
                        <details className="p-inline-details">
                          <summary>Trả về bản nháp</summary>
                          <ActionForm
                            label="Trả về để chỉnh sửa"
                            onSubmit={async (f) => {
                              await client.returnJdToDraft(v.id, {
                                revision: v.revision,
                                reason: String(f.get("reason")),
                              });
                              changed(
                                `Đã trả phiên bản ${v.version_no} về bản nháp.`,
                                `jd-${v.id}`,
                              );
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
                      variant="secondary"
                      label="Nhân bản thành bản nháp"
                      onSubmit={async () => {
                        await client.cloneJd(v.id, { revision: v.revision });
                        changed(
                          `Đã nhân bản phiên bản ${v.version_no} thành bản nháp mới.`,
                        );
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
