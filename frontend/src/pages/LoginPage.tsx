import { AppShell } from '../app/AppShell';
import { RobotHeroIllustration } from '../app/RobotHeroIllustration';
import { AuthMetrics } from '../features/auth/components/AuthMetrics';
import { LoginPanel } from '../features/auth/components/LoginPanel';

export const LoginPage = () => (
  <AppShell heroVisual={<RobotHeroIllustration />} metrics={<AuthMetrics />}>
    <LoginPanel />
  </AppShell>
);
