import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getMap, getSensors, getStatus, getTelemetrySocketUrl, moveRobot, resetRobot } from '../../../lib/api/robotApi';
import { summarizeLidar } from '../lib/formatters';
import type { TelemetryMessage } from '../types';
import type { MapResponse, RobotStatusResponse, SensorResponse } from '../../../types/robot';

const STATUS_POLL_INTERVAL_MS = 5000;

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
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [lastTelemetryAt, setLastTelemetryAt] = useState<number | null>(null);
  const [telemetryPacketCount, setTelemetryPacketCount] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const hasInitializedTargets = useRef(false);

  const refreshLiveStatus = useCallback(async (options?: { silent?: boolean; preserveError?: boolean }) => {
    const silent = options?.silent ?? false;

    if (!silent) {
      setLoading(true);
      setError(null);
    } else {
      setIsPolling(true);
    }

    try {
      const [nextStatus, nextSensors] = await Promise.all([getStatus(), getSensors()]);

      setStatus(nextStatus);
      setSensors(nextSensors);

      if (!hasInitializedTargets.current) {
        setTargetX(nextStatus.position.x);
        setTargetY(nextStatus.position.y);
        hasInitializedTargets.current = true;
      }

      setLastUpdatedAt(Date.now());

      if (!options?.preserveError) {
        setError(null);
      }
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unable to refresh live robot data.';
      setError(message);
    } finally {
      if (!silent) {
        setLoading(false);
      } else {
        setIsPolling(false);
      }
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [nextMap] = await Promise.all([
        getMap(),
        refreshLiveStatus({ preserveError: true }),
      ]);

      setMap(nextMap);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unable to load robot data.';
      setError(message);
      setLoading(false);
    }
  }, [refreshLiveStatus]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadDashboard]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshLiveStatus({ silent: true });
    }, STATUS_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [refreshLiveStatus]);

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

      setLastTelemetryAt(Date.now());
      setTelemetryPacketCount((count) => count + 1);
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

  const submitMove = useCallback(async () => {
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
  }, [loadDashboard, targetX, targetY]);

  const submitReset = useCallback(async () => {
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
  }, [loadDashboard]);

  const lidarSummary = useMemo(() => summarizeLidar(sensors), [sensors]);
  const connectionHealth = useMemo(() => {
    if (loading) {
      return 'Syncing';
    }

    if (error) {
      return 'Degraded';
    }

    if (telemetryState !== 'Live') {
      return 'Partial';
    }

    if (!lastUpdatedAt) {
      return 'Pending';
    }

    return 'Healthy';
  }, [error, lastUpdatedAt, loading, telemetryState]);

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
    lastUpdatedAt,
    lastTelemetryAt,
    telemetryPacketCount,
    isPolling,
    connectionHealth,
    statusPollIntervalMs: STATUS_POLL_INTERVAL_MS,
    setTargetX,
    setTargetY,
    loadDashboard,
    submitMove,
    submitReset,
  };
};
