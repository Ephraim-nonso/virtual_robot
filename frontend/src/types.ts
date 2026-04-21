export type RobotState = 'IDLE' | 'MOVING' | 'LOW_BATTERY' | 'STUCK';

export type RobotStatusResponse = {
  id: string;
  position: {
    x: number;
    y: number;
  };
  battery: number;
  status: RobotState;
};

export type MapResponse = {
  width: number;
  height: number;
  grid: number[][];
};

export type SensorResponse = {
  N: number;
  S: number;
  E: number;
  W: number;
  lidar: number[];
};
