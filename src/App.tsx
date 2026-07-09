import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell';
import PaystubAuditReport from './pages/PaystubAuditReport';
import { ROLE_ROUTES } from './roles';

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to={ROLE_ROUTES.globalAdmin} replace />} />
        <Route path={ROLE_ROUTES.globalAdmin} element={<PaystubAuditReport />} />
        <Route path={ROLE_ROUTES.hrAdmin} element={<PaystubAuditReport />} />
        <Route path="*" element={<Navigate to={ROLE_ROUTES.globalAdmin} replace />} />
      </Routes>
    </AppShell>
  );
}
