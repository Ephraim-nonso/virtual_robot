import { z } from 'zod';

const moveSchema = z.object({
  x: z.number().int().min(0).max(20),
  y: z.number().int().min(0).max(20),
});

export class SimulatorHttpError extends Error {
  status: number;
  payload: unknown;

  constructor(status: number, payload: unknown) {
    super(`Simulator request failed with status ${status}`);
    this.status = status;
    this.payload = payload;
  }
}

export const validateMoveCommand = (payload: unknown) => moveSchema.parse(payload);

export const toSimulatorWsUrl = (simulatorBaseUrl: string) =>
  simulatorBaseUrl.replace(/^http/, 'ws');

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
) => {
  const response = await fetch(`${simulatorBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    throw new SimulatorHttpError(response.status, payload);
  }

  return payload;
};
