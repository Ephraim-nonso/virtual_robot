import type { SensorResponse } from '../../../types/robot';

export const prettyNumber = (value: number) => value.toFixed(1).replace(/\.0$/, '');

export const summarizeLidar = (sensors: SensorResponse | null) => {
  if (!sensors || sensors.lidar.length === 0) {
    return { min: 0, max: 0, average: 0 };
  }

  const min = Math.min(...sensors.lidar);
  const max = Math.max(...sensors.lidar);
  const average = sensors.lidar.reduce((sum, reading) => sum + reading, 0) / sensors.lidar.length;

  return { min, max, average };
};
