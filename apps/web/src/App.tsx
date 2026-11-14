import { Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from './auth/AuthContext';
import Layout from './components/Layout';
import CandidateDetailPage from './pages/CandidateDetailPage';
import CandidatesPage from './pages/CandidatesPage';
import JobDetailPage from './pages/JobDetailPage';
import JobsPage from './pages/JobsPage';
import LoginPage from './pages/LoginPage';
import OrgPickerPage from './pages/OrgPickerPage';

export default function App() {
  const { t } = useTranslation();
  const { me, loading } = useAuth();
  if (loading) return <p className="page">{t('loading')}</p>;
  if (!me) {
    return (
      <Routes>
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to={me.active_organization_id ? '/jobs' : '/orgs'} replace />} />
        <Route path="/orgs" element={<OrgPickerPage />} />
        <Route path="/jobs" element={<JobsPage />} />
        <Route path="/jobs/:jobId" element={<JobDetailPage />} />
        <Route path="/candidates" element={<CandidatesPage />} />
        <Route path="/candidates/:candidateId" element={<CandidateDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
