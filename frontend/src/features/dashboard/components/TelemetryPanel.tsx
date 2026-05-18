import { useMemo } from 'react';

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

  const telemetryPreview = useMemo(() => {
    if (!telemetry) {
      return 'Waiting for telemetry packets...';
    }

    const lines = JSON.stringify(telemetry, null, 2).split('\n');
    return `${lines.slice(0, 4).join('\n')}${lines.length > 4 ? '\n...' : ''}`;
  }, [telemetry]);

  return (
    <article className="panel telemetry-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Streaming</p>
          <h2>Telemetry</h2>
          <p className="panel-subcopy">{statusMessage}</p>
        </div>
        <span className={`caption telemetry-status-badge ${telemetryStatus}`}>{telemetryState}</span>
      </div>

      <pre className="telemetry-preview-box">{telemetryPreview}</pre>

      <details className="panel-disclosure telemetry-disclosure">
        <summary>{telemetry ? 'Expand full telemetry payload' : 'Telemetry payload unavailable'}</summary>
        <pre className="telemetry-box">
          {telemetry ? JSON.stringify(telemetry, null, 2) : 'Waiting for telemetry packets...'}
        </pre>
      </details>
    </article>
  );
};
