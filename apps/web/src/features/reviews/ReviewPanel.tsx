import { useState } from "react";
import { AlertTriangle, Clock3, PenLine, Star, CircleX } from "lucide-react";
import type { Application, RunDetail } from "@rms-ai/contracts";
import { useLoad, useWorkspace } from "../../app/context";
import { ActionForm, Badge, date, LoadState, Pager } from "../../app/ui";
const decisions = [
  ["hold", "Cân nhắc thêm", "Cần thêm thông tin trước khi chọn.", Clock3],
  ["shortlist", "Đưa vào danh sách ngắn", "Đủ căn cứ để mời trao đổi.", Star],
  ["reject", "Chưa phù hợp", "Hồ sơ chưa đáp ứng yêu cầu chính.", CircleX],
] as const;
/** Names are only readable by admins; others see their own name or a stable short reference. */
export function usePeople() {
  const { client, session } = useWorkspace();
  const users = useLoad(
    (s) =>
      session.user.role === "admin"
        ? client.users({ pageSize: 100 }, s)
        : Promise.resolve(undefined),
    [client, session.user.role],
  );
  return (id: string | null, fallback = "Hệ thống") => {
    if (!id) return fallback;
    if (id === session.user.id) return `${session.user.display_name} (bạn)`;
    const user = users.data?.items.find((u) => u.id === id);
    return user ? user.display_name : `Người dùng #${id.slice(0, 8)}`;
  };
}
export function ReviewPanel({
  application,
  run,
  latestRunId,
  onReviewed,
}: {
  application: Application;
  run: RunDetail;
  latestRunId?: string;
  onReviewed: () => void;
}) {
  const { client, session } = useWorkspace();
  const person = usePeople();
  const [note, setNote] = useState(""),
    [decision, setDecision] = useState<"hold" | "shortlist" | "reject">("hold"),
    [conflict, setConflict] = useState(false),
    [page, setPage] = useState(1);
  const history = useLoad(
    (s) => client.reviewHistory(application.id, { page, pageSize: 10 }, s),
    [client, application.id, application.revision, page],
  );
  const current = history.data?.items.find(
    (r) => r.id === application.current_review_id,
  );
  return (
    <section className="p-card s-review" aria-labelledby="s-review-title">
      <p className="p-eyebrow">GÓC NHÌN CON NGƯỜI</p>
      <h2 id="s-review-title" tabIndex={-1}>
        Một quyết định, có lời giải thích.
      </h2>
      <p className="muted">
        Quyết định được lưu thành bản ghi riêng, gắn tên người quyết định. Kết
        quả AI phía trên giữ nguyên.
      </p>
      {current && (
        <div className="s-current">
          <span>Quyết định hiện tại</span>
          <Badge value={current.decision} />
          <small>
            {person(current.reviewer_id)} · {date(current.created_at)}
          </small>
        </div>
      )}
      {latestRunId !== run.id && (
        <p className="review-banner">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>Bạn đang xem một lần phân tích cũ.</span>
        </p>
      )}
      {current && current.screening_run_id !== latestRunId && (
        <p className="review-banner">
          <AlertTriangle size={18} aria-hidden="true" />
          <span>
            Quyết định hiện tại dựa trên một lần phân tích trước. Kết quả AI mới
            không tự đổi quyết định.
          </span>
        </p>
      )}
      <ActionForm
        label="Lưu quyết định của tôi"
        disabled={!note.trim()}
        onSubmit={async () => {
          if (!note.trim()) throw new Error("Hãy ghi lý do trước khi lưu.");
          setConflict(false);
          try {
            await client.review(run.id, {
              decision,
              note: note.trim(),
              expected_application_revision: application.revision,
            });
          } catch (e) {
            if ((e as { status?: number }).status === 409) setConflict(true);
            throw e;
          }
          setNote("");
          onReviewed();
          history.reload();
          // The emptied note disables the submit button; keep keyboard focus in the panel.
          requestAnimationFrame(() =>
            document.getElementById("s-review-title")?.focus(),
          );
        }}
      >
        <fieldset className="s-decisions">
          <legend>Quyết định</legend>
          {decisions.map(([value, label, hint, Icon]) => (
            <label
              key={value}
              className={`s-choice s-choice-${value} ${decision === value ? "s-on" : ""}`}
            >
              <input
                type="radio"
                name="decision"
                value={value}
                checked={decision === value}
                onChange={() => setDecision(value)}
              />
              <strong>
                <Icon size={15} aria-hidden="true" />
                {label}
              </strong>
              <small>{hint}</small>
            </label>
          ))}
        </fieldset>
        <label>
          <span>
            Lý do & bước tiếp theo <span className="muted">(bắt buộc)</span>
          </span>
          <textarea
            name="note"
            required
            maxLength={2000}
            rows={4}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Bằng chứng nào thuyết phục bạn? Điều gì cần xác nhận khi phỏng vấn?"
          />
        </label>
        <small className="s-signature">
          <PenLine size={13} aria-hidden="true" />
          {note.length}/2000 · Ký tên: {session.user.display_name} · Lần phân
          tích #{run.id.slice(0, 8)}
        </small>
      </ActionForm>
      {conflict && (
        <button
          className="button secondary"
          onClick={() => {
            setConflict(false);
            onReviewed();
            history.reload();
          }}
        >
          Tải lại hồ sơ, giữ ghi chú của tôi
        </button>
      )}
      <h3 className="s-history-title">Lịch sử quyết định</h3>
      <LoadState {...history} />
      {history.data && !history.data.items.length && (
        <p className="p-subtle">Chưa có quyết định nào cho hồ sơ này.</p>
      )}
      {history.data?.items.map((r) => (
        <article className="s-decision" key={r.id}>
          <div className="p-section-title">
            <Badge value={r.decision} />
            <span className="muted">{date(r.created_at)}</span>
          </div>
          <p className="s-note">{r.note}</p>
          <small>
            Người quyết định: <strong>{person(r.reviewer_id)}</strong> · Lần
            phân tích #{r.screening_run_id.slice(0, 8)}
            {r.id === application.current_review_id
              ? " · Hiện tại"
              : " · Đã được thay thế"}
          </small>
        </article>
      ))}
      {history.data && history.data.total > 10 && (
        <Pager
          page={page}
          total={history.data.total}
          pageSize={10}
          onChange={setPage}
        />
      )}
    </section>
  );
}
