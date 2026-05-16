import { useAuthContext } from '../../auth/context/useAuthContext';
import { useDashboardContext } from '../context/useDashboardContext';

const navItems = [
  { label: 'Overview', state: 'Online' },
  { label: 'Robot Status', state: 'Tracking' },
  { label: 'Navigation Map', state: 'Ready' },
  { label: 'Telemetry Feed', state: 'Streaming' },
  { label: 'Alert Queue', state: 'Watching' },
];

export const DashboardSidebar = () => {
  const { status, telemetryState, map, sensors } = useDashboardContext();
  const { user, logout } = useAuthContext();

  return (
    <aside className="dashboard-sidebar panel">
      <nav className="dashboard-nav" aria-label="Ground control sections">
        {navItems.map((item, index) => (
          <div key={item.label} className={`dashboard-nav-item ${index === 0 ? 'active' : ''}`}>
            <span>{item.label}</span>
            <strong>{item.label === 'Telemetry Feed' ? telemetryState : item.state}</strong>
          </div>
        ))}
      </nav>

      <div className="sidebar-stat-list">
        <div>
          <span>Operator</span>
          <strong>{user?.name ?? '--'}</strong>
        </div>
        <div>
          <span>Role</span>
          <strong>{user?.role ?? '--'}</strong>
        </div>
        <div>
          <span>Robot</span>
          <strong>{status?.id ?? '--'}</strong>
        </div>
        <div>
          <span>Grid</span>
          <strong>{map ? `${map.width} x ${map.height}` : '--'}</strong>
        </div>
        <div>
          <span>Sensors</span>
          <strong>{sensors ? `${sensors.lidar.length} samples` : '--'}</strong>
        </div>
        <button className="ghost-button sidebar-logout-button" onClick={logout}>
          Sign out
        </button>
      </div>
    </aside>
  );
};
