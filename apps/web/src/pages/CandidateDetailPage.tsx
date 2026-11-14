import { useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { CandidateDto, DownloadUrlDto, ParseStatus, ResumeDto } from '@rms/contracts';
import { api, del } from '../api/client';
import { useCan, useFetch } from '../hooks';

const TERMINAL: ParseStatus[] = ['ready', 'rejected', 'failed_extraction', 'failed_provider', 'cancelled'];

export default function CandidateDetailPage() {
  const { t } = useTranslation();
  const { candidateId = '' } = useParams();
  const nav = useNavigate();
  const canUpload = useCan('resume:upload');
  const canDownload = useCan('resume:download');
  const canDelete = useCan('candidate:delete');
  const fileRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const cand = useFetch(() => api<CandidateDto>(`/candidates/${candidateId}`), `cand:${candidateId}`);
  // Polling trạng thái xử lý cho tới khi mọi CV ở trạng thái kết thúc.
  const resumes = useFetch(
    () => api<{ items: ResumeDto[] }>(`/candidates/${candidateId}/resumes`),
    `resumes:${candidateId}`,
    { intervalMs: 2000, shouldPoll: (d) => d.items.some((r) => !TERMINAL.includes(r.parse_status)) },
  );

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('candidate_id', candidateId);
    fd.append('file', file);
    setNotice(null);
    try {
      const r = await api<ResumeDto>('/resumes/upload', { method: 'POST', body: fd });
      if (r.deduplicated) setNotice(t('candidates.deduplicated'));
      setErr(null);
      resumes.reload();
    } catch (x) { setErr((x as Error).message); }
    if (fileRef.current) fileRef.current.value = '';
  }

  async function download(id: string) {
    const r = await api<DownloadUrlDto>(`/resumes/${id}/download-url`);
    window.open(r.url, '_blank', 'noopener');
  }

  if (cand.error) return <p role="alert" className="error">{cand.error}</p>;
  if (!cand.data) return <p>{t('loading')}</p>;
  return (
    <>
      <p><Link to="/candidates">← {t('candidates.title')}</Link></p>
      <h1>{cand.data.display_name}</h1>
      {cand.data.contact.email && <p>{cand.data.contact.email}</p>}
      <h2>{t('candidates.resumes')}</h2>
      {canUpload && (
        <label>{t('candidates.upload')}
          <input ref={fileRef} type="file" accept=".pdf,.docx" onChange={(e) => void onFile(e)} />
        </label>
      )}
      {notice && <p role="status">{notice}</p>}
      {err && <p role="alert" className="error">{err}</p>}
      {resumes.data && resumes.data.items.length === 0 && <p>{t('candidates.noResumes')}</p>}
      <ul className="cards">
        {resumes.data?.items.map((r) => (
          <li key={r.id}>
            <span>{r.original_filename}</span>{' '}
            <span className="badge" data-testid="resume-status">{t(`status.${r.parse_status}`)}</span>
            {canDownload && <button onClick={() => void download(r.id)}>{t('candidates.download')}</button>}
          </li>
        ))}
      </ul>
      {canDelete && (
        <p><button className="danger" onClick={() => void del(`/candidates/${candidateId}`).then(() => nav('/candidates'))}>
          {t('candidates.delete')}
        </button></p>
      )}
    </>
  );
}
