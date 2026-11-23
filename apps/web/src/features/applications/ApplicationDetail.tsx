import { Link, useParams, useSearchParams } from "react-router-dom";
import { ScreeningPanel } from "../screenings/ScreeningPanel";
import { useState } from "react";
import type { Application, Resume } from "@rms-ai/contracts";
import { useLoad, useWorkspace } from "../../app/context";
import { ResumeUpload, ResumeDownload } from "../candidates/ResumeControls";
import { ActionForm, Badge, date, Heading, LoadState } from "../../app/ui";
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
  return (
    <>
      <Link className="p-back" to={jobId ? `/jobs/${jobId}` : "/jobs"}>
        ← Vị trí tuyển dụng
      </Link>
      <LoadState {...load} />
      {load.data && (
        <>
          <Heading title="Hồ sơ ứng tuyển">
            {load.data.job.title} · Tiếp nhận{" "}
            {date(load.data.application.created_at)}
          </Heading>
          <div className="s-app-overview">
            <section className="p-card">
              <div className="p-section-title">
                <h2>Thông tin hồ sơ</h2>
                <Badge value={load.data.application.stage} />
              </div>
              <dl className="p-facts">
                <div>
                  <dt>Mã hồ sơ</dt>
                  <dd>{id}</dd>
                </div>
                <div>
                  <dt>Ứng viên</dt>
                  <dd>
                    {session.user.role !== "reviewer" ? (
                      <Link
                        to={`/candidates/${load.data.application.candidate_id}`}
                      >
                        Mở hồ sơ ứng viên ↗
                      </Link>
                    ) : (
                      load.data.application.candidate_id
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Phiên bản CV đã liên kết</dt>
                  <dd>{load.data.application.resume_id}</dd>
                </div>
              </dl>
              <ResumeDownload
                key={load.data.application.resume_id}
                id={load.data.application.resume_id}
                label="Tải PDF gốc ↗"
              />
              <p className="p-hint">
                PDF được kiểm tra quyền truy cập tại mỗi lần tải.
              </p>
            </section>
          </div>
          <ScreeningPanel
            application={load.data.application}
            job={load.data.job}
            onReviewed={load.reload}
          />
          {session.user.role !== "reviewer" && (
            <section className="p-card">
              <h2>Thay phiên bản CV</h2>
              <p className="muted">
                Thay CV cho lần đánh giá tiếp theo. Dữ liệu của những lần phân
                tích trước vẫn gắn với phiên bản cũ.
              </p>
              <ResumeUpload
                candidateId={load.data.application.candidate_id}
                onUploaded={setResume}
                label="Tải phiên bản CV mới"
              />
              {resume && (
                <ActionForm
                  label="Dùng phiên bản này"
                  onSubmit={async () => {
                    await client.updateApplication(id, {
                      resume_id: resume.id,
                      revision: load.data!.application.revision,
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
            </section>
          )}
        </>
      )}
    </>
  );
}
