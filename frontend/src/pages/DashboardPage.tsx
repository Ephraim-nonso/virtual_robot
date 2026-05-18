import { AppShell } from '../app/AppShell';
import { DashboardProvider } from '../features/dashboard/context/DashboardContext';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';

export const DashboardPage = () => (
  <DashboardProvider>
    <AppShell>
      <DashboardScreen />
    </AppShell>
  </DashboardProvider>
);
