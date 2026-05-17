import type { SensorResponse } from '../../../types/robot';

export const prettyNumber = (value: number) => value.toFixed(1).replace(/\.0$/, '');

export const formatRelativeTime = (timestamp: number | null) => {
  if (!timestamp) {
    return 'Waiting';
  }

  const secondsAgo = Math.max(0, Math.round((Date.now() - timestamp) / 1000));

  if (secondsAgo < 5) {
    return 'Just now';
  }

  if (secondsAgo < 60) {
    return `${secondsAgo}s ago`;
  }

  const minutesAgo = Math.round(secondsAgo / 60);
  return `${minutesAgo}m ago`;
};

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

export const parseJsonText = (value: string | null) => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
};

export const summarizeLidar = (sensors: SensorResponse | null) => {
  if (!sensors || sensors.lidar.length === 0) {
    return { min: 0, max: 0, average: 0 };
  }

  const min = Math.min(...sensors.lidar);
  const max = Math.max(...sensors.lidar);
  const average = sensors.lidar.reduce((sum, reading) => sum + reading, 0) / sensors.lidar.length;

  return { min, max, average };
};
