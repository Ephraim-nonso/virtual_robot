import { useAuthContext } from "../../auth/context/useAuthContext";
import { useDashboardContext } from "../context/useDashboardContext";

const navItems = [
  { label: "Mission Control", state: "Live operations" },
  { label: "Robot Status", state: "Live status" },
  { label: "Navigation", state: "Grid tracking" },
  { label: "Telemetry", state: "Realtime feed" },
  { label: "Mission History", state: "Audit ready" },
];

export const DashboardSidebar = () => {
  const { status, telemetryState, map, sensors, backendState } =
    useDashboardContext();
  const { user } = useAuthContext();

  return (
    <aside className="dashboard-sidebar panel">
      <section className="sidebar-section">
        <p className="eyebrow">Mission control</p>
        <h2>Operator overview</h2>
        <p className="panel-subcopy">
          Operator's robot information
        </p>
      </section>

      <nav className="dashboard-nav" aria-label="Ground control sections">
        {navItems.map((item, index) => (
          <div
            key={item.label}
            className={`dashboard-nav-item ${index === 0 ? "active" : ""}`}
          >
            <span>{item.label}</span>
            <strong>
              {item.label === "Telemetry" ? telemetryState : item.state}
            </strong>
          </div>
        ))}
      </nav>

      <section className="sidebar-section sidebar-stat-list">
        <div>
          <span>Operator</span>
          <strong>{user?.name ?? "--"}</strong>
        </div>
        <div>
          <span>Role</span>
          <strong>{user?.role ?? "--"}</strong>
        </div>
        <div>
          <span>Robot ID</span>
          <strong>{status?.id ?? "--"}</strong>
        </div>
        <div>
          <span>Grid</span>
          <strong>{map ? `${map.width} x ${map.height}` : "--"}</strong>
        </div>
        <div>
          <span>Sensors</span>
          <strong>{sensors ? `${sensors.lidar.length} samples` : "--"}</strong>
        </div>
      </section>
    </aside>
  );
};
