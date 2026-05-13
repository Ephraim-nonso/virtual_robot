import { useEffect, useMemo, useState } from 'react';

import { getMap, getSensors, getStatus, getTelemetrySocketUrl, moveRobot, resetRobot } from '../../../lib/api/robotApi';
import { summarizeLidar } from '../lib/formatters';
import type { TelemetryMessage } from '../types';
import type { MapResponse, RobotStatusResponse, SensorResponse } from '../../../types/robot';

export const useDashboard = () => {
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

  const submitMove = async () => {
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

  const submitReset = async () => {
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

  const lidarSummary = useMemo(() => summarizeLidar(sensors), [sensors]);

  return {
    status,
    map,
    sensors,
    telemetry,
    error,
    loading,
    busy,
    telemetryState,
    targetX,
    targetY,
    lidarSummary,
    setTargetX,
    setTargetY,
    loadDashboard,
    submitMove,
    submitReset,
  };
};
