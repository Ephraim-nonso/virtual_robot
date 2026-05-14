import './dashboard.css';

import { DashboardBanners } from './components/Banners';
import { DashboardMetrics } from './components/Metrics';
import { MapPanel } from './components/MapPanel';
import { RobotPanel } from './components/RobotPanel';
import { SensorPanel } from './components/SensorPanel';
import { TelemetryPanel } from './components/TelemetryPanel';

export const DashboardScreen = () => (
  <>
    <DashboardBanners />
    <section className="dashboard-grid">
      <RobotPanel />
      <MapPanel />
      <SensorPanel />
      <TelemetryPanel />
    </section>
  </>
);

export { DashboardMetrics };
