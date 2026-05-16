import { AppShell } from '../app/AppShell';
import { RobotHeroIllustration } from '../app/RobotHeroIllustration';
import { DashboardProvider } from '../features/dashboard/context/DashboardContext';
import { DashboardMetrics, DashboardScreen } from '../features/dashboard/DashboardScreen';

export const DashboardPage = () => (
  <DashboardProvider>
    <AppShell heroVisual={<RobotHeroIllustration />} metrics={<DashboardMetrics />}>
      <DashboardScreen />
    </AppShell>
  </DashboardProvider>
);
