import {
  listCommandAuditLogs,
  listStatusAuditLogs,
  recordCommandAuditLog,
  recordStatusAuditLog,
} from '../auditLog.js';
import { config } from '../config.js';
import {
  parseRobotStatus,
  simulatorRequest,
  type SimulatorRequestOptions,
} from '../simulatorClient.js';

const simulatorRequestOptions: SimulatorRequestOptions = {
  timeoutMs: config.simulatorRequestTimeoutMs,
  readRetryCount: config.simulatorReadRetryCount,
  readRetryDelayMs: config.simulatorReadRetryDelayMs,
};

const requestSimulator = (path: string, init?: RequestInit) =>
  simulatorRequest(config.robotSimUrl, path, init, simulatorRequestOptions);

const safeAuditWrite = async (description: string, operation: () => Promise<unknown>) => {
  try {
    await operation();
  } catch (error) {
    console.error(`Audit logging failed during ${description}.`, error);
  }
};

const recordStatusSnapshot = async (source: string, payload: unknown) => {
  await safeAuditWrite(`status snapshot for ${source}`, async () => {
    await recordStatusAuditLog({
      source,
      payload: parseRobotStatus(payload),
    });
  });
};

const captureCurrentStatusSnapshot = async (source: string) => {
  try {
    const statusPayload = await requestSimulator('/api/status');
    await recordStatusSnapshot(source, statusPayload);
  } catch (error) {
    console.error(`Unable to capture audit status snapshot for ${source}.`, error);
  }
};

const recordCommandAudit = async (input: {
  commandType: string;
  requestPayload?: unknown;
  resultStatus: 'SUCCEEDED' | 'FAILED';
  responsePayload?: unknown;
  errorMessage?: string;
}) => {
  await safeAuditWrite(`command ${input.commandType}`, async () => {
    await recordCommandAuditLog({
      actor: config.auditDefaultActor,
      ...input,
    });
  });
};

export const getHealthPayload = async () => {
  const upstreamStatus = await requestSimulator('/api/status');
  await recordStatusSnapshot('health', upstreamStatus);

  return {
    ok: true,
    simulatorUrl: config.robotSimUrl,
    upstreamStatus,
  };
};

export const getRobotResource = (path: '/api/status' | '/api/map' | '/api/sensor') =>
  requestSimulator(path);

export const executeRobotCommand = async (input: {
  commandType: string;
  simulatorPath: '/api/move' | '/api/reset';
  requestPayload?: unknown;
  requestInit?: RequestInit;
  statusSnapshotSource: string;
}) => {
  try {
    const responsePayload = await requestSimulator(input.simulatorPath, input.requestInit);
    await recordCommandAudit({
      commandType: input.commandType,
      requestPayload: input.requestPayload,
      responsePayload,
      resultStatus: 'SUCCEEDED',
    });
    await captureCurrentStatusSnapshot(input.statusSnapshotSource);
    return responsePayload;
  } catch (error) {
    await recordCommandAudit({
      commandType: input.commandType,
      requestPayload: input.requestPayload,
      resultStatus: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown command failure.',
    });
    throw error;
  }
};

export const getCommandAuditItems = async (limit?: number) => listCommandAuditLogs(limit);

export const getStatusAuditItems = async (limit?: number) => listStatusAuditLogs(limit);
