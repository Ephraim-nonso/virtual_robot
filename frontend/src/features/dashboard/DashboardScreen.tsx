import './dashboard.css';

import { AlertsPanel } from './components/AlertsPanel';
import { AuditLogPanel } from './components/AuditLogPanel';
import { DashboardHeader } from './components/DashboardHeader';
import { DashboardSidebar } from './components/DashboardSidebar';
import { DashboardBanners } from './components/Banners';
import { DashboardMetrics } from './components/Metrics';
import { MapPanel } from './components/MapPanel';
import { RobotPanel } from './components/RobotPanel';
import { SensorPanel } from './components/SensorPanel';
import { TelemetryPanel } from './components/TelemetryPanel';

export const DashboardScreen = () => (
  <>
    <DashboardBanners />
    <section className="dashboard-main">
      <DashboardHeader />
      <DashboardSidebar />
      <div className="dashboard-priority-grid">
        <RobotPanel />
        <MapPanel />
      </div>
      <section className="dashboard-grid">
        <AuditLogPanel />
        <div className="dashboard-stack">
          <AlertsPanel />
          <SensorPanel />
          <TelemetryPanel />
        </div>
      </section>
    </section>
  </>
);

export { DashboardMetrics };
