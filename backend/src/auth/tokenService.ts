import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';

import { config } from '../config.js';
import type { AuthUser, Role } from './types.js';

type AuthTokenPayload = {
  sub: string;
  name: string;
  email: string;
  role: Role;
};

export const createAuthToken = (user: AuthUser) =>
  jwt.sign(
    {
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    } satisfies AuthTokenPayload,
    config.authJwtSecret as Secret,
    {
      expiresIn: config.authTokenExpiry as SignOptions['expiresIn'],
    } satisfies SignOptions,
  );

export const verifyAuthToken = (token: string) =>
  jwt.verify(token, config.authJwtSecret) as AuthTokenPayload;
