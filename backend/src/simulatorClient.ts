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

export class SimulatorConnectionError extends Error {
  constructor(message = 'Unable to reach the robot simulator.') {
    super(message);
  }
}

export const validateMoveCommand = (payload: unknown) => moveSchema.parse(payload);

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
  let response: Response;

  try {
    response = await fetch(`${simulatorBaseUrl}${path}`, {
      ...init,
      headers: {
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch (error) {
    throw new SimulatorConnectionError(
      error instanceof Error ? error.message : 'Unable to reach the robot simulator.',
    );
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    throw new SimulatorHttpError(response.status, payload);
  }

  return payload;
};
