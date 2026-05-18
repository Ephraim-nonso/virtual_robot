import { Router } from 'express';

import { requireAuth } from '../auth/middleware.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import {
  getCommandAuditItems,
  getStatusAuditItems,
} from '../services/robotService.js';

const readAccess = requireAuth('VIEWER', 'COMMANDER');

const parseAuditLimit = (rawLimit: unknown) => {
  const limit = typeof rawLimit === 'string' ? Number.parseInt(rawLimit, 10) : undefined;
  return Number.isNaN(limit) ? undefined : limit;
};

export const createAuditRouter = () => {
  const router = Router();

  router.get(
    '/api/audit/commands',
    readAccess,
    asyncHandler(async (request, response) => {
      response.json({
        items: await getCommandAuditItems(parseAuditLimit(request.query.limit)),
      });
    }),
  );

  router.get(
    '/api/audit/statuses',
    readAccess,
    asyncHandler(async (request, response) => {
      response.json({
        items: await getStatusAuditItems(parseAuditLimit(request.query.limit)),
      });
    }),
  );

  return router;
};
