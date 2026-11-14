import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import type { CandidateDto, Page } from '@rms/contracts';
import { api, post } from '../api/client';
import { useCan, useFetch } from '../hooks';

export default function CandidatesPage() {
  const { t } = useTranslation();
  const canWrite = useCan('candidate:write');
  const { data, error, reload } = useFetch(() => api<Page<CandidateDto>>('/candidates?page_size=50'), 'candidates');
  const [err, setErr] = useState<string | null>(null);

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const email = String(f.get('email') ?? '').trim();
    try {
      await post('/candidates', { display_name: String(f.get('name')), contact: email ? { email } : {} });
      form.reset();
      setErr(null);
      reload();
    } catch (x) { setErr((x as Error).message); }
  }

  return (
    <>
      <h1>{t('candidates.title')}</h1>
      {canWrite ? (
        <form onSubmit={(e) => void create(e)} className="row">
          <input name="name" aria-label={t('candidates.name')} placeholder={t('candidates.name')} required maxLength={200} />
          <input name="email" type="email" aria-label={t('candidates.email')} placeholder={t('candidates.email')} />
          <button type="submit">{t('candidates.create')}</button>
        </form>
      ) : <p className="muted">{t('readOnly')}</p>}
      {(err || error) && <p role="alert" className="error">{err ?? error}</p>}
      {data && data.items.length === 0 && <p>{t('candidates.empty')}</p>}
      <ul className="cards">
        {data?.items.map((c) => <li key={c.id}><Link to={`/candidates/${c.id}`}>{c.display_name}</Link></li>)}
      </ul>
    </>
  );
}
