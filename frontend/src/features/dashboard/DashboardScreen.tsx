import './dashboard.css';

import { AuditLogPanel } from './components/AuditLogPanel';
import { AlertsPanel } from './components/AlertsPanel';
import { DashboardHeader } from './components/DashboardHeader';
import { DashboardSidebar } from './components/DashboardSidebar';
import { DashboardBanners } from './components/Banners';
import { MapPanel } from './components/MapPanel';
import { RobotPanel } from './components/RobotPanel';
import { SensorPanel } from './components/SensorPanel';
import { TelemetryPanel } from './components/TelemetryPanel';

export const DashboardScreen = () => (
  <>
    <DashboardBanners />
    <section className="dashboard-main">
      <DashboardHeader />
      <div className="dashboard-layout">
        <div className="dashboard-info-column">
          <DashboardSidebar />
          <AlertsPanel />
        </div>

        <div className="dashboard-stage-column">
          <section className="dashboard-stage-top">
            <MapPanel />
            <div className="dashboard-ops-column">
              <RobotPanel />
              <TelemetryPanel />
              <SensorPanel />
            </div>
          </section>
          <section className="dashboard-stage-grid">
            <AuditLogPanel />
          </section>
        </div>
      </div>
    </section>
  </>
);
