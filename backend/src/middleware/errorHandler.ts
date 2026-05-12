import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import {
  AuthenticationError,
  AuthorizationError,
} from '../auth/middleware.js';
import { UserConflictError } from '../auth/userStore.js';
import {
  SimulatorConnectionError,
  SimulatorHttpError,
} from '../simulatorClient.js';

export const errorHandler = (
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      message: 'Invalid request body.',
      issues: error.issues,
    });
    return;
  }

  if (error instanceof UserConflictError) {
    response.status(409).json({
      message: error.message,
    });
    return;
  }

  if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
    response.status(error.status).json({
      message: error.message,
    });
    return;
  }

  if (error instanceof SimulatorHttpError) {
    response.status(error.status).json({
      message: 'Simulator request failed.',
      details: error.payload,
    });
    return;
  }

  if (error instanceof SimulatorConnectionError) {
    response.status(error.timedOut ? 504 : 503).json({
      message: error.timedOut
        ? 'Robot simulator request timed out.'
        : 'Robot simulator is unavailable.',
      details: error.message,
      attempts: error.attempts,
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    message: 'Unexpected backend error.',
  });
};
