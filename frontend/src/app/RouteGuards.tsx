import { Navigate, Outlet } from 'react-router-dom';

import '../features/auth/auth.css';
import { AppShell } from './AppShell';
import { useAuthContext } from '../features/auth/context/useAuthContext';

const AuthLoadingScreen = () => (
  <AppShell>
    <section className="marketing-shell">
      <header className="topbar public-topbar">
        <div className="brand-lockup">
          <span className="brand-mark">VR</span>
          <div>
            <p className="eyebrow">Virtual Robot Management</p>
            <strong>Ground control access</strong>
          </div>
        </div>
      </header>

      <section className="login-hero">
        <div className="login-copy">
          <div>
            <p className="eyebrow">Authentication</p>
            <h1>Restoring operator session.</h1>
            <p className="hero-copy">
              Checking for a saved frontend session before loading protected robot APIs and commander controls.
            </p>
          </div>
        </div>

        <section className="auth-layout">
          <article className="panel auth-panel auth-form-panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Authentication</p>
                <h2>Restoring session</h2>
                <p className="panel-subcopy">Verifying saved credentials and routing you to mission control.</p>
              </div>
            </div>
          </article>
        </section>
      </section>
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
