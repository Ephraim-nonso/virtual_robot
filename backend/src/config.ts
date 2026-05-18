import 'dotenv/config';

const parseInteger = (value: string | undefined, fallback: number) => {
  const parsedValue = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsedValue) ? fallback : parsedValue;
};

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

const resolveRobotSimulatorUrl = () => {
  const directUrl = process.env.ROBOT_SIM_URL?.replace(/\/$/, '');

  if (directUrl) {
    return directUrl;
  }

  const hostPort = process.env.ROBOT_SIM_HOSTPORT?.trim();

  if (hostPort) {
    return `http://${hostPort.replace(/\/$/, '')}`;
  }

  const host = process.env.ROBOT_SIM_HOST?.trim();
  const port = process.env.ROBOT_SIM_PORT?.trim();

  if (host && port) {
    return `http://${host}:${port}`;
  }

  return 'http://127.0.0.1:5001';
};

export const config = {
  port: parseInteger(process.env.PORT, 4000),
  host: process.env.HOST ?? '0.0.0.0',
  robotSimUrl: resolveRobotSimulatorUrl(),
  simulatorRequestTimeoutMs: parseInteger(process.env.SIMULATOR_REQUEST_TIMEOUT_MS, 3000),
  simulatorReadRetryCount: parseInteger(process.env.SIMULATOR_READ_RETRY_COUNT, 2),
  simulatorReadRetryDelayMs: parseInteger(process.env.SIMULATOR_READ_RETRY_DELAY_MS, 400),
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@127.0.0.1:5432/virtual_robot_management',
  databaseSsl: parseBoolean(process.env.DATABASE_SSL, false),
  authJwtSecret: process.env.AUTH_JWT_SECRET ?? 'change-me-in-env',
  authTokenExpiry: process.env.AUTH_TOKEN_EXPIRY ?? '8h',
  seedCommanderName: process.env.SEED_COMMANDER_NAME ?? 'Commander',
  seedCommanderEmail: process.env.SEED_COMMANDER_EMAIL ?? 'commander@example.com',
  seedCommanderPassword: process.env.SEED_COMMANDER_PASSWORD ?? 'change-me',
  auditDefaultActor: process.env.AUDIT_DEFAULT_ACTOR ?? 'system',
};
