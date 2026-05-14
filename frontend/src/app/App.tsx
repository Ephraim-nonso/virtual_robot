import { AppShell } from './AppShell';
import { RobotHeroIllustration } from './RobotHeroIllustration';
import { DashboardProvider } from '../features/dashboard/context/DashboardContext';
import { DashboardMetrics, DashboardScreen } from '../features/dashboard/DashboardScreen';

const App = () => (
  <DashboardProvider>
    <AppShell
      heroVisual={<RobotHeroIllustration />}
      metrics={<DashboardMetrics />}
    >
      <DashboardScreen />
    </AppShell>
  </DashboardProvider>
);

export default App;
