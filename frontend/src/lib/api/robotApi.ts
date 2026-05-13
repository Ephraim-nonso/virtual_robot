import { getApiBaseUrl, httpRequest } from './httpClient';
import type { MapResponse, RobotStatusResponse, SensorResponse } from '../../types/robot';

export const getStatus = () => httpRequest<RobotStatusResponse>('/api/robot/status');

export const getMap = () => httpRequest<MapResponse>('/api/robot/map');

export const getSensors = () => httpRequest<SensorResponse>('/api/robot/sensor');

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
  if (explicitBaseUrl) {
    return `${explicitBaseUrl.replace(/\/$/, '')}/ws/telemetry`;
  }

  const apiBaseUrl = getApiBaseUrl();

  if (apiBaseUrl.startsWith('http')) {
    return `${apiBaseUrl.replace(/^http/, 'ws')}/ws/telemetry`;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/telemetry`;
};
