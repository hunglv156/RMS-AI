import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import { JOB_STATUSES, type JobDto } from '@rms/contracts';
import { api, patch } from '../api/client';
import ScreeningPanel from '../components/ScreeningPanel';
import { useCan, useFetch } from '../hooks';

export default function JobDetailPage() {
  const { t } = useTranslation();
  const { jobId = '' } = useParams();
  const canWrite = useCan('job:write');
  const { data: job, error, reload } = useFetch(() => api<JobDto>(`/jobs/${jobId}`), `job:${jobId}`);
  const [err, setErr] = useState<string | null>(null);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await patch(`/jobs/${jobId}`, {
        title: String(f.get('title')), description: String(f.get('description')), status: String(f.get('status')),
      });
      setErr(null);
      reload();
    } catch (x) { setErr((x as Error).message); }
  }

  if (error) return <p role="alert" className="error">{error}</p>;
  if (!job) return <p>{t('loading')}</p>;
  return (
    <>
      <p><Link to="/jobs">{t('jobs.back')}</Link></p>
      <h1>{job.title}</h1>
      <form onSubmit={(e) => void save(e)} className="stack" key={job.updated_at}>
        <label>{t('jobs.jobTitle')}<input name="title" defaultValue={job.title} required disabled={!canWrite} /></label>
        <label>{t('jobs.description')}<textarea name="description" defaultValue={job.description} rows={6} disabled={!canWrite} /></label>
        <label>{t('jobs.status')}
          <select name="status" defaultValue={job.status} disabled={!canWrite}>
            {JOB_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        {err && <p role="alert" className="error">{err}</p>}
        {canWrite && <button type="submit">{t('jobs.save')}</button>}
      </form>
      <ScreeningPanel jobId={jobId} />
    </>
  );
}
