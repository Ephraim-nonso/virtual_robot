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

export type CommandAuditItem = {
  id: number;
  createdAt: string;
  actor: string;
  commandType: string;
  requestPayload: string | null;
  resultStatus: 'SUCCEEDED' | 'FAILED';
  responsePayload: string | null;
  errorMessage: string | null;
};

export type StatusAuditItem = {
  id: number;
  createdAt: string;
  source: string;
  robotId: string;
  positionX: number;
  positionY: number;
  battery: number;
  robotStatus: RobotState;
  rawPayload: string;
};
