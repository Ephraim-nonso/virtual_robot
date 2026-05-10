import path from 'node:path';

import 'dotenv/config';

const parseInteger = (value: string | undefined, fallback: number) => {
  const parsedValue = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsedValue) ? fallback : parsedValue;
};

export const config = {
  port: parseInteger(process.env.PORT, 4000),
  robotSimUrl: (process.env.ROBOT_SIM_URL ?? 'http://127.0.0.1:5001').replace(/\/$/, ''),
  simulatorRequestTimeoutMs: parseInteger(process.env.SIMULATOR_REQUEST_TIMEOUT_MS, 3000),
  simulatorReadRetryCount: parseInteger(process.env.SIMULATOR_READ_RETRY_COUNT, 2),
  simulatorReadRetryDelayMs: parseInteger(process.env.SIMULATOR_READ_RETRY_DELAY_MS, 400),
  databasePath: path.resolve(process.cwd(), process.env.DATABASE_PATH ?? 'data/virtual-robot.db'),
  auditDefaultActor: process.env.AUDIT_DEFAULT_ACTOR ?? 'system',
};
