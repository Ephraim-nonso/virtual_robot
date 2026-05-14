import { formatRelativeTime, prettyNumber } from '../lib/formatters';
import { useDashboardContext } from '../context/useDashboardContext';

export const SensorPanel = () => {
  const { sensors, lidarSummary, lastUpdatedAt, statusPollIntervalMs, isPolling } = useDashboardContext();

  return (
    <article className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Sensors</p>
          <h2>Obstacle awareness</h2>
          <p className="panel-subcopy">
            {isPolling
              ? 'Polling sensor status...'
              : `Auto refresh every ${Math.round(statusPollIntervalMs / 1000)}s, last sync ${formatRelativeTime(lastUpdatedAt)}`}
          </p>
        </div>
        <span className="caption">{sensors ? `${sensors.lidar.length} lidar samples` : 'No data yet'}</span>
      </div>

      {sensors ? (
        <>
          <div className="stats-grid">
            <div className="stat-box">
              <span>North</span>
              <strong>{prettyNumber(sensors.N)}</strong>
            </div>
            <div className="stat-box">
              <span>South</span>
              <strong>{prettyNumber(sensors.S)}</strong>
            </div>
            <div className="stat-box">
              <span>East</span>
              <strong>{prettyNumber(sensors.E)}</strong>
            </div>
            <div className="stat-box">
              <span>West</span>
              <strong>{prettyNumber(sensors.W)}</strong>
            </div>
          </div>
          <div className="stats-grid compact">
            <div className="stat-box">
              <span>Lidar min</span>
              <strong>{prettyNumber(lidarSummary.min)}</strong>
            </div>
            <div className="stat-box">
              <span>Lidar avg</span>
              <strong>{prettyNumber(lidarSummary.average)}</strong>
            </div>
            <div className="stat-box">
              <span>Lidar max</span>
              <strong>{prettyNumber(lidarSummary.max)}</strong>
            </div>
          </div>
        </>
      ) : (
        <p className="empty-state">Sensor data unavailable.</p>
      )}
    </article>
  );
};
