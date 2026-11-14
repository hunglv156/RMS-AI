import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function LoginPage() {
  const { t } = useTranslation();
  const { login, register } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get('email'));
    const password = String(f.get('password'));
    setBusy(true);
    setError(null);
    try {
      if (mode === 'login') await login(email, password);
      else await register({
        email, password, display_name: String(f.get('display_name')),
        organization_name: String(f.get('organization_name')),
      });
      nav('/jobs');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page narrow">
      <h1>{mode === 'login' ? t('auth.login') : t('auth.register')}</h1>
      <form onSubmit={(e) => void submit(e)} className="stack">
        {mode === 'register' && (
          <>
            <label>{t('auth.displayName')}<input name="display_name" required maxLength={100} /></label>
            <label>{t('auth.orgName')}<input name="organization_name" required maxLength={100} /></label>
          </>
        )}
        <label>{t('auth.email')}<input name="email" type="email" required autoComplete="username" /></label>
        <label>{t('auth.password')}
          <input name="password" type="password" required minLength={mode === 'register' ? 10 : 1}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
        </label>
        {error && <p role="alert" className="error">{error}</p>}
        <button type="submit" disabled={busy}>{mode === 'login' ? t('auth.login') : t('auth.register')}</button>
      </form>
      <p><button className="link" type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? t('auth.noAccount') : t('auth.haveAccount')}
      </button></p>
    </main>
  );
}
