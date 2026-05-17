import { getApiBaseUrl, httpRequest } from './httpClient';
import { getStoredAuthToken } from '../../features/auth/lib/authStorage';
import type {
  CommandAuditItem,
  MapResponse,
  RobotStatusResponse,
  SensorResponse,
  StatusAuditItem,
} from '../../types/robot';

export const getStatus = () => httpRequest<RobotStatusResponse>('/api/robot/status');

export const getMap = () => httpRequest<MapResponse>('/api/robot/map');

export const getSensors = () => httpRequest<SensorResponse>('/api/robot/sensor');

export const getCommandAuditLogs = (limit = 10) =>
  httpRequest<{ items: CommandAuditItem[] }>(`/api/audit/commands?limit=${limit}`);

export const getStatusAuditLogs = (limit = 10) =>
  httpRequest<{ items: StatusAuditItem[] }>(`/api/audit/statuses?limit=${limit}`);

export const moveRobot = (x: number, y: number) =>
  httpRequest('/api/robot/move', {
    method: 'POST',
    body: JSON.stringify({ x, y }),
  });

export const resetRobot = () =>
  httpRequest('/api/robot/reset', {
    method: 'POST',
  });

export const getTelemetrySocketUrl = () => {
  const explicitBaseUrl = import.meta.env.VITE_WS_BASE_URL;
  const token = getStoredAuthToken();

  const appendToken = (baseUrl: string) => {
    if (!token) {
      return `${baseUrl.replace(/\/$/, '')}/ws/telemetry`;
    }

    const url = new URL(`${baseUrl.replace(/\/$/, '')}/ws/telemetry`);
    url.searchParams.set('token', token);
    return url.toString();
  };

  if (explicitBaseUrl) {
    return appendToken(explicitBaseUrl);
  }

  const apiBaseUrl = getApiBaseUrl();

  if (apiBaseUrl.startsWith('http')) {
    return appendToken(apiBaseUrl.replace(/^http/, 'ws'));
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const fallbackBaseUrl = `${protocol}//${window.location.host}`;
  return appendToken(fallbackBaseUrl);
};
