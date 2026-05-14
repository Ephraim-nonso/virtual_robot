import type { FormEvent } from 'react';

import { formatRelativeTime, prettyNumber } from '../lib/formatters';
import { useDashboardContext } from '../context/useDashboardContext';

export const RobotPanel = () => {
  const {
    status,
    map,
    busy,
    loading,
    targetX,
    targetY,
    setTargetX,
    setTargetY,
    loadDashboard,
    submitMove,
    submitReset,
    connectionHealth,
    lastUpdatedAt,
    isPolling,
  } = useDashboardContext();

  const handleMove = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitMove();
  };

  return (
    <article className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Commander Controls</p>
          <h2>Move and reset</h2>
          <p className="panel-subcopy">
            {isPolling ? 'Refreshing live robot status...' : `Last synced ${formatRelativeTime(lastUpdatedAt)}`}
          </p>
        </div>
        <button className="ghost-button" onClick={() => void loadDashboard()} disabled={busy || loading}>
          Refresh
        </button>
      </div>

      {status ? (
        <div className="stats-grid status-grid">
          <div className="stat-box">
            <span>Robot ID</span>
            <strong>{status.id}</strong>
          </div>
          <div className="stat-box">
            <span>Position</span>
            <strong>
              ({status.position.x}, {status.position.y})
            </strong>
          </div>
          <div className="stat-box">
            <span>Battery</span>
            <strong>{prettyNumber(status.battery)}%</strong>
          </div>
          <div className="stat-box">
            <span>Robot State</span>
            <strong>{status.status}</strong>
          </div>
          <div className="stat-box">
            <span>Connection Health</span>
            <strong>{connectionHealth}</strong>
          </div>
        </div>
      ) : null}

      <div className="control-callout">
        <strong>Control endpoints</strong>
        <p>
          Send move commands to `POST /api/robot/move` and reset the simulator with `POST /api/robot/reset`.
        </p>
      </div>

      <form className="control-form" onSubmit={(event) => void handleMove(event)}>
        <label>
          Target X
          <input
            type="number"
            min="0"
            max={map ? Math.max(0, map.width - 1) : undefined}
            value={targetX}
            onChange={(event) => setTargetX(Number(event.target.value))}
          />
        </label>
        <label>
          Target Y
          <input
            type="number"
            min="0"
            max={map ? Math.max(0, map.height - 1) : undefined}
            value={targetY}
            onChange={(event) => setTargetY(Number(event.target.value))}
          />
        </label>
        <button type="submit" disabled={busy || loading}>
          {busy ? 'Sending...' : 'Move robot'}
        </button>
      </form>

      <button className="secondary-button" onClick={() => void submitReset()} disabled={busy || loading}>
        Reset simulation
      </button>
    </article>
  );
};
