import { Navigate, Outlet } from 'react-router-dom';

import '../features/auth/auth.css';
import { AppShell } from './AppShell';
import { RobotHeroIllustration } from './RobotHeroIllustration';
import { AuthMetrics } from '../features/auth/components/AuthMetrics';
import { useAuthContext } from '../features/auth/context/useAuthContext';

const AuthLoadingScreen = () => (
  <AppShell heroVisual={<RobotHeroIllustration />} metrics={<AuthMetrics />}>
    <section className="auth-layout">
      <article className="panel auth-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Authentication</p>
            <h2>Restoring session</h2>
            <p className="panel-subcopy">
              Checking for a saved frontend session before loading protected robot APIs.
            </p>
          </div>
        </div>
      </article>
    </section>
  </AppShell>
);

export const ProtectedRoute = () => {
  const { status } = useAuthContext();

  if (status === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export const PublicOnlyRoute = () => {
  const { status } = useAuthContext();

  if (status === 'loading') {
    return <AuthLoadingScreen />;
  }

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
