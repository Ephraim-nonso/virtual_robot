import { z } from 'zod';

const moveSchema = z.object({
  x: z.number().int().min(0).max(20),
  y: z.number().int().min(0).max(20),
});

const robotStatusSchema = z.object({
  id: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  battery: z.number(),
  status: z.string(),
});
export type RobotStatusPayload = z.infer<typeof robotStatusSchema>;

export class SimulatorHttpError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, payload: unknown) {
    super(`Simulator request failed with status ${status}`);
    this.status = status;
    this.payload = payload;
  }
}

export class SimulatorConnectionError extends Error {
  attempts: number;
  timedOut: boolean;

  constructor({
    message = 'Unable to reach the robot simulator.',
    attempts = 1,
    timedOut = false,
  }: {
    message?: string;
    attempts?: number;
    timedOut?: boolean;
  } = {}) {
    super(message);
    this.attempts = attempts;
    this.timedOut = timedOut;
  }
}

export const validateMoveCommand = (payload: unknown) => moveSchema.parse(payload);
export const parseRobotStatus = (payload: unknown): RobotStatusPayload =>
  robotStatusSchema.parse(payload);

export const toSimulatorWsUrl = (simulatorBaseUrl: string) =>
  simulatorBaseUrl.replace(/^http/, 'ws');

export type SimulatorRequestOptions = {
  timeoutMs: number;
  readRetryCount: number;
  readRetryDelayMs: number;
};

const RETRYABLE_STATUS_CODES = new Set([502, 503, 504]);
const DEFAULT_REQUEST_OPTIONS: SimulatorRequestOptions = {
  timeoutMs: 3000,
  readRetryCount: 2,
  readRetryDelayMs: 400,
};

const sleep = (delayMs: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

const isSafeReadRequest = (method?: string) => {
  const normalizedMethod = (method ?? 'GET').toUpperCase();
  return normalizedMethod === 'GET' || normalizedMethod === 'HEAD';
};

const isAbortError = (error: unknown) =>
  error instanceof Error && error.name === 'AbortError';

const resolveRequestOptions = (
  options?: Partial<SimulatorRequestOptions>,
): SimulatorRequestOptions => ({
  timeoutMs: options?.timeoutMs ?? DEFAULT_REQUEST_OPTIONS.timeoutMs,
  readRetryCount: options?.readRetryCount ?? DEFAULT_REQUEST_OPTIONS.readRetryCount,
  readRetryDelayMs:
    options?.readRetryDelayMs ?? DEFAULT_REQUEST_OPTIONS.readRetryDelayMs,
});

const buildRequestInit = (init?: RequestInit): RequestInit => ({
  ...init,
  headers: {
    ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    ...(init?.headers ?? {}),
  },
});

const createConnectionError = (
  error: unknown,
  attempt: number,
  timeoutMs: number,
) =>
  new SimulatorConnectionError({
    attempts: attempt,
    timedOut: isAbortError(error),
    message: isAbortError(error)
      ? `Robot simulator request timed out after ${timeoutMs}ms.`
      : error instanceof Error
        ? error.message
        : 'Unable to reach the robot simulator.',
  });

const createTimedFetch = async (
  url: string,
  init: RequestInit | undefined,
  timeoutMs: number,
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
};

const parseResponse = async (response: Response) => {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text.length > 0 ? text : null;
};

export const simulatorRequest = async (
  simulatorBaseUrl: string,
  path: string,
  init?: RequestInit,
  options?: Partial<SimulatorRequestOptions>,
) => {
  const requestOptions = resolveRequestOptions(options);
  const method = (init?.method ?? 'GET').toUpperCase();
  const retryCount = isSafeReadRequest(method) ? requestOptions.readRetryCount : 0;
  let attempt = 0;
  let lastError: SimulatorConnectionError | SimulatorHttpError | null = null;

  while (attempt <= retryCount) {
    attempt += 1;

    try {
      const response = await createTimedFetch(
        `${simulatorBaseUrl}${path}`,
        buildRequestInit(init),
        requestOptions.timeoutMs,
      );

      const payload = await parseResponse(response);

      if (!response.ok) {
        const httpError = new SimulatorHttpError(response.status, payload);

        if (attempt <= retryCount && RETRYABLE_STATUS_CODES.has(response.status)) {
          lastError = httpError;
          await sleep(requestOptions.readRetryDelayMs);
          continue;
        }

        throw httpError;
      }

      return payload;
    } catch (error) {
      if (error instanceof SimulatorHttpError) {
        throw error;
      }

      lastError = createConnectionError(error, attempt, requestOptions.timeoutMs);

      if (attempt <= retryCount) {
        await sleep(requestOptions.readRetryDelayMs);
        continue;
      }

      throw lastError;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new SimulatorConnectionError();
};
