import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type {
  Application,
  Job,
  RunDetail,
  RunSummary,
  JdVersion,
} from "@rms-ai/contracts";
import { useWorkspace, useLoad } from "../../app/context";
import { Badge, date, Empty, LoadState, Pager } from "../../app/ui";
import { Results } from "../../components/Results";
import { ResumeDownload } from "../candidates/ResumeControls";
import { ReviewPanel } from "../reviews/ReviewPanel";
import { message } from "../../lib/api/platform";
export const runLabels: Record<string, string> = {
  queued: "Đang chờ",
  running: "Đang phân tích",
  retry_wait: "Chờ thử lại",
  completed: "Hoàn tất",
  failed: "Chưa hoàn tất",
};
const terminal = ["completed", "failed"];
const runErrors: Record<string, string> = {
  transport_timeout:
    "Không kết nối được dịch vụ phân tích trong thời hạn. Kiểm tra dịch vụ AI rồi thử lại.",
  provider_unavailable:
    "Nhà cung cấp mô hình tạm thời không phản hồi. Có thể thử lại sau.",
  attempts_exhausted: "Đã hết số lượt xử lý tự động cho lần phân tích này.",
  lease_expired: "Tiến trình xử lý bị gián đoạn trước khi lưu kết quả.",
  config_changed: "Cấu hình AI đã thay đổi so với lần phân tích này.",
  ai_auth_failed: "Dịch vụ phân tích từ chối xác thực nội bộ.",
  invalid_pdf: "Không đọc được nội dung PDF.",
  resume_unavailable: "Không tìm thấy tệp CV đã lưu cho lần phân tích.",
};
const elapsed = (from: string) =>
  Math.max(0, Math.round((Date.now() - Date.parse(from)) / 1000));
export function ScreeningPanel({
  application,
  job,
  onReviewed,
}: {
  application: Application;
  job: Job;
  onReviewed: () => void;
}) {
  const { client, session } = useWorkspace();
  const [params, setParams] = useSearchParams();
  const [runs, setRuns] = useState<RunSummary[]>([]),
    [total, setTotal] = useState(0),
    [page, setPage] = useState(1),
    [latestId, setLatestId] = useState<string>();
  const [run, setRun] = useState<RunDetail>(),
    [jd, setJd] = useState<JdVersion>(),
    [error, setError] = useState(""),
    [tick, setTick] = useState(0);
  const [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const selected = params.get("run");
  const keys = useRef(new Map<string, string>());
  const versions = useLoad(
    (s) => client.jdVersions(job.id, { pageSize: 100 }, s),
    [client, job.id],
  );
  const config = useLoad((s) => client.screeningConfig(s), [client]);
  const [chosen, setChosen] = useState("");
  const approved =
    versions.data?.items.filter((v) => v.state === "approved") ?? [];
  const jdId = chosen || job.active_jd_version_id || approved[0]?.id || "";
  useEffect(() => {
    const c = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const history = await client.screeningHistory(
          application.id,
          { page, pageSize: 10 },
          c.signal,
        );
        const latest =
          page === 1
            ? history
            : await client.screeningHistory(
                application.id,
                { page: 1, pageSize: 1 },
                c.signal,
              );
        const id = selected || latest.items[0]?.id;
        const detail = id ? await client.screening(id, c.signal) : undefined;
        if (
          detail &&
          (detail.application_id !== application.id || detail.job_id !== job.id)
        )
          throw new Error(
            "Lần phân tích không thuộc hồ sơ này. Mở lại từ lịch sử hồ sơ.",
          );
        const version = detail
          ? await client.jdVersion(detail.jd_version_id, c.signal)
          : undefined;
        if (c.signal.aborted) return;
        setLatestId(latest.items[0]?.id);
        setRuns(history.items);
        setTotal(history.total);
        setRun(detail);
        setJd(version);
        setError("");
        // Persisted runs are immutable once terminal; poll only while work is pending.
        const pending = [...history.items, ...(detail ? [detail] : [])].filter(
          (r) => !terminal.includes(r.status),
        );
        const oldest = Math.min(...pending.map((r) => Date.parse(r.queued_at)));
        if (pending.length && !c.signal.aborted)
          timer = setTimeout(poll, Date.now() - oldest > 60_000 ? 5000 : 2000);
      } catch (e) {
        if (c.signal.aborted) return;
        setError(message(e));
        timer = setTimeout(poll, 5000);
      }
    }
    setRun(undefined);
    setJd(undefined);
    void poll();
    return () => {
      c.abort();
      clearTimeout(timer);
    };
  }, [client, application.id, job.id, selected, page, tick]);
  function select(id: string) {
    setParams(
      (p) => {
        p.set("run", id);
        return p;
      },
      { replace: true },
    );
  }
  async function start(retry?: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    const identity = retry || `${application.id}:${jdId}`;
    const key = keys.current.get(identity) || crypto.randomUUID();
    keys.current.set(identity, key);
    try {
      const result = retry
        ? await client.retryScreening(retry, key)
        : await client.startScreening(
            job.id,
            { application_ids: [application.id], jd_version_id: jdId },
            key,
          );
      select(result.runs[0].id);
      setPage(1);
      setTick((v) => v + 1);
      setNotice(
        result.dispatch_state === "degraded"
          ? "Đã lưu yêu cầu. Hàng đợi đang kết nối lại; bạn có thể rời trang."
          : "Đã lưu yêu cầu. Bạn có thể rời trang và quay lại xem kết quả.",
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="s-workspace">
      <div className="p-card">
        <div className="p-section-title">
          <div>
            <p className="p-eyebrow">ĐÁNH GIÁ CÓ CĂN CỨ</p>
            <h2>Hiểu hồ sơ, trước khi lựa chọn.</h2>
          </div>
          <span className="p-badge">AI hỗ trợ</span>
        </div>
        <p className="muted">
          Mỗi lần phân tích lưu riêng CV, JD và cấu hình. Quyết định luôn thuộc
          về con người.
        </p>
        {config.data && (
          <p className="p-hint">
            Lần phân tích mới:{" "}
            {config.data.effective_manifest.mode === "deterministic"
              ? "DEMO XÁC ĐỊNH · không dùng LLM thật"
              : "Nhà cung cấp trực tiếp"}{" "}
            · {config.data.effective_manifest.models.primary}
          </p>
        )}
        {config.error && (
          <p className="p-hint">
            Chưa đọc được cấu hình AI. Lịch sử đã lưu vẫn có thể xem.
          </p>
        )}
        {session.user.role !== "reviewer" && (
          <div className="s-start">
            <label>
              JD đã phê duyệt
              <select value={jdId} onChange={(e) => setChosen(e.target.value)}>
                <option value="" disabled>
                  Chưa có JD được phê duyệt
                </option>
                {approved.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.version_no} · {v.title}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button primary"
              disabled={busy || !jdId || job.status === "closed"}
              onClick={() => void start()}
            >
              {busy ? "Đang gửi…" : "Bắt đầu sàng lọc"}
            </button>
          </div>
        )}
        {job.status === "closed" && (
          <p className="p-hint">
            Vị trí đã đóng. Kết quả và quyết định cũ vẫn có thể xem lại.
          </p>
        )}
        <LoadState {...versions} />
        {notice && (
          <p className="p-notice" role="status">
            {notice}
          </p>
        )}
        {error && (
          <div role="alert" className="p-error">
            {error}
            <button
              className="button secondary"
              onClick={() => setTick((v) => v + 1)}
            >
              Kết nối lại
            </button>
          </div>
        )}
      </div>
      <section className="p-card">
        <div className="p-section-title">
          <h2>Lịch sử phân tích</h2>
          <span className="p-badge">{total} lần</span>
        </div>
        {!runs.length && !error ? (
          <Empty title="Chưa có lần phân tích">
            Chọn JD được phê duyệt để bắt đầu.
          </Empty>
        ) : (
          <div className="s-history">
            {runs.map((r) => (
              <button
                className={`s-run ${run?.id === r.id ? "s-selected" : ""}`}
                key={r.id}
                onClick={() => select(r.id)}
                aria-pressed={run?.id === r.id}
              >
                <strong>{runLabels[r.status]}</strong>
                <span>{date(r.queued_at)}</span>
                <small>
                  Lần {r.generation} · {r.attempt_count} lượt xử lý
                </small>
              </button>
            ))}
          </div>
        )}
        {total > 10 && (
          <Pager page={page} total={total} pageSize={10} onChange={setPage} />
        )}
      </section>
      {run && (
        <>
          <section className="p-card" aria-live="polite">
            <div className="p-section-title">
              <h2>{runLabels[run.status]}</h2>
              <Badge value={run.status} />
            </div>
            <p className="p-hint">Mã lần phân tích: {run.id}</p>
            {!["completed", "failed"].includes(run.status) && (
              <p role="status" className="s-waiting">
                <span className="s-pulse" aria-hidden="true" />
                {elapsed(run.queued_at) > 60
                  ? "Hồ sơ vẫn đang được xử lý — đôi khi mất hơn một phút. Bạn có thể rời trang; kết quả được lưu lại."
                  : "Đang xử lý hồ sơ. Trạng thái tự cập nhật; tải lại trang vẫn giữ lịch sử."}{" "}
                Đã chờ {elapsed(run.queued_at)} giây · {run.attempt_count} lượt
                xử lý
                {run.next_retry_at
                  ? ` · Thử lại sau ${date(run.next_retry_at)}`
                  : ""}
                .
              </p>
            )}
            {run.status === "failed" && (
              <>
                <div className="p-error">
                  <strong>
                    {(run.error_code && runErrors[run.error_code]) ||
                      "Dịch vụ chưa thể hoàn tất phân tích."}
                  </strong>
                  <small className="s-error-detail">
                    {run.safe_error_detail} · Mã: {run.error_code} ·{" "}
                    {run.attempt_count} lượt xử lý
                  </small>
                </div>
                {run.error_code === "config_changed" && (
                  <p className="p-hint">
                    Lần thử lại luôn dùng đúng cấu hình đã lưu của lần phân tích
                    gốc, nên không thể chạy lại khi cấu hình AI đã đổi. Hãy bắt
                    đầu một lần phân tích mới với cấu hình hiện tại.
                  </p>
                )}
                {session.user.role !== "reviewer" &&
                  (run.error_code === "config_changed" ? (
                    <button
                      className="button secondary"
                      disabled={busy || !jdId || job.status === "closed"}
                      onClick={() => void start()}
                    >
                      Phân tích mới với cấu hình hiện tại
                    </button>
                  ) : (
                    <button
                      className="button secondary"
                      disabled={busy || job.status === "closed"}
                      onClick={() => void start(run.id)}
                    >
                      Thử lại bằng lần phân tích mới
                    </button>
                  ))}
              </>
            )}
            <ResumeDownload
              id={run.resume_id}
              label="Mở đúng PDF của lần phân tích ↗"
            />
          </section>
          {run.result && jd && (
            <>
              <div className="s-provenance p-card">
                <strong>
                  {run.result.manifest.mode === "deterministic"
                    ? "CHẾ ĐỘ DEMO XÁC ĐỊNH · không dùng LLM thật"
                    : "Nhà cung cấp trực tiếp"}
                </strong>
                <p>
                  {run.result.screening.llm.model} · JD v{jd.version_no} ·{" "}
                  {date(run.finished_at)}
                </p>
                <details>
                  <summary>Dấu vết cấu hình & nguồn</summary>
                  <p>Cấu hình: {run.result.fingerprint}</p>
                  <p>
                    Văn bản chuẩn hóa:{" "}
                    {run.result.source.normalized_text_sha256}
                  </p>
                  <p>
                    Đơn vị offset: Unicode code points ·{" "}
                    {run.result.source.extractor_version}
                  </p>
                </details>
              </div>
              <Results
                data={run.result}
                jd={{
                  id: jd.id,
                  title: jd.title,
                  summary: jd.summary,
                  criteria: jd.criteria,
                }}
                fileName={`CV · ${run.resume_id}`}
                source={run.result.source}
              />
              <ReviewPanel
                application={application}
                run={run}
                latestRunId={latestId}
                onReviewed={onReviewed}
              />
            </>
          )}
        </>
      )}
    </section>
  );
}
