import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  ApplicationDto, ScreeningRunDetailDto, ScreeningRunDto, ScreeningRunStatus,
} from '@rms/contracts';
import { api } from '../api/client';
import { useCan, useFetch } from '../hooks';
import { snippet } from './highlight';

const TERMINAL: ScreeningRunStatus[] = ['completed', 'failed_validation', 'failed_provider', 'cancelled'];
const active = (r: { status: ScreeningRunStatus }) => !TERMINAL.includes(r.status);
const pct = (n: number | null) => (n === null ? '–' : `${Math.round(n * 100)}%`);

function RunDetail({ jobId, runId, onClose }: { jobId: string; runId: string; onClose: () => void }) {
  const { t } = useTranslation();
  const { data, error } = useFetch<ScreeningRunDetailDto>(
    () => api<ScreeningRunDetailDto>(`/jobs/${jobId}/screenings/${runId}`), `screening:${runId}`,
    { intervalMs: 2000, shouldPoll: active },
  );
  if (error) return <p role="alert" className="error">{error}</p>;
  if (!data) return <p>{t('loading')}</p>;
  return (
    <section className="screening-detail" data-testid="screening-detail">
      <h3>{data.candidate_name} <span className="badge" data-testid="run-status">{t(`screening.runStatus.${data.status}`)}</span></h3>
      {data.error && <p role="alert" className="error">{data.error}</p>}
      {data.status === 'completed' && (
        <>
          {data.score_state === 'scored' ? (
            <p data-testid="score">
              <strong>{t('screening.score')}: {data.observed_score}</strong>
              {' · '}{t('screening.range')}: {data.lower_bound}–{data.upper_bound}
              {' · '}{t('screening.coverage')}: {pct(data.coverage)}
            </p>
          ) : (
            <p className="warn" data-testid="score">{t('screening.insufficient')} ({t('screening.coverage')}: {pct(data.coverage)})</p>
          )}
          {data.requires_manual_review && <p className="warn">{t('screening.manualReview')}</p>}
          {data.cv_text === null && <p className="muted">{t('screening.cvUnavailable')}</p>}
          <table className="criteria">
            <thead>
              <tr><th>{t('screening.criterion')}</th><th>{t('screening.level')}</th><th>{t('screening.weight')}</th><th>{t('screening.evidence')}</th></tr>
            </thead>
            <tbody>
              {data.results.map((r) => (
                <tr key={r.criterion_id} data-testid={`criterion-${r.code}`}>
                  <td>{r.label}{r.priority === 'must_have' && <span className="badge"> {t('screening.mustHave')}</span>}</td>
                  <td><span className={`level level-${r.level}`} data-testid="level">{t(`screening.levels.${r.level}`)}</span></td>
                  <td>{r.weight}</td>
                  <td>
                    {r.reason && <p>{r.reason}</p>}
                    {r.level === 'needs_review' && r.notes.some((n) => n.startsWith('downgraded')) && (
                      <p className="warn">{t('screening.needsReview')}</p>
                    )}
                    {r.evidence.length === 0 && <span className="muted">{t('screening.noEvidence')}</span>}
                    {r.evidence.map((e, i) => {
                      const s = snippet(data.cv_text, e.quote, e.start_offset, e.end_offset);
                      return (
                        <blockquote key={i} className="evidence">
                          {s.cutBefore && '…'}{s.before}<mark>{s.quote}</mark>{s.after}{s.cutAfter && '…'}
                        </blockquote>
                      );
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {data.model && <p className="muted">{t('screening.model')}: {data.model} · {data.prompt_version}</p>}
        </>
      )}
      <button onClick={onClose}>{t('screening.close')}</button>
    </section>
  );
}

/** Danh sách application của job, nút chạy sàng lọc và kết quả từng lượt. */
export default function ScreeningPanel({ jobId }: { jobId: string }) {
  const { t } = useTranslation();
  const canRun = useCan('screening:run');
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const apps = useFetch(() => api<{ items: ApplicationDto[] }>(`/jobs/${jobId}/applications`), `apps:${jobId}`);
  const runs = useFetch(
    () => api<{ items: ScreeningRunDto[] }>(`/jobs/${jobId}/screenings`), `runs:${jobId}`,
    { intervalMs: 2000, shouldPoll: (d) => d.items.some(active) },
  );

  async function start(applicationId: string) {
    try {
      // Mỗi lần bấm là một ý định riêng; mạng chập chờn thì gọi lại với cùng khoá sẽ không tạo run thứ hai.
      const run = await api<ScreeningRunDto>(`/jobs/${jobId}/screenings`, {
        method: 'POST', headers: { 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify({ application_id: applicationId }),
      });
      setErr(null);
      setOpen(run.id);
      runs.reload();
    } catch (x) { setErr((x as Error).message); }
  }

  return (
    <section data-testid="screening-panel">
      <h2>{t('screening.title')}</h2>
      {err && <p role="alert" className="error">{err}</p>}
      <h3>{t('screening.applications')}</h3>
      {apps.data?.items.length === 0 && <p>{t('screening.noApplications')}</p>}
      <ul className="cards">
        {apps.data?.items.map((a) => (
          <li key={a.id} data-testid="application">
            <span>{a.candidate_name}</span>
            <span className="badge">{t(`status.${a.resume_status}`)}</span>
            <span className="spacer" />
            {canRun && <button onClick={() => void start(a.id)}>{t('screening.run')}</button>}
          </li>
        ))}
      </ul>
      <h3>{t('screening.runs')}</h3>
      {runs.data?.items.length === 0 && <p>{t('screening.noRuns')}</p>}
      <ul className="cards">
        {runs.data?.items.map((r) => (
          <li key={r.id} data-testid="run">
            <span>{r.candidate_name}</span>
            <span className="badge">{t(`screening.runStatus.${r.status}`)}</span>
            {r.score_state === 'scored' && <strong>{r.observed_score}</strong>}
            <span className="spacer" />
            <button onClick={() => setOpen(r.id)}>{t('screening.view')}</button>
          </li>
        ))}
      </ul>
      {open && <RunDetail key={open} jobId={jobId} runId={open} onClose={() => setOpen(null)} />}
    </section>
  );
}
