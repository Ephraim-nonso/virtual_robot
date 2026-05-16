import { Router } from 'express';

import { requireAuth } from '../auth/middleware.js';
import { parseLoginInput, parseRegisterInput } from '../auth/schemas.js';
import { loginUser, registerUser } from '../auth/service.js';
import { asyncHandler } from '../lib/asyncHandler.js';

const readAccess = requireAuth('VIEWER', 'COMMANDER');

export const createAuthRouter = () => {
  const router = Router();

  router.post(
    '/api/auth/register',
    asyncHandler(async (request, response) => {
      const input = parseRegisterInput(request.body);
      const user = await registerUser(input);

      response.status(201).json({
        user,
      });
    }),
  );

  router.post(
    '/api/auth/login',
    asyncHandler(async (request, response) => {
      const input = parseLoginInput(request.body);
      const result = await loginUser(input);

      response.json(result);
    }),
  );

  router.get(
    '/api/auth/me',
    readAccess,
    asyncHandler(async (request, response) => {
      response.json({
        user: request.authUser,
      });
    }),
  );

  return router;
};
