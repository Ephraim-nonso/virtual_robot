import { useMemo } from 'react';

import { useDashboardContext } from '../context/useDashboardContext';
import { buildDashboardAlerts } from '../lib/alerts';

export const AlertsPanel = () => {
  const { error, loading, busy, telemetryState, status } = useDashboardContext();

  const alerts = useMemo(
    () => buildDashboardAlerts({ error, loading, busy, telemetryState, status }),
    [busy, error, loading, status, telemetryState],
  );

  return (
    <article className="panel alerts-panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Alerts</p>
          <h2>Mission queue</h2>
        </div>
        <span className="caption">{alerts.length > 0 ? `${alerts.length} active` : 'Clear'}</span>
      </div>

      {alerts.length > 0 ? (
        <div className="alert-list">
          {alerts.map((alert) => (
            <div key={`${alert.title}-${alert.message}`} className={`alert-card ${alert.tone}`}>
              <span className="alert-tone">{alert.tone}</span>
              <strong>{alert.title}</strong>
              <p>{alert.message}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-alert-state">
          <strong>No active operational alerts</strong>
          <p>Telemetry, robot state, and command execution are all currently within expected bounds.</p>
        </div>
      )}
    </article>
  );
};
