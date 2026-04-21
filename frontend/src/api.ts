import type { MapResponse, RobotStatusResponse, SensorResponse } from './types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
};

export const getStatus = () => request<RobotStatusResponse>('/api/robot/status');

export const getMap = () => request<MapResponse>('/api/robot/map');

export const getSensors = () => request<SensorResponse>('/api/robot/sensor');

export const moveRobot = (x: number, y: number) =>
  request('/api/robot/move', {
    method: 'POST',
    body: JSON.stringify({ x, y }),
  });

export const resetRobot = () =>
  request('/api/robot/reset', {
    method: 'POST',
  });

export const getTelemetrySocketUrl = () => {
  const explicitBaseUrl = import.meta.env.VITE_WS_BASE_URL;
  if (explicitBaseUrl) {
    return `${explicitBaseUrl.replace(/\/$/, '')}/ws/telemetry`;
  }

  if (API_BASE_URL.startsWith('http')) {
    return `${API_BASE_URL.replace(/^http/, 'ws')}/ws/telemetry`;
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/telemetry`;
};
