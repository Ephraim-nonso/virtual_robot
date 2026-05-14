import { formatRelativeTime, prettyNumber } from '../lib/formatters';
import { useDashboardContext } from '../context/useDashboardContext';

export const DashboardHeader = () => {
  const { status, busy, loading, loadDashboard, connectionHealth, lastUpdatedAt, isPolling } = useDashboardContext();

  return (
    <section className="dashboard-command-bar panel">
      <div>
        <p className="eyebrow">Mission Control</p>
        <h2>Ground Control Dashboard</h2>
        <p className="command-copy">
          Live robot status refreshes automatically while telemetry and controls remain available on demand.
        </p>
      </div>

      <div className="command-status-cluster">
        <div className="command-status-pill">
          <span>Connection</span>
          <strong>{connectionHealth}</strong>
        </div>
        <div className="command-status-pill">
          <span>Robot State</span>
          <strong>{status?.status ?? '--'}</strong>
        </div>
        <div className="command-status-pill">
          <span>Battery</span>
          <strong>{status ? `${prettyNumber(status.battery)}%` : '--'}</strong>
        </div>
        <div className="command-status-pill">
          <span>Last Sync</span>
          <strong>{isPolling ? 'Refreshing...' : formatRelativeTime(lastUpdatedAt)}</strong>
        </div>
        <button className="ghost-button" onClick={() => void loadDashboard()} disabled={busy || loading}>
          {loading ? 'Syncing...' : 'Refresh status'}
        </button>
      </div>
    </section>
  );
};
