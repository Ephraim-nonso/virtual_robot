import { AppShell } from '../app/AppShell';
import { RobotHeroIllustration } from '../app/RobotHeroIllustration';
import { AuthMetrics } from '../features/auth/components/AuthMetrics';
import { LoginPanel } from '../features/auth/components/LoginPanel';

export const LoginPage = () => (
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
        <div className="topbar-actions">
          <span className="topbar-pill">Secure JWT auth</span>
          <span className="topbar-pill">Telemetry ready</span>
        </div>
      </header>

      <section className="login-hero">
        <div className="login-copy">
          <div>
            <p className="eyebrow">Mission Access</p>
            <h1>Minimal control for robot operations.</h1>
            <p className="hero-copy">
              Sign in to monitor telemetry, review mission history, and unlock commander controls from one focused
              dashboard.
            </p>
          </div>

          <div className="hero-metrics">
            <AuthMetrics />
          </div>

          <RobotHeroIllustration />
        </div>

        <LoginPanel />
      </section>
    </section>
  </AppShell>
);
