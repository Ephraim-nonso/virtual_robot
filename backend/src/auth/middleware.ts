import type { NextFunction, Request, Response } from 'express';

import { verifyAuthToken } from './tokenService.js';
import type { AuthUser, Role } from './types.js';

export class AuthenticationError extends Error {
  status = 401;
}

export class AuthorizationError extends Error {
  status = 403;
}

const getTokenFromRequest = (request: Request) => {
  const authorizationHeader = request.headers.authorization;

  if (authorizationHeader?.startsWith('Bearer ')) {
    return authorizationHeader.slice('Bearer '.length);
  }

  const url = new URL(request.originalUrl, 'http://localhost');
  const queryToken = url.searchParams.get('token');

  return queryToken ?? null;
};

export const authenticateRequest = (request: Request): AuthUser => {
  const token = getTokenFromRequest(request);

  if (!token) {
    throw new AuthenticationError('Authentication token is required.');
  }

  try {
    const payload = verifyAuthToken(token);
    const user: AuthUser = {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    };

    request.authUser = user;
    return user;
  } catch {
    throw new AuthenticationError('Authentication token is invalid or expired.');
  }
};

export const requireAuth =
  (...roles: Role[]) =>
  (request: Request, _response: Response, next: NextFunction) => {
    try {
      const user = authenticateRequest(request);

      if (roles.length > 0 && !roles.includes(user.role)) {
        throw new AuthorizationError('You do not have permission to perform this action.');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
