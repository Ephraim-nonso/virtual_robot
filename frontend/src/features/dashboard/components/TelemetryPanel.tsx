import { formatRelativeTime } from '../lib/formatters';
import { useDashboardContext } from '../context/useDashboardContext';

export const TelemetryPanel = () => {
  const {
    telemetry,
    telemetryState,
    telemetryStatus,
    lastTelemetryAt,
    telemetryPacketCount,
    telemetryReconnectAttempt,
    telemetryIssueMessage,
  } = useDashboardContext();

  const statusMessage =
    telemetryStatus === 'reconnecting'
      ? `Reconnect attempt ${telemetryReconnectAttempt} in progress`
      : telemetryStatus === 'signal_lost'
        ? telemetryIssueMessage ?? 'Telemetry signal lost. Recovering stream...'
        : telemetryStatus === 'unavailable'
          ? telemetryIssueMessage ?? 'Telemetry stream is unavailable.'
          : telemetryPacketCount > 0
            ? `${telemetryPacketCount} packets received, latest ${formatRelativeTime(lastTelemetryAt)}`
            : 'Waiting for the first telemetry packet';

  return (
    <article className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Streaming</p>
          <h2>Telemetry</h2>
          <p className="panel-subcopy">{statusMessage}</p>
        </div>
        <span className={`caption telemetry-status-badge ${telemetryStatus}`}>{telemetryState}</span>
      </div>

      <pre className="telemetry-box">
        {telemetry ? JSON.stringify(telemetry, null, 2) : 'Waiting for telemetry packets...'}
      </pre>
    </article>
  );
};
