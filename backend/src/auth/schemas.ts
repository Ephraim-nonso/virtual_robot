import { z } from 'zod';

import { roles } from './types.js';

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
  role: z.enum(roles).default('VIEWER'),
});

export const loginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(128),
});

export const parseRegisterInput = (payload: unknown) => registerSchema.parse(payload);
export const parseLoginInput = (payload: unknown) => loginSchema.parse(payload);
