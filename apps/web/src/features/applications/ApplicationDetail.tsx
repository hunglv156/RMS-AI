import { Link, useParams, useSearchParams } from "react-router-dom";
import { ScreeningPanel } from "../screenings/ScreeningPanel";
import { useState } from "react";
import type { Application, Resume } from "@rms-ai/contracts";
import { useLoad, useWorkspace } from "../../app/context";
import { ResumeUpload, ResumeDownload } from "../candidates/ResumeControls";
import { ActionForm, Badge, date, Heading, LoadState } from "../../app/ui";
import { ArrowLeft } from "lucide-react";
export function ApplicationDetail() {
  const { id = "" } = useParams();
  const [q] = useSearchParams(),
    jobId = q.get("job") ?? "";
  const { client, session } = useWorkspace();
  const [resume, setResume] = useState<Resume>();
  const load = useLoad(
    async (s) => {
      if (!jobId)
        throw new Error("Mở hồ sơ từ danh sách ứng tuyển của một vị trí.");
      const job = await client.job(jobId, s);
      let application: Application | undefined;
      let page = 1;
      while (!application) {
        const rows = await client.applications(
          jobId,
          { page, pageSize: 100 },
          s,
        );
        application = rows.items.find((a) => a.id === id);
        if (page * 100 >= rows.total) break;
        page++;
      }
      if (!application)
        throw new Error("Không tìm thấy hồ sơ hoặc bạn chưa được cấp quyền.");
      return { application, job };
    },
    [client, id, jobId],
  );
  const app = load.data?.application;
  const name = app?.candidate_display_name;
  return (
    <>
      <Link className="p-back" to={jobId ? `/jobs/${jobId}` : "/jobs"}>
        <ArrowLeft size={15} aria-hidden="true" />
        {load.data?.job.title ?? "Vị trí tuyển dụng"}
      </Link>
      <LoadState {...load} />
      {load.data && app && (
        <>
          <Heading
            eyebrow="HỒ SƠ ỨNG TUYỂN"
            title={name ?? "Hồ sơ ứng tuyển"}
            meta={
              <>
                <Badge value={app.stage} />
                <span>
                  {load.data.job.title} · Tiếp nhận {date(app.created_at)}
                </span>
              </>
            }
          />
          <ScreeningPanel
            application={app}
            job={load.data.job}
            onReviewed={load.reload}
            summary={
              <section className="p-card s-summary">
                <h2>Thông tin hồ sơ</h2>
                <dl className="p-facts">
                  <div>
                    <dt>Ứng viên</dt>
                    <dd>
                      {session.user.role !== "reviewer" ? (
                        <Link to={`/candidates/${app.candidate_id}`}>
                          {name ?? "Mở hồ sơ ứng viên"} ↗
                        </Link>
                      ) : (
                        <>{name ?? "Ứng viên"}</>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Mã hồ sơ</dt>
                    <dd className="p-mono">{id}</dd>
                  </div>
                  <div>
                    <dt>Phiên bản CV đã liên kết</dt>
                    <dd className="p-mono">{app.resume_id}</dd>
                  </div>
                </dl>
                <ResumeDownload
                  key={app.resume_id}
                  id={app.resume_id}
                  label="Tải PDF gốc ↗"
                />
                <p className="p-hint">
                  PDF được kiểm tra quyền truy cập tại mỗi lần tải.
                </p>
                {session.user.role !== "reviewer" && (
                  <details className="p-disclosure">
                    <summary>Thay phiên bản CV</summary>
                    <p className="p-subtle">
                      Thay CV cho lần đánh giá tiếp theo. Dữ liệu của những lần
                      phân tích trước vẫn gắn với phiên bản cũ.
                    </p>
                    <ResumeUpload
                      candidateId={app.candidate_id}
                      onUploaded={setResume}
                      label="Tải phiên bản CV mới"
                    />
                    {resume && (
                      <ActionForm
                        label="Dùng phiên bản này"
                        onSubmit={async () => {
                          await client.updateApplication(id, {
                            resume_id: resume.id,
                            revision: app.revision,
                          });
                          setResume(undefined);
                          load.reload();
                        }}
                      >
                        <p>
                          v{resume.version_no} · {resume.original_filename}
                        </p>
                      </ActionForm>
                    )}
                  </details>
                )}
              </section>
            }
          />
        </>
      )}
    </>
  );
}
