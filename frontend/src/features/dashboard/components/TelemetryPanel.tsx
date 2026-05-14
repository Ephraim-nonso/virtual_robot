import { formatRelativeTime } from '../lib/formatters';
import { useDashboardContext } from '../context/useDashboardContext';

export const TelemetryPanel = () => {
  const { telemetry, telemetryState, lastTelemetryAt, telemetryPacketCount } = useDashboardContext();

  return (
    <article className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Streaming</p>
          <h2>Telemetry</h2>
          <p className="panel-subcopy">
            {telemetryPacketCount > 0
              ? `${telemetryPacketCount} packets received, latest ${formatRelativeTime(lastTelemetryAt)}`
              : 'Waiting for the first telemetry packet'}
          </p>
        </div>
        <span className="caption">{telemetryState}</span>
      </div>

      <pre className="telemetry-box">
        {telemetry ? JSON.stringify(telemetry, null, 2) : 'Waiting for telemetry packets...'}
      </pre>
    </article>
  );
};
