import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { JobDto, Page } from '@rms/contracts';
import { api, post } from '../api/client';
import { useCan, useFetch } from '../hooks';

export default function JobsPage() {
  const { t } = useTranslation();
  const canWrite = useCan('job:write');
  const { data, error, reload } = useFetch(() => api<Page<JobDto>>('/jobs?page_size=50'), 'jobs');
  const [err, setErr] = useState<string | null>(null);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    try {
      await post('/jobs', { title: String(f.get('title')), description: String(f.get('description') ?? '') });
      form.reset();
      setErr(null);
      reload();
    } catch (x) { setErr((x as Error).message); }
  }

  return (
    <>
      <h1>{t('jobs.title')}</h1>
      {canWrite ? (
        <form onSubmit={(e) => void create(e)} className="row">
          <input name="title" aria-label={t('jobs.jobTitle')} placeholder={t('jobs.jobTitle')} required maxLength={200} />
          <input name="description" aria-label={t('jobs.description')} placeholder={t('jobs.description')} />
          <button type="submit">{t('jobs.create')}</button>
        </form>
      ) : <p className="muted">{t('readOnly')}</p>}
      {(err || error) && <p role="alert" className="error">{err ?? error}</p>}
      {data && data.items.length === 0 && <p>{t('jobs.empty')}</p>}
      <ul className="cards">
        {data?.items.map((j) => (
          <li key={j.id}><Link to={`/jobs/${j.id}`}>{j.title}</Link> <span className="badge">{j.status}</span></li>
        ))}
      </ul>
    </>
  );
}
