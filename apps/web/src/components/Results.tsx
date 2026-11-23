import type { Source, QuoteVerification } from "@rms-ai/contracts";
import {
  AlertTriangle,
  CheckCheck,
  Download,
  Printer,
  Quote,
  ShieldCheck,
} from "lucide-react";
import type { RefObject } from "react";
import type {
  JobDescription,
  Level,
  ScreeningEnvelope,
  ScreeningResult,
} from "../lib/api/types";
export const levelLabels: Record<Level, string> = {
  strong: "Đáp ứng tốt",
  adequate: "Đáp ứng",
  partial: "Đáp ứng một phần",
  absent: "Chưa đáp ứng",
  unknown: "Chưa đủ thông tin",
  needs_review: "Cần xem lại",
};
export function LevelBadge({ level }: { level: Level }) {
  return <span className={`badge level-${level}`}>{levelLabels[level]}</span>;
}
export function ReviewBanner({ result }: { result: ScreeningResult }) {
  const escalated = result.escalation?.triggered;
  if (
    !escalated &&
    !result.total.requires_manual_review &&
    !result.criteria.some(
      (c) =>
        c.validation.level === "needs_review" ||
        c.assessment.level === "needs_review",
    )
  )
    return null;
  return (
    <div className="review-banner" role="status">
      <AlertTriangle size={21} />
      <div>
        <strong>Cần người xem lại</strong>
        <p>
          {escalated
            ? `Đã sàng lọc lại bằng ${result.escalation?.escalation_model}. ${result.escalation?.error ? "Lần xem lại gặp lỗi; đang hiển thị kết quả ban đầu." : "Vui lòng kiểm tra bằng chứng trước khi quyết định."}`
            : "Một số yêu cầu cần được xác nhận thêm với ứng viên."}
        </p>
      </div>
    </div>
  );
}
export function Results({
  data,
  jd,
  fileName,
  headingRef,
  source,
}: {
  data: ScreeningEnvelope;
  source?: Source;
  jd: JobDescription;
  fileName: string;
  headingRef?: RefObject<HTMLHeadingElement | null>;
}) {
  const r = data.screening;
  const published =
    r.total.score_state === "scored" &&
    r.total.observed_score !== null &&
    r.total.coverage >= data.config.min_coverage;
  const score = published ? r.total.observed_score : null;
  const verdict =
    score === null
      ? "Chưa đủ căn cứ đánh giá"
      : score >= 70
        ? "Phù hợp với vị trí"
        : score >= 40
          ? "Phù hợp một phần"
          : "Mức độ phù hợp thấp";
  function download() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "ket-qua-sang-loc.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="results" aria-label="Kết quả sàng lọc">
      <div className="section-top">
        <div>
          <span className="eyebrow">KẾT QUẢ PHÂN TÍCH</span>
          <h2 ref={headingRef} tabIndex={-1}>
            Mỗi nhận định, một căn cứ.
          </h2>
        </div>
        <div className="actions no-print">
          <button className="button secondary" onClick={download}>
            <Download size={16} />
            Xuất JSON
          </button>
          <button
            className="icon-button"
            aria-label="In kết quả"
            onClick={() => window.print()}
          >
            <Printer size={19} />
          </button>
        </div>
      </div>
      <p className="muted result-file">
        {fileName} · {jd.title} · {data.latency_s.toFixed(1)} giây
      </p>
      <ReviewBanner result={r} />
      <div className="score-panel">
        <div
          className="score-orb"
          style={{
            background: `conic-gradient(var(--brand) ${score ?? 0}%, var(--line) 0)`,
          }}
        >
          <span>
            {score === null
              ? "—"
              : score.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}
          </span>
          <small>{score === null ? "Chưa công bố điểm" : "/ 100 điểm"}</small>
        </div>
        <div className="score-description">
          <span className="eyebrow">MỨC ĐỘ PHÙ HỢP</span>
          <h3>{verdict}</h3>
          <p>
            {published
              ? "Điểm đã công bố theo ngưỡng bao phủ."
              : "Chưa công bố điểm vì độ bao phủ chưa đạt ngưỡng."}
          </p>
          <span className="badge neutral">
            Khoảng điểm: {r.total.lower_bound}–{r.total.upper_bound}
          </span>
        </div>
        <div className="coverage">
          <span>
            <ShieldCheck size={18} />
            Độ bao phủ
          </span>
          <strong>{Math.round(r.total.coverage * 100)}%</strong>
          <div className="meter">
            <div style={{ width: `${r.total.coverage * 100}%` }} />
          </div>
          <small>Ngưỡng công bố: {data.config.min_coverage * 100}%</small>
        </div>
      </div>
      <div className="section-top criterion-heading">
        <h3>
          Đánh giá theo tiêu chí{" "}
          <span className="count">{r.criteria.length}</span>
        </h3>
        <span className="muted text-xs">Dựa trên bằng chứng trong CV</span>
      </div>
      <div className="criterion-list">
        {r.criteria.map((c, i) => (
          <article className="criterion-card" key={c.assessment.criterion_id}>
            <div className="criterion-title">
              <div className="criterion-number">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div>
                <h3>
                  {jd.criteria.find((j) => j.code === c.assessment.criterion_id)
                    ?.label ?? c.assessment.criterion_id}
                </h3>
                <p className="muted text-xs">
                  {c.scoring.priority === "must_have" ? "Bắt buộc" : "Ưu tiên"}{" "}
                  · Trọng số {c.scoring.weight} · Độ tin cậy{" "}
                  {Math.round(c.assessment.confidence * 100)}%
                </p>
              </div>
              <LevelBadge level={c.validation.level} />
            </div>
            <p className="rationale">{c.assessment.reason}</p>
            {c.evidence.length > 0 ? (
              <div className="evidence-list">
                {c.evidence.map((e, index) => (
                  <blockquote key={index}>
                    <Quote size={17} />
                    <div>
                      <mark>{e.evidence.quote}</mark>
                      <div
                        className={`verification ${e.verification.valid ? "verified" : "unverified"}`}
                      >
                        {e.verification.valid ? (
                          <CheckCheck size={14} />
                        ) : (
                          <AlertTriangle size={14} />
                        )}{" "}
                        {e.verification.valid
                          ? "Đã xác minh trích dẫn"
                          : "Chưa xác minh trích dẫn"}
                        {e.verification.ambiguous
                          ? " · Xuất hiện nhiều lần"
                          : ""}
                      </div>
                      {source && (
                        <SourceEvidence
                          source={source}
                          quote={e.evidence.quote}
                          verification={e.verification}
                        />
                      )}
                    </div>
                  </blockquote>
                ))}
              </div>
            ) : (
              <p className="no-evidence">Chưa có trích dẫn để đối chiếu.</p>
            )}
            {c.assessment.missing_information.length > 0 && (
              <details className="missing">
                <summary>
                  Thông tin cần bổ sung (
                  {c.assessment.missing_information.length})
                </summary>
                <ul>
                  {c.assessment.missing_information.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              </details>
            )}
          </article>
        ))}
      </div>
      <p className="result-note">
        AI hỗ trợ đối chiếu thông tin. Quyết định tuyển dụng thuộc về bạn.
      </p>
    </section>
  );
}

export function sourceRange(
  source: Source,
  quote: string,
  verification: QuoteVerification,
) {
  const start = verification.start_offset,
    end = verification.end_offset;
  const chars = Array.from(source.text);
  if (
    !verification.valid ||
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start == null ||
    end == null ||
    start < 0 ||
    end <= start ||
    end > chars.length ||
    chars.slice(start, end).join("") !== quote
  )
    return null;
  return {
    chars,
    start,
    end,
    pages: source.pages.filter(
      (p) => p.start_offset < end && p.end_offset > start,
    ),
  };
}
export function SourceEvidence({
  source,
  quote,
  verification,
}: {
  source: Source;
  quote: string;
  verification: QuoteVerification;
}) {
  const range = sourceRange(source, quote, verification);
  if (!range)
    return (
      <p className="p-hint">
        Không có vị trí nguồn đã xác minh. Không gắn liên kết trang.
      </p>
    );
  const from = range.pages[0]?.start_offset ?? Math.max(0, range.start - 240);
  const to =
    range.pages.at(-1)?.end_offset ??
    Math.min(range.chars.length, range.end + 240);
  return (
    <details
      className="s-source"
      onToggle={(e) => {
        const details = e.currentTarget;
        if (details.open)
          requestAnimationFrame(() => {
            const pre = details.querySelector("pre"),
              mark = pre?.querySelector("mark");
            if (pre && mark)
              pre.scrollTop +=
                mark.getBoundingClientRect().top -
                pre.getBoundingClientRect().top -
                pre.clientHeight / 2;
          });
      }}
    >
      <summary>
        Đối chiếu nguồn ·{" "}
        {range.pages.length
          ? range.pages
              .map(
                (p) =>
                  `Trang ${p.page_number}${p.method === "ocr" ? " · OCR" : ""}`,
              )
              .join(", ")
          : "Chưa biết trang"}
      </summary>
      <p className="p-hint">
        Văn bản chuẩn hóa đã được dùng để phân tích. Trích dẫn được tô sáng theo
        vị trí Unicode đã xác minh.
      </p>
      <pre>
        {range.chars.slice(from, range.start).join("")}
        <mark>{range.chars.slice(range.start, range.end).join("")}</mark>
        {range.chars.slice(range.end, to).join("")}
      </pre>
    </details>
  );
}
