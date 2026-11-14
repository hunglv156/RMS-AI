import { useTranslation } from 'react-i18next';
import type { ResumeProfileDto } from '@rms/contracts';
import { api } from '../api/client';
import { useFetch } from '../hooks';

/** Hồ sơ đã trích xuất cho một CV; chỉ tải khi CV đã ở trạng thái ready. */
export default function ResumeProfile({ resumeId }: { resumeId: string }) {
  const { t } = useTranslation();
  const { data, error } = useFetch(() => api<ResumeProfileDto>(`/resumes/${resumeId}/profile`), `profile:${resumeId}`);
  if (error) return <p role="alert" className="error">{error}</p>;
  if (!data?.profile) return null;
  const p = data.profile;
  return (
    <section className="profile" data-testid="profile">
      <h3>{t('profile.title')}</h3>
      {data.requires_manual_review && <p className="warn">{t('profile.manualReview')}</p>}
      {data.quality_flags.includes('ocr') && <p className="muted">{t('profile.ocr')}</p>}
      {p.headline && <p><strong>{p.headline}</strong></p>}
      {p.years_of_experience !== null && <p>{t('profile.years', { n: p.years_of_experience })}</p>}
      {p.skills.length > 0 && (
        <p><strong>{t('profile.skills')}:</strong> {p.skills.join(', ')}</p>
      )}
      {p.experience.length > 0 && (
        <ul>
          {p.experience.map((e, i) => (
            <li key={i}>{[e.title, e.company, e.period].filter(Boolean).join(' · ')}</li>
          ))}
        </ul>
      )}
      {p.education.length > 0 && <p><strong>{t('profile.education')}:</strong> {p.education.join('; ')}</p>}
      {p.languages.length > 0 && <p><strong>{t('profile.languages')}:</strong> {p.languages.join(', ')}</p>}
      <p className="muted">{data.model} · {data.prompt_version}</p>
    </section>
  );
}
