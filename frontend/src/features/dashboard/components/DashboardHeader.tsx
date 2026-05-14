import { prettyNumber } from '../lib/formatters';
import { useDashboardContext } from '../context/useDashboardContext';

export const DashboardHeader = () => {
  const { status, telemetryState, busy, loading, loadDashboard } = useDashboardContext();

  const connectionLabel = loading ? 'Syncing' : telemetryState === 'Live' ? 'Nominal' : 'Attention';

  return (
    <section className="dashboard-command-bar panel">
      <div>
        <p className="eyebrow">Mission Control</p>
        <h2>Ground Control Dashboard</h2>
      </div>

      <div className="command-status-cluster">
        <div className="command-status-pill">
          <span>Connection</span>
          <strong>{connectionLabel}</strong>
        </div>
        <div className="command-status-pill">
          <span>Robot State</span>
          <strong>{status?.status ?? '--'}</strong>
        </div>
        <div className="command-status-pill">
          <span>Battery</span>
          <strong>{status ? `${prettyNumber(status.battery)}%` : '--'}</strong>
        </div>
        <button className="ghost-button" onClick={() => void loadDashboard()} disabled={busy || loading}>
          {loading ? 'Syncing...' : 'Refresh shell'}
        </button>
      </div>
    </section>
  );
};
