import { useDashboardContext } from '../context/useDashboardContext';

export const TelemetryPanel = () => {
  const { telemetry, telemetryState } = useDashboardContext();

  return (
    <article className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Streaming</p>
          <h2>Telemetry</h2>
        </div>
        <span className="caption">{telemetryState}</span>
      </div>

      <pre className="telemetry-box">
        {telemetry ? JSON.stringify(telemetry, null, 2) : 'Waiting for telemetry packets...'}
      </pre>
    </article>
  );
};
