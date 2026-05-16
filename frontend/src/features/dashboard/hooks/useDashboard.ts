import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getMap, getSensors, getStatus, getTelemetrySocketUrl, moveRobot, resetRobot } from '../../../lib/api/robotApi';
import { ApiError } from '../../../lib/api/httpClient';
import { summarizeLidar } from '../lib/formatters';
import type { TelemetryMessage } from '../types';
import type { MapResponse, RobotStatusResponse, SensorResponse } from '../../../types/robot';

const STATUS_POLL_INTERVAL_MS = 5000;
const TELEMETRY_SIGNAL_LOST_MS = 12000;
const TELEMETRY_RECONNECT_BASE_DELAY_MS = 1000;
const TELEMETRY_RECONNECT_MAX_DELAY_MS = 10000;

type BackendStatus = 'syncing' | 'healthy' | 'degraded' | 'unavailable';
type TelemetryStatus = 'connecting' | 'live' | 'reconnecting' | 'signal_lost' | 'unavailable';

const getBackendStatusFromError = (error: unknown): BackendStatus => {
  if (error instanceof ApiError) {
    if (error.status === 504) {
      return 'degraded';
    }

    if (error.status >= 500 || error.status === 503) {
      return 'unavailable';
    }
  }

  return 'unavailable';
};

const getBackendStatusLabel = (status: BackendStatus) => {
  switch (status) {
    case 'syncing':
      return 'Syncing';
    case 'degraded':
      return 'Degraded';
    case 'unavailable':
      return 'Unavailable';
    default:
      return 'Healthy';
  }
};

const getTelemetryStatusLabel = (status: TelemetryStatus) => {
  switch (status) {
    case 'connecting':
      return 'Connecting...';
    case 'reconnecting':
      return 'Reconnecting...';
    case 'signal_lost':
      return 'Signal lost';
    case 'unavailable':
      return 'Unavailable';
    default:
      return 'Live';
  }
};

export const useDashboard = () => {
  const [status, setStatus] = useState<RobotStatusResponse | null>(null);
  const [map, setMap] = useState<MapResponse | null>(null);
  const [sensors, setSensors] = useState<SensorResponse | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryMessage>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('syncing');
  const [backendIssueMessage, setBackendIssueMessage] = useState<string | null>(null);
  const [telemetryStatus, setTelemetryStatus] = useState<TelemetryStatus>('connecting');
  const [telemetryIssueMessage, setTelemetryIssueMessage] = useState<string | null>(null);
  const [targetX, setTargetX] = useState(0);
  const [targetY, setTargetY] = useState(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [lastTelemetryAt, setLastTelemetryAt] = useState<number | null>(null);
  const [telemetryPacketCount, setTelemetryPacketCount] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const [telemetryReconnectAttempt, setTelemetryReconnectAttempt] = useState(0);
  const hasInitializedTargets = useRef(false);
  const liveStatusRequestInFlightRef = useRef(false);
  const lastTelemetryAtRef = useRef<number | null>(null);
  const telemetryReconnectAttemptRef = useRef(0);
  const telemetryIssueMessageRef = useRef<string | null>(null);

  const refreshLiveStatus = useCallback(async (options?: { silent?: boolean; preserveError?: boolean }) => {
    const silent = options?.silent ?? false;

    if (silent && liveStatusRequestInFlightRef.current) {
      return;
    }

    liveStatusRequestInFlightRef.current = true;

    if (!silent) {
      setLoading(true);
      setError(null);
      setBackendStatus('syncing');
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
      setBackendStatus('healthy');
      setBackendIssueMessage(null);

      if (!options?.preserveError) {
        setError(null);
      }
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unable to refresh live robot data.';
      const nextBackendStatus = getBackendStatusFromError(requestError);
      setBackendStatus(nextBackendStatus);
      setBackendIssueMessage(message);

      if (!silent) {
        setError(message);
      }
    } finally {
      liveStatusRequestInFlightRef.current = false;

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
      setBackendStatus(getBackendStatusFromError(requestError));
      setBackendIssueMessage(message);
      setError(message);
      setLoading(false);
    }
  }, [refreshLiveStatus]);

  useEffect(() => {
    telemetryReconnectAttemptRef.current = telemetryReconnectAttempt;
  }, [telemetryReconnectAttempt]);

  useEffect(() => {
    telemetryIssueMessageRef.current = telemetryIssueMessage;
  }, [telemetryIssueMessage]);

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
    let isDisposed = false;
    let socket: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let signalTimer: number | null = null;
    let receivedTelemetryAtLeastOnce = false;

    const clearReconnectTimer = () => {
      if (reconnectTimer !== null) {
        window.clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const clearSignalTimer = () => {
      if (signalTimer !== null) {
        window.clearInterval(signalTimer);
        signalTimer = null;
      }
    };

    const cleanupSocket = () => {
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;

        if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
          socket.close();
        }

        socket = null;
      }
    };

    const scheduleReconnect = (nextStatus: TelemetryStatus, reason?: string) => {
      if (isDisposed) {
        return;
      }

      const nextAttempt = telemetryReconnectAttemptRef.current + 1;
      const delay = Math.min(
        TELEMETRY_RECONNECT_BASE_DELAY_MS * 2 ** Math.max(0, nextAttempt - 1),
        TELEMETRY_RECONNECT_MAX_DELAY_MS,
      );

      setTelemetryReconnectAttempt(nextAttempt);
      setTelemetryStatus(nextStatus);

      if (reason) {
        telemetryIssueMessageRef.current = reason;
        setTelemetryIssueMessage(reason);
      }

      clearReconnectTimer();
      reconnectTimer = window.setTimeout(() => {
        connectTelemetry();
      }, delay);
    };

    const connectTelemetry = () => {
      if (isDisposed) {
        return;
      }

      cleanupSocket();
      clearSignalTimer();

      setTelemetryStatus(telemetryReconnectAttemptRef.current > 0 ? 'reconnecting' : 'connecting');
      socket = new WebSocket(getTelemetrySocketUrl());

      socket.onopen = () => {
        setTelemetryReconnectAttempt(0);
        setTelemetryStatus('live');
        telemetryIssueMessageRef.current = null;
        setTelemetryIssueMessage(null);
        lastTelemetryAtRef.current = Date.now();

        clearSignalTimer();
        signalTimer = window.setInterval(() => {
          const lastSeenAt = lastTelemetryAtRef.current;

          if (!lastSeenAt) {
            return;
          }

          if (Date.now() - lastSeenAt > TELEMETRY_SIGNAL_LOST_MS) {
            telemetryIssueMessageRef.current = 'Telemetry packets stopped arriving from the backend stream.';
            setTelemetryStatus('signal_lost');
            setTelemetryIssueMessage('Telemetry packets stopped arriving from the backend stream.');
            cleanupSocket();
            scheduleReconnect('signal_lost');
          }
        }, 1000);
      };

      socket.onmessage = (event) => {
        try {
          const parsedMessage = JSON.parse(event.data as string) as Record<string, unknown>;

          if (parsedMessage.type === 'backend_error') {
            telemetryIssueMessageRef.current =
              typeof parsedMessage.message === 'string'
                ? parsedMessage.message
                : 'Telemetry proxy reported an upstream backend issue.';
            setTelemetryIssueMessage(
              typeof parsedMessage.message === 'string'
                ? parsedMessage.message
                : 'Telemetry proxy reported an upstream backend issue.',
            );
            setTelemetryStatus('unavailable');
            return;
          }

          setTelemetry(parsedMessage);
        } catch {
          setTelemetry({ raw: String(event.data) });
        }

        const now = Date.now();
        receivedTelemetryAtLeastOnce = true;
        lastTelemetryAtRef.current = now;
        setLastTelemetryAt(now);
        setTelemetryPacketCount((count) => count + 1);
        setTelemetryStatus('live');
      };

      socket.onerror = () => {
        if (!receivedTelemetryAtLeastOnce) {
          telemetryIssueMessageRef.current = 'Unable to establish the telemetry websocket connection.';
          setTelemetryIssueMessage('Unable to establish the telemetry websocket connection.');
        }
      };

      socket.onclose = () => {
        clearSignalTimer();

        if (isDisposed) {
          return;
        }

        const nextStatus = receivedTelemetryAtLeastOnce ? 'reconnecting' : 'unavailable';
        scheduleReconnect(
          nextStatus,
          telemetryIssueMessageRef.current ?? 'Telemetry connection closed unexpectedly.',
        );
      };
    };

    connectTelemetry();

    return () => {
      isDisposed = true;
      clearReconnectTimer();
      clearSignalTimer();
      cleanupSocket();
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
  const telemetryState = useMemo(() => getTelemetryStatusLabel(telemetryStatus), [telemetryStatus]);
  const backendState = useMemo(() => getBackendStatusLabel(backendStatus), [backendStatus]);
  const connectionHealth = useMemo(() => {
    if (loading) {
      return 'Syncing';
    }

    if (backendStatus === 'unavailable') {
      return 'Backend unavailable';
    }

    if (backendStatus === 'degraded') {
      return 'Degraded';
    }

    if (telemetryStatus === 'signal_lost') {
      return 'Signal lost';
    }

    if (telemetryStatus === 'reconnecting') {
      return 'Reconnecting';
    }

    if (telemetryStatus === 'unavailable') {
      return 'Telemetry unavailable';
    }

    if (telemetryStatus !== 'live') {
      return 'Partial';
    }

    if (!lastUpdatedAt) {
      return 'Pending';
    }

    return 'Healthy';
  }, [backendStatus, lastUpdatedAt, loading, telemetryStatus]);

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
    backendStatus,
    backendState,
    backendIssueMessage,
    telemetryStatus,
    statusPollIntervalMs: STATUS_POLL_INTERVAL_MS,
    telemetrySignalLostMs: TELEMETRY_SIGNAL_LOST_MS,
    telemetryReconnectAttempt,
    telemetryIssueMessage,
    setTargetX,
    setTargetY,
    loadDashboard,
    submitMove,
    submitReset,
  };
};
