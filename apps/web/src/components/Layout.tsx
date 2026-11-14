import { NavLink, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/AuthContext';

export default function Layout() {
  const { t, i18n } = useTranslation();
  const { me, logout } = useAuth();
  const org = me?.memberships.find((m) => m.organization_id === me.active_organization_id);
  return (
    <>
      <header className="bar">
        <strong>{t('appName')}</strong>
        <nav>
          <NavLink to="/jobs">{t('nav.jobs')}</NavLink>
          <NavLink to="/candidates">{t('nav.candidates')}</NavLink>
          <NavLink to="/orgs">{t('nav.orgs')}</NavLink>
        </nav>
        <span className="spacer" />
        {org && <span data-testid="active-org">{org.organization_name} · {me?.active_role}</span>}
        <select
          aria-label={t('language')} value={i18n.language}
          onChange={(e) => {
            void i18n.changeLanguage(e.target.value);
            try { localStorage.setItem('rms.lang', e.target.value); } catch { /* bỏ qua */ }
          }}
        >
          <option value="vi">VI</option>
          <option value="en">EN</option>
        </select>
        <button onClick={() => void logout()}>{t('logout')}</button>
      </header>
      <main className="page"><Outlet /></main>
    </>
  );
}
