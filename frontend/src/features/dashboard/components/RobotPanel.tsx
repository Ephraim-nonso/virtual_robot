import type { FormEvent } from 'react';

import { prettyNumber } from '../lib/formatters';
import { useDashboardContext } from '../context/useDashboardContext';

export const RobotPanel = () => {
  const {
    status,
    busy,
    loading,
    targetX,
    targetY,
    setTargetX,
    setTargetY,
    loadDashboard,
    submitMove,
    submitReset,
  } = useDashboardContext();

  const handleMove = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitMove();
  };

  return (
    <article className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Robot</p>
          <h2>Current state</h2>
        </div>
        <button className="ghost-button" onClick={() => void loadDashboard()} disabled={busy || loading}>
          Refresh
        </button>
      </div>

      {status ? (
        <div className="stats-grid">
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
            <span>Mode</span>
            <strong>{status.status}</strong>
          </div>
        </div>
      ) : null}

      <form className="control-form" onSubmit={(event) => void handleMove(event)}>
        <label>
          Target X
          <input
            type="number"
            min="0"
            max="20"
            value={targetX}
            onChange={(event) => setTargetX(Number(event.target.value))}
          />
        </label>
        <label>
          Target Y
          <input
            type="number"
            min="0"
            max="20"
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
