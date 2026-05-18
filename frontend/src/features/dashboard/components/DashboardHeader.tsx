import { formatRelativeTime, prettyNumber } from '../lib/formatters';
import { useAuthContext } from '../../auth/context/useAuthContext';
import { useDashboardContext } from '../context/useDashboardContext';

export const DashboardHeader = () => {
  const { status, busy, loading, loadDashboard, connectionHealth, lastUpdatedAt, isPolling } = useDashboardContext();
  const { user, logout } = useAuthContext();

  return (
    <header className="topbar dashboard-topbar">
      <div className="brand-lockup">
        <span className="brand-mark">VR</span>
        <div>
          <p className="eyebrow">Mission control</p>
          <strong>Ground control dashboard</strong>
        </div>
      </div>

      <div className="topbar-actions dashboard-topbar-actions">
        <div className="topbar-pill topbar-pill-detail">
          <span>Operator</span>
          <strong>{user?.name ?? '--'}</strong>
        </div>
        <div className="topbar-pill topbar-pill-detail">
          <span>Command</span>
          <strong>{status?.status ?? 'Standby'}</strong>
        </div>
        <div className="topbar-pill topbar-pill-detail">
          <span>Role</span>
          <strong>{user?.role ?? '--'}</strong>
        </div>
        <div className="topbar-pill topbar-pill-detail">
          <span>Connection</span>
          <strong>{connectionHealth}</strong>
        </div>
        <div className="topbar-pill topbar-pill-detail">
          <span>Battery</span>
          <strong>{status ? `${prettyNumber(status.battery)}%` : '--'}</strong>
        </div>
        <div className="topbar-pill topbar-pill-detail">
          <span>Last Sync</span>
          <strong>{isPolling ? 'Refreshing...' : formatRelativeTime(lastUpdatedAt)}</strong>
        </div>
        <button className="ghost-button nav-action" onClick={() => void loadDashboard()} disabled={busy || loading}>
          {loading || busy ? 'Syncing...' : 'Refresh'}
        </button>
        <button className="primary-button nav-action" onClick={logout}>Sign out</button>
      </div>
    </header>
  );
};
