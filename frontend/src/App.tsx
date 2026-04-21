import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';

import { getMap, getSensors, getStatus, getTelemetrySocketUrl, moveRobot, resetRobot } from './api';
import type { MapResponse, RobotStatusResponse, SensorResponse } from './types';
import './App.css';

type TelemetryMessage = Record<string, unknown> | null;

const prettyNumber = (value: number) => value.toFixed(1).replace(/\.0$/, '');

function App() {
  const [status, setStatus] = useState<RobotStatusResponse | null>(null);
  const [map, setMap] = useState<MapResponse | null>(null);
  const [sensors, setSensors] = useState<SensorResponse | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryMessage>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [telemetryState, setTelemetryState] = useState('Connecting...');
  const [targetX, setTargetX] = useState(0);
  const [targetY, setTargetY] = useState(0);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);

    try {
      const [nextStatus, nextMap, nextSensors] = await Promise.all([
        getStatus(),
        getMap(),
        getSensors(),
      ]);

      setStatus(nextStatus);
      setMap(nextMap);
      setSensors(nextSensors);
      setTargetX(nextStatus.position.x);
      setTargetY(nextStatus.position.y);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unable to load robot data.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const socket = new WebSocket(getTelemetrySocketUrl());

    socket.addEventListener('open', () => {
      setTelemetryState('Live');
    });

    socket.addEventListener('message', (event) => {
      try {
        setTelemetry(JSON.parse(event.data as string) as Record<string, unknown>);
      } catch {
        setTelemetry({ raw: String(event.data) });
      }
    });

    socket.addEventListener('close', () => {
      setTelemetryState('Disconnected');
    });

    socket.addEventListener('error', () => {
      setTelemetryState('Unavailable');
    });

    return () => {
      socket.close();
    };
  }, []);

  const handleMove = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await moveRobot(targetX, targetY);
      await loadDashboard();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unable to move robot.';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async () => {
    setBusy(true);
    setError(null);

    try {
      await resetRobot();
      await loadDashboard();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unable to reset simulation.';
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const lidarSummary = useMemo(() => {
    if (!sensors || sensors.lidar.length === 0) {
      return { min: 0, max: 0, average: 0 };
    }

    const min = Math.min(...sensors.lidar);
    const max = Math.max(...sensors.lidar);
    const average = sensors.lidar.reduce((sum, reading) => sum + reading, 0) / sensors.lidar.length;

    return { min, max, average };
  }, [sensors]);

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Virtual Robot Management</p>
          <h1>Operate the simulator through your own backend API.</h1>
          <p className="lede">
            The frontend talks only to your backend, and the backend proxies the Docker-hosted robot
            simulator on your behalf.
          </p>
        </div>
        <div className="hero-metrics">
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
        </div>
      </section>

      {error ? <div className="banner error">{error}</div> : null}
      {loading ? <div className="banner">Loading robot state...</div> : null}

      <section className="dashboard-grid">
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

          <form className="control-form" onSubmit={handleMove}>
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

          <button className="secondary-button" onClick={handleReset} disabled={busy || loading}>
            Reset simulation
          </button>
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Environment</p>
              <h2>Map</h2>
            </div>
            <span className="caption">
              {map ? `${map.width} x ${map.height}` : 'Waiting for simulator'}
            </span>
          </div>

          {map && status ? (
            <div className="map-grid" style={{ gridTemplateColumns: `repeat(${map.width}, minmax(0, 1fr))` }}>
              {map.grid.flatMap((row, y) =>
                row.map((cell, x) => {
                  const isRobot = status.position.x === x && status.position.y === y;
                  const className = isRobot ? 'map-cell robot' : cell === 1 ? 'map-cell obstacle' : 'map-cell';

                  return <span key={`${x}-${y}`} className={className} title={`(${x}, ${y})`} />;
                }),
              )}
            </div>
          ) : (
            <p className="empty-state">Map data will appear here once the backend reaches the simulator.</p>
          )}
        </article>

        <article className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Sensors</p>
              <h2>Obstacle awareness</h2>
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
      </section>
    </main>
  );
}

export default App;
