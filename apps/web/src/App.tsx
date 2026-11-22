import { useEffect, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import {
  ArrowDown,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  CircleHelp,
  Clock3,
  FileCheck2,
  FileText,
  Info,
  Leaf,
  LoaderCircle,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Sun,
  UploadCloud,
  X,
} from "lucide-react";
import { getClient, ApiError, friendlyError } from "./lib/api/client";
import type {
  ActiveConfig,
  JobDescription,
  SampleJD,
  ScreeningEnvelope,
} from "./lib/api/types";
import { validateJD } from "./lib/validation";
import { JDEditor, blankJD } from "./components/JDEditor";
import { Results } from "./components/Results";
const isMock = import.meta.env.VITE_USE_MOCK === "1";
export default function App() {
  const [jd, setJD] = useState<JobDescription>(blankJD);
  const [samples, setSamples] = useState<SampleJD[]>([]);
  const [config, setConfig] = useState<ActiveConfig>();
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState("");
  const [retry, setRetry] = useState(0);
  const [file, setFile] = useState<File>();
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<ScreeningEnvelope>();
  const [resultJD, setResultJD] = useState<JobDescription>(jd);
  const [resultFile, setResultFile] = useState("");
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [jsonValid, setJsonValid] = useState(true);
  const [editorKey, setEditorKey] = useState(0);
  const [dark, setDark] = useState(() => {
    try {
      return localStorage.getItem("la-theme")
        ? localStorage.getItem("la-theme") === "dark"
        : window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  });
  const controller = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const screenButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("la-theme", dark ? "dark" : "light");
    } catch {
      /* Storage may be disabled. */
    }
  }, [dark]);
  useEffect(() => {
    const abort = new AbortController();
    setBooting(true);
    setBootError("");
    getClient()
      .then(async (client) => {
        const [c, s] = await Promise.allSettled([
          client.config(abort.signal),
          client.samples(abort.signal),
        ]);
        if (abort.signal.aborted) return;
        if (c.status === "fulfilled") setConfig(c.value);
        if (s.status === "fulfilled") setSamples(s.value);
        if (c.status === "rejected" || s.status === "rejected")
          setBootError(
            "Chưa tải được cấu hình hoặc JD mẫu. Bạn vẫn có thể tự nhập JD và thử sàng lọc.",
          );
      })
      .catch(() => {
        if (!abort.signal.aborted)
          setBootError(
            "Không kết nối được dịch vụ. Hãy kiểm tra kết nối và thử lại.",
          );
      })
      .finally(() => {
        if (!abort.signal.aborted) setBooting(false);
      });
    return () => abort.abort();
  }, [retry]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!busy) return;
    const start = Date.now();
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - start) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [busy]);
  const validation = validateJD(jd);
  const ready = !!file && validation.length === 0 && jsonValid;
  function chooseFile(next?: File) {
    if (!next) return;
    setError("");
    if (
      !next.name.toLowerCase().endsWith(".pdf") ||
      (next.type && next.type !== "application/pdf")
    ) {
      setFile(undefined);
      setError(new ApiError("unsupported_type").message);
      return;
    }
    setFile(next);
    setNotice("");
  }
  async function screen() {
    if (!ready || !file) return;
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setElapsed(0);
    setError("");
    setNotice("");
    setResult(undefined);
    const submitted = structuredClone(jd);
    const name = file.name;
    try {
      const client = await getClient();
      const data = await client.screen(file, submitted, abort.signal);
      if (abort.signal.aborted) return;
      setResult(data);
      setConfig(data.config);
      setResultJD(
        isMock
          ? (samples.find((s) => s.id === data.screening.jd_id)?.jd ??
              submitted)
          : submitted,
      );
      setResultFile(isMock ? "Hồ sơ mẫu cố định" : name);
      requestAnimationFrame(() =>
        {
          resultHeadingRef.current?.focus();
          resultRef.current?.scrollIntoView({
            behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
              .matches
              ? "instant"
              : "smooth",
            block: "start",
          });
        },
      );
    } catch (e) {
      if (!abort.signal.aborted) setError(friendlyError(e));
    } finally {
      if (controller.current === abort) setBusy(false);
    }
  }
  function cancel() {
    controller.current?.abort();
    setBusy(false);
    setNotice("Đã dừng chờ kết quả. Bạn có thể chỉnh sửa và thử lại.");
    requestAnimationFrame(() => screenButtonRef.current?.focus());
  }
  function sample(id: string) {
    const found = samples.find((s) => s.id === id);
    setJD(found ? structuredClone(found.jd) : structuredClone(blankJD));
    setJsonValid(true);
    setEditorKey((k) => k + 1);
  }
  const step = elapsed < 4 ? 0 : elapsed < 14 ? 1 : elapsed < 30 ? 2 : 3;
  return (
    <>
      <a className="skip-link" href="#main">
        Đến nội dung chính
      </a>
      <header className="header">
        <div className="header-inner">
          <a className="logo" href="#" aria-label="Lá · Trang chủ">
            <span>
              <Leaf size={23} />
            </span>
            lá<span className="logo-dot">.</span>
            <small>TUYỂN DỤNG THẤU HIỂU</small>
          </a>
          <div className="header-actions">
            <span className="header-label">
              <span className="status-dot" />
              {isMock ? "Bản trải nghiệm" : "Không gian tuyển dụng"}
            </span>
            <button
              className="icon-button"
              aria-label={dark ? "Bật giao diện sáng" : "Bật giao diện tối"}
              onClick={() => setDark((d) => !d)}
            >
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <Popover.Root>
              <Popover.Trigger asChild>
                <button className="icon-button" aria-label="Cấu hình phân tích">
                  <Info size={19} />
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  className="config-popover"
                  sideOffset={10}
                  align="end"
                >
                  <div className="section-top">
                    <h3>Cấu hình phân tích</h3>
                    <Popover.Close
                      className="icon-button"
                      aria-label="Đóng cấu hình"
                    >
                      <X size={16} />
                    </Popover.Close>
                  </div>
                  {config ? (
                    <dl>
                      <dt>Mô hình ban đầu</dt>
                      <dd>{config.model}</dd>
                      <dt>Phiên bản lời nhắc</dt>
                      <dd>{config.prompt_version}</dd>
                      <dt>Ngữ cảnh & truy xuất</dt>
                      <dd>
                        {config.context_mode} · {config.retrieval_mode} · k=
                        {config.retrieval_k}
                      </dd>
                      <dt>Yêu cầu dự phòng</dt>
                      <dd>
                        {config.hedge_after_s === null
                          ? "Tắt"
                          : `Sau ${config.hedge_after_s} giây`}
                      </dd>
                      <dt>Sàng lọc lại</dt>
                      <dd>
                        {config.escalation.enabled
                          ? config.escalation.model
                          : "Tắt"}
                      </dd>
                      <dt>Điều kiện sàng lọc lại</dt>
                      <dd>
                        {config.escalation.triggers.join(", ") || "Không có"}
                      </dd>
                      <dt>Ngưỡng bao phủ</dt>
                      <dd>{config.min_coverage * 100}%</dd>
                    </dl>
                  ) : (
                    <p className="muted">
                      {booting
                        ? "Đang tải cấu hình…"
                        : "Chưa tải được cấu hình."}
                    </p>
                  )}
                  <Popover.Arrow className="popover-arrow" />
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>
        </div>
      </header>
      <main id="main">
        <section className="hero">
          <div>
            <div className="hero-tag">
              <Sparkles size={14} />
              Trợ lý sàng lọc CV của bạn
            </div>
            <h1>
              Nhìn rõ năng lực.
              <br />
              <span>Chọn đúng người.</span>
            </h1>
            <p>
              Đối chiếu CV với yêu cầu công việc, cùng bằng chứng rõ ràng
              <br className="desktop-break" /> để bạn tự tin đưa ra quyết định.
            </p>
          </div>
          <div className="hero-illustration" aria-hidden="true">
            <div className="orbit orbit-one" />
            <div className="orbit orbit-two" />
            <div className="floating-chip">
              <ShieldCheck size={17} />
              Có bằng chứng xác minh
            </div>
            <div className="mini-document">
              <div className="mini-avatar">
                <FileCheck2 size={27} />
              </div>
              <div className="mini-line long" />
              <div className="mini-line" />
              <div className="mini-rule" />
              <div className="mini-check">
                <Check />
                <i />
              </div>
              <div className="mini-check">
                <Check />
                <i />
              </div>
              <div className="mini-check">
                <Check />
                <i />
              </div>
            </div>
            <div className="floating-spark">
              <Sparkles size={22} />
            </div>
          </div>
        </section>
        <nav className="workflow" aria-label="Các bước sàng lọc">
          <span className="active">
            <b>1</b>Thiết lập yêu cầu
          </span>
          <i />
          <span className={file ? "active" : ""}>
            <b>2</b>Tải CV lên
          </span>
          <i />
          <span className={result ? "active" : ""}>
            <b>3</b>Khám phá kết quả
          </span>
        </nav>
        {bootError && (
          <div className="service-warning" role="alert">
            {bootError}
            <button
              className="text-button"
              onClick={() => setRetry((r) => r + 1)}
            >
              <RotateCcw size={14} />
              Tải lại
            </button>
          </div>
        )}
        <div className="workspace no-print">
          <section className="panel jd-panel">
            <div className="panel-heading">
              <div className="step-icon">
                <BriefcaseBusiness size={21} />
              </div>
              <div>
                <span className="eyebrow">BƯỚC 01</span>
                <h2>Công việc cần tuyển</h2>
              </div>
            </div>
            <p className="muted panel-intro">
              Chọn JD mẫu hoặc thiết lập yêu cầu của riêng bạn.
            </p>
            <fieldset disabled={busy}>
              <label htmlFor="sample-jd">Vị trí tuyển dụng</label>
              <select
                id="sample-jd"
                value={samples.some((s) => s.id === jd.id) ? jd.id : ""}
                onChange={(e) => sample(e.target.value)}
              >
                <option value="">
                  {booting ? "Đang tải vị trí mẫu…" : "Tự nhập mô tả công việc"}
                </option>
                {samples.map((s) => (
                  <option value={s.id} key={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
              <JDEditor
                key={editorKey}
                jd={jd}
                onChange={setJD}
                onValidity={setJsonValid}
              />
            </fieldset>
          </section>
          <div className="right-column">
            <section className="panel upload-panel">
              <div className="panel-heading">
                <div className="step-icon peach">
                  <FileText size={21} />
                </div>
                <div>
                  <span className="eyebrow">BƯỚC 02</span>
                  <h2>Làm quen với ứng viên</h2>
                </div>
              </div>
              <p className="muted panel-intro">
                Một chiếc CV. Nhiều điều để khám phá.
              </p>
              <label
                className={`dropzone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""} ${busy ? "disabled" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!busy) setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  if (!busy) chooseFile(e.dataTransfer.files[0]);
                }}
              >
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  aria-label="Tải CV PDF"
                  disabled={busy}
                  onChange={(e) => {
                    chooseFile(e.target.files?.[0]);
                    e.target.value = "";
                  }}
                />
                <span className="upload-icon">
                  {file ? <FileCheck2 size={30} /> : <UploadCloud size={30} />}
                </span>
                <strong>{file ? file.name : "Kéo thả CV vào đây"}</strong>
                <span>
                  {file ? (
                    `${(file.size / 1024).toFixed(0)} KB · Nhấn để đổi tệp`
                  ) : (
                    <>
                      hoặc <u>chọn tệp từ thiết bị</u>
                    </>
                  )}
                </span>
                <small>Định dạng PDF · Một CV mỗi lần</small>
              </label>
              <div className="privacy-note">
                <ShieldCheck size={16} />
                <span>
                  Chỉ phân tích nội dung liên quan đến yêu cầu công việc.
                </span>
              </div>
              {isMock && (
                <label className="mock-picker">
                  Kịch bản trải nghiệm
                  <select
                    disabled={busy}
                    defaultValue="escalated"
                    onChange={async (e) => {
                      const value = e.target.value as
                        "escalated" | "regular" | "error";
                      (await import("./lib/api/mock")).setMockScenario(value);
                    }}
                  >
                    <option value="escalated">Kết quả đã sàng lọc lại</option>
                    <option value="regular">Kết quả không sàng lọc lại</option>
                    <option value="error">Lỗi dịch vụ (thử giao diện)</option>
                  </select>
                  <small>
                    Kết quả cố định cho JD Backend Python; CV và chỉnh sửa JD
                    không được gửi đi.
                  </small>
                </label>
              )}
              {busy ? (
                <div className="progress-card" role="status" aria-live="polite">
                  <div className="section-top">
                    <strong>
                      <LoaderCircle className="spin" size={17} />
                      Đang đọc từng chi tiết…
                    </strong>
                    <span className="elapsed">
                      <Clock3 size={14} />
                      {elapsed}s
                    </span>
                  </div>
                  <p>Thường mất 10–60 giây. Bạn có thể dừng bất cứ lúc nào.</p>
                  <ol>
                    {[
                      "Đọc nội dung CV",
                      "Đối chiếu từng tiêu chí",
                      "Kiểm tra bằng chứng",
                      "Hoàn thiện và xem lại kết quả",
                    ].map((s, i) => (
                      <li key={s} className={step >= i ? "current" : ""}>
                        {step > i ? (
                          <Check size={14} />
                        ) : (
                          <span className={step === i ? "step-pulse" : ""} />
                        )}{" "}
                        {s}
                      </li>
                    ))}
                  </ol>
                  <button className="button secondary full" onClick={cancel}>
                    <X size={16} />
                    Dừng chờ kết quả
                  </button>
                  <small>
                    Dừng chờ có thể không dừng tác vụ đã nhận trên máy chủ.
                  </small>
                </div>
              ) : (
                <>
                  <button
                    ref={screenButtonRef}
                    className="button primary full screen-button"
                    disabled={!ready}
                    onClick={screen}
                  >
                    <Sparkles size={18} />
                    Bắt đầu sàng lọc
                    <ArrowRight size={18} />
                  </button>
                  <p className="ready-hint">
                    {!file
                      ? "Thêm CV để bắt đầu."
                      : validation.length || !jsonValid
                        ? "Hoàn thiện JD để bắt đầu."
                        : "Đã sẵn sàng. Cùng tìm hiểu ứng viên nhé."}
                  </p>
                </>
              )}
              {validation.length > 0 && file && (
                <div className="validation-errors" role="alert">
                  {[...new Set(validation)].map((v) => (
                    <p key={v}>{v}</p>
                  ))}
                </div>
              )}
              {error && (
                <div className="error-card" role="alert">
                  <strong>Chưa thể hoàn tất sàng lọc</strong>
                  <p>{error}</p>
                  <button
                    className="text-button"
                    disabled={!ready || busy}
                    onClick={screen}
                  >
                    <RotateCcw size={14} />
                    Thử lại
                  </button>
                </div>
              )}
              {notice && (
                <p className="notice" role="status">
                  {notice}
                </p>
              )}
            </section>
            <aside className="how-card">
              <div className="how-icon">
                <CircleHelp size={21} />
              </div>
              <div>
                <h3>Rõ ràng từ điểm số đến bằng chứng</h3>
                <p>
                  Mỗi tiêu chí được đánh giá riêng, kèm trích dẫn từ CV. Khi
                  chưa đủ thông tin, hệ thống sẽ nói rõ để bạn xem lại.
                </p>
                <a href="#result-area">
                  Xem khu vực kết quả <ArrowDown size={14} />
                </a>
              </div>
            </aside>
          </div>
        </div>
        <div
          id="result-area"
          className="result-area"
          ref={resultRef}
        >
          {result ? (
            <Results
              data={result}
              jd={resultJD}
              fileName={resultFile}
              headingRef={resultHeadingRef}
            />
          ) : (
            <section className="empty-results" aria-label="Chưa có kết quả">
              <div className="empty-icon">
                <FileCheck2 size={30} />
                <span>
                  <Sparkles size={14} />
                </span>
              </div>
              <h2>Góc nhìn mới về ứng viên, sắp ở đây.</h2>
              <p>
                Hoàn thiện JD và tải CV lên. Lá sẽ giúp bạn nối từng yêu cầu
                <br className="desktop-break" /> với những bằng chứng có trong
                hồ sơ.
              </p>
              <div className="empty-tags">
                <span>
                  <Check size={14} />
                  Đánh giá có căn cứ
                </span>
                <span>
                  <Check size={14} />
                  Bạn giữ quyền quyết định
                </span>
              </div>
            </section>
          )}
        </div>
        <footer>
          <span className="footer-brand">
            <Leaf size={15} />
            lá. <span>Thấu hiểu hồ sơ, kết nối con người.</span>
          </span>
          <span>Được hỗ trợ bởi AI · Được quyết định bởi bạn</span>
        </footer>
      </main>
    </>
  );
}
