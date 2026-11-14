import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function OrgPickerPage() {
  const { t } = useTranslation();
  const { me, switchOrg } = useAuth();
  const nav = useNavigate();
  const list = me?.memberships.filter((m) => m.status === 'active') ?? [];
  return (
    <>
      <h1>{t('orgs.title')}</h1>
      {list.length === 0 && <p>{t('orgs.none')}</p>}
      <ul className="cards">
        {list.map((m) => (
          <li key={m.organization_id}>
            <strong>{m.organization_name}</strong> <small>({m.role})</small>
            {m.organization_id === me?.active_organization_id ? (
              <span className="badge">{t('orgs.active')}</span>
            ) : (
              <button onClick={() => void switchOrg(m.organization_id).then(() => nav('/jobs'))}>{t('orgs.open')}</button>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
