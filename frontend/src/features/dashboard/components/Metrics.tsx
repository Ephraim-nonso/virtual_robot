import { prettyNumber } from '../lib/formatters';
import { useDashboardContext } from '../context/useDashboardContext';

export const DashboardMetrics = () => {
  const { telemetryState, status } = useDashboardContext();

  return (
    <>
      <div className="metric-card">
        <span>Telemetry</span>
        <strong>{telemetryState}</strong>
      </div>
      <div className="metric-card">
        <span>Battery</span>
        <strong>{status ? `${prettyNumber(status.battery)}%` : '--'}</strong>
      </div>
      <div className="metric-card">
        <span>Status</span>
        <strong>{status?.status ?? '--'}</strong>
      </div>
    </>
  );
};
