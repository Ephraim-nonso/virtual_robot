import type { NextFunction, Request, Response } from 'express';

export type AsyncRouteHandler = (request: Request, response: Response) => Promise<void>;

export const asyncHandler =
  (handler: AsyncRouteHandler) =>
  (request: Request, response: Response, next: NextFunction) => {
    void handler(request, response).catch(next);
  };
