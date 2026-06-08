import { Navigate, Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { setOnTokenRefreshed } from './services/api';
import { reconnectSocket } from './services/socket';
import Toast from './components/Toast';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import WorkspacesPage from './pages/WorkspacesPage';
import WorkspaceMembersPage from './pages/WorkspaceMembersPage';
import TeamPage from './pages/TeamPage';

export default function App() {
  const authReady = useAuthStore((s) => s.authReady);

  useEffect(() => {
    void useAuthStore.getState().fetchMe();
  }, []);

  useEffect(() => {
    setOnTokenRefreshed(() => {
      void useAuthStore.getState().restoreLastContext();
      reconnectSocket();
    });
    return () => setOnTokenRefreshed(null);
  }, []);

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <Toast />
      <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/accept-invite/:token" element={<AcceptInvitePage />} />
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="settings/workspaces" element={<WorkspacesPage />} />
        <Route path="settings/workspaces/:id/members" element={<WorkspaceMembersPage />} />
        <Route path="settings/team" element={<TeamPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </>
  );
}
