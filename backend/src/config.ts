import { fileURLToPath } from 'node:url';
import path from 'node:path';

import 'dotenv/config';

const parseInteger = (value: string | undefined, fallback: number) => {
  const parsedValue = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsedValue) ? fallback : parsedValue;
};

const backendRoot = fileURLToPath(new URL('..', import.meta.url));

export const config = {
  port: parseInteger(process.env.PORT, 4000),
  robotSimUrl: (process.env.ROBOT_SIM_URL ?? 'http://127.0.0.1:5001').replace(/\/$/, ''),
  simulatorRequestTimeoutMs: parseInteger(process.env.SIMULATOR_REQUEST_TIMEOUT_MS, 3000),
  simulatorReadRetryCount: parseInteger(process.env.SIMULATOR_READ_RETRY_COUNT, 2),
  simulatorReadRetryDelayMs: parseInteger(process.env.SIMULATOR_READ_RETRY_DELAY_MS, 400),
  databasePath: process.env.DATABASE_PATH
    ? path.resolve(process.env.DATABASE_PATH)
    : path.join(backendRoot, 'data', 'virtual-robot.db'),
  authUsersFilePath: process.env.AUTH_USERS_FILE_PATH
    ? path.resolve(process.env.AUTH_USERS_FILE_PATH)
    : path.join(backendRoot, 'data', 'users.json'),
  authJwtSecret: process.env.AUTH_JWT_SECRET ?? 'change-me-in-env',
  authTokenExpiry: process.env.AUTH_TOKEN_EXPIRY ?? '8h',
  seedCommanderName: process.env.SEED_COMMANDER_NAME ?? 'Commander',
  seedCommanderEmail: process.env.SEED_COMMANDER_EMAIL ?? 'commander@example.com',
  seedCommanderPassword: process.env.SEED_COMMANDER_PASSWORD ?? 'change-me',
  auditDefaultActor: process.env.AUDIT_DEFAULT_ACTOR ?? 'system',
};
