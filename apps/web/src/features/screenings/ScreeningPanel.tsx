import { useActorName } from "../../app/actors";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlertCircle,
  CircleCheck,
  LoaderCircle,
  RefreshCw,
  ScanSearch,
} from "lucide-react";
import { useSearchParams } from "react-router-dom";
import type {
  Application,
  Job,
  RunDetail,
  RunSummary,
  JdVersion,
} from "@rms-ai/contracts";
import { useWorkspace, useLoad } from "../../app/context";
import { Badge, date, Empty, LoadState, Pager, shortId } from "../../app/ui";
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
export const runErrors: Record<string, string> = {
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
/** Short Vietnamese summaries used in lists. */
export const runErrorTitles: Record<string, string> = {
  transport_timeout: "Không kết nối được dịch vụ phân tích",
  provider_unavailable: "Nhà cung cấp mô hình tạm thời không phản hồi",
  attempts_exhausted: "Đã hết lượt xử lý tự động",
  lease_expired: "Tiến trình xử lý bị gián đoạn",
  config_changed: "Cấu hình AI đã thay đổi",
  ai_auth_failed: "Dịch vụ phân tích từ chối xác thực",
  invalid_pdf: "Không đọc được nội dung PDF",
  resume_unavailable: "Không tìm thấy tệp CV đã lưu",
};
const elapsed = (from: string) =>
  Math.max(0, Math.round((Date.now() - Date.parse(from)) / 1000));
export function ScreeningPanel({
  application,
  job,
  onReviewed,
  summary,
}: {
  application: Application;
  job: Job;
  onReviewed: () => void;
  summary?: ReactNode;
}) {
  const { client, session } = useWorkspace();
  const actorName = useActorName();
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
  const pendingRun = run && !terminal.includes(run.status);
  return (
    <div className="s-layout">
      <div className="s-main">
        {run ? (
          <section
            className={`p-card s-run-card s-run-${run.status}`}
            aria-labelledby="s-run-title"
          >
            <div className="p-section-title">
              <div>
                <p className="p-eyebrow">LẦN PHÂN TÍCH {run.generation}</p>
                <h2 id="s-run-title">{runLabels[run.status]}</h2>
              </div>
              <Badge value={run.status} />
            </div>
            <dl className="s-run-meta">
              <div>
                <dt>Gửi yêu cầu</dt>
                <dd>{date(run.queued_at)}</dd>
              </div>
              <div>
                <dt>Kết thúc</dt>
                <dd>{run.finished_at ? date(run.finished_at) : "—"}</dd>
              </div>
              <div>
                <dt>Lượt xử lý</dt>
                <dd>{run.attempt_count}</dd>
              </div>
              {jd && (
                <div>
                  <dt>JD đối chiếu</dt>
                  <dd>Phiên bản {jd.version_no}</dd>
                </div>
              )}
            </dl>
            <div aria-live="polite">
              {pendingRun && (
                <div role="status" className="s-waiting">
                  <span className="s-pulse" aria-hidden="true" />
                  <div>
                    <strong>
                      {elapsed(run.queued_at) > 60
                        ? "Hồ sơ vẫn đang được xử lý — đôi khi mất hơn một phút."
                        : "Đang xử lý hồ sơ."}
                    </strong>
                    <p>
                      {elapsed(run.queued_at) > 60
                        ? "Bạn có thể rời trang; kết quả được lưu lại."
                        : "Trạng thái tự cập nhật; tải lại trang vẫn giữ lịch sử."}{" "}
                      Đã chờ {elapsed(run.queued_at)} giây · {run.attempt_count}{" "}
                      lượt xử lý
                      {run.next_retry_at
                        ? ` · Thử lại sau ${date(run.next_retry_at)}`
                        : ""}
                      .
                    </p>
                  </div>
                </div>
              )}
            </div>
            {run.status === "failed" && (
              <>
                <div className="p-error p-error-block">
                  <AlertCircle size={20} aria-hidden="true" />
                  <div>
                    <strong>
                      {(run.error_code && runErrors[run.error_code]) ||
                        "Dịch vụ chưa thể hoàn tất phân tích."}
                    </strong>
                    <small className="s-error-detail">
                      {run.safe_error_detail} · Mã: {run.error_code} ·{" "}
                      {run.attempt_count} lượt xử lý
                    </small>
                  </div>
                </div>
                {run.error_code === "config_changed" && (
                  <p className="p-hint">
                    Lần thử lại luôn dùng đúng cấu hình đã lưu của lần phân tích
                    gốc, nên không thể chạy lại khi cấu hình AI đã đổi. Hãy bắt
                    đầu một lần phân tích mới với cấu hình hiện tại.
                  </p>
                )}
              </>
            )}
            <p className="p-subtle">
              Yêu cầu bởi {actorName(run.requested_by_actor)}
            </p>
            <div className="s-run-actions">
              {run.result && (
                <p className="s-provenance">
                  <span
                    className={`p-badge ${run.result.manifest.mode === "deterministic" ? "p-demo" : ""}`}
                  >
                    {run.result.manifest.mode === "deterministic"
                      ? "CHẾ ĐỘ DEMO XÁC ĐỊNH · không dùng LLM thật"
                      : "Nhà cung cấp trực tiếp"}
                  </span>
                  <span>{run.result.screening.llm.model}</span>
                </p>
              )}
              {run.status === "failed" &&
                session.user.role !== "reviewer" &&
                (run.error_code === "config_changed" ? (
                  <button
                    className="button primary"
                    disabled={busy || !jdId || job.status === "closed"}
                    onClick={() => void start()}
                  >
                    <RefreshCw size={15} aria-hidden="true" />
                    Phân tích mới với cấu hình hiện tại
                  </button>
                ) : (
                  <button
                    className="button primary"
                    disabled={busy || job.status === "closed"}
                    onClick={() => void start(run.id)}
                  >
                    <RefreshCw size={15} aria-hidden="true" />
                    Thử lại bằng lần phân tích mới
                  </button>
                ))}
              <ResumeDownload
                id={run.resume_id}
                label="Mở đúng PDF của lần phân tích ↗"
              />
            </div>
            <details className="s-trace">
              <summary>Dấu vết cấu hình & nguồn</summary>
              <dl>
                <div>
                  <dt>Mã lần phân tích</dt>
                  <dd>{run.id}</dd>
                </div>
                {run.result && (
                  <>
                    <div>
                      <dt>Cấu hình</dt>
                      <dd>{run.result.fingerprint}</dd>
                    </div>
                    <div>
                      <dt>Văn bản chuẩn hóa</dt>
                      <dd>{run.result.source.normalized_text_sha256}</dd>
                    </div>
                    <div>
                      <dt>Đơn vị offset</dt>
                      <dd>
                        Unicode code points ·{" "}
                        {run.result.source.extractor_version}
                      </dd>
                    </div>
                  </>
                )}
              </dl>
            </details>
          </section>
        ) : (
          !error && (
            <section className="p-card">
              <Empty title="Chưa có lần phân tích" icon={ScanSearch}>
                {session.user.role === "reviewer"
                  ? "Kết quả sẽ xuất hiện khi chuyên viên tuyển dụng bắt đầu sàng lọc hồ sơ này."
                  : "Chọn JD đã phê duyệt rồi bắt đầu sàng lọc. Kết quả và bằng chứng sẽ hiện tại đây."}
              </Empty>
            </section>
          )
        )}
        {run?.result && jd && (
          <Results
            data={run.result}
            jd={{
              id: jd.id,
              title: jd.title,
              summary: jd.summary,
              criteria: jd.criteria,
            }}
            fileName={`CV ${shortId(run.resume_id)}`}
            source={run.result.source}
          />
        )}
      </div>
      <aside className="s-aside" aria-label="Hồ sơ, sàng lọc và quyết định">
        {summary}
        <section className="p-card s-start-card">
          <div className="p-section-title">
            <div>
              <p className="p-eyebrow">ĐÁNH GIÁ CÓ CĂN CỨ</p>
              <h2>Hiểu hồ sơ, trước khi lựa chọn.</h2>
            </div>
            <span className="p-badge">AI hỗ trợ</span>
          </div>
          <p className="p-subtle">
            Mỗi lần phân tích lưu riêng CV, JD và cấu hình. Quyết định luôn
            thuộc về con người.
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
                <select
                  value={jdId}
                  onChange={(e) => setChosen(e.target.value)}
                  disabled={!approved.length}
                >
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
                {busy ? (
                  <>
                    <LoaderCircle
                      size={16}
                      className="spin"
                      aria-hidden="true"
                    />
                    Đang gửi…
                  </>
                ) : (
                  "Bắt đầu sàng lọc"
                )}
              </button>
            </div>
          )}
          {versions.data && !approved.length && (
            <p className="p-hint">
              Cần một JD đã được phê duyệt trước khi sàng lọc. Mở vị trí tuyển
              dụng để gửi hoặc phê duyệt JD.
            </p>
          )}
          {job.status === "closed" && (
            <p className="p-hint">
              Vị trí đã đóng. Kết quả và quyết định cũ vẫn có thể xem lại.
            </p>
          )}
          <LoadState {...versions} />
          {notice && (
            <p className="p-notice" role="status">
              <CircleCheck size={16} aria-hidden="true" />
              {notice}
            </p>
          )}
          {error && (
            <div role="alert" className="p-error p-error-block">
              <AlertCircle size={20} aria-hidden="true" />
              <div>{error}</div>
              <button
                className="button secondary"
                onClick={() => setTick((v) => v + 1)}
              >
                Kết nối lại
              </button>
            </div>
          )}
        </section>
        {run?.result && jd && (
          <ReviewPanel
            application={application}
            run={run}
            latestRunId={latestId}
            onReviewed={onReviewed}
          />
        )}
        <section className="p-card s-history-card">
          <div className="p-section-title">
            <h2>Lịch sử phân tích</h2>
            <span className="p-count">{total} lần</span>
          </div>
          {!runs.length && !error ? (
            <p className="p-subtle">Chưa có lần phân tích nào được lưu.</p>
          ) : (
            <div className="s-history">
              {runs.map((r) => (
                <button
                  className={`s-run ${run?.id === r.id ? "s-selected" : ""}`}
                  key={r.id}
                  onClick={() => select(r.id)}
                  aria-pressed={run?.id === r.id}
                >
                  <span className="s-run-head">
                    <strong>Lần {r.generation}</strong>
                    <Badge value={r.status} />
                  </span>
                  <small>
                    {date(r.queued_at)} · {actorName(r.requested_by_actor)} ·{" "}
                    {r.attempt_count} lượt xử lý
                    {r.id === latestId ? " · Mới nhất" : ""}
                  </small>
                </button>
              ))}
            </div>
          )}
          {total > 10 && (
            <Pager page={page} total={total} pageSize={10} onChange={setPage} />
          )}
        </section>
      </aside>
    </div>
  );
}
