import { Router } from 'express';

import { requireAuth } from '../auth/middleware.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import {
  executeRobotCommand,
  getHealthPayload,
  getRobotResource,
} from '../services/robotService.js';
import { validateMoveCommand } from '../simulatorClient.js';

const readAccess = requireAuth('VIEWER', 'COMMANDER');
const commanderAccess = requireAuth('COMMANDER');

export const createRobotRouter = () => {
  const router = Router();

  router.get('/health/live', (_request, response) => {
    response.json({
      ok: true,
    });
  });

  router.get(
    '/health',
    asyncHandler(async (_request, response) => {
      response.json(await getHealthPayload());
    }),
  );

  router.get(
    '/api/robot/status',
    readAccess,
    asyncHandler(async (_request, response) => {
      response.json(await getRobotResource('/api/status'));
    }),
  );

  router.get(
    '/api/robot/map',
    readAccess,
    asyncHandler(async (_request, response) => {
      response.json(await getRobotResource('/api/map'));
    }),
  );

  router.get(
    '/api/robot/sensor',
    readAccess,
    asyncHandler(async (_request, response) => {
      response.json(await getRobotResource('/api/sensor'));
    }),
  );

  router.post(
    '/api/robot/move',
    commanderAccess,
    asyncHandler(async (request, response) => {
      const payload = validateMoveCommand(request.body);
      const upstreamResponse = await executeRobotCommand({
        commandType: 'MOVE',
        simulatorPath: '/api/move',
        requestPayload: payload,
        requestInit: {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        statusSnapshotSource: 'command/move',
      });

      response.json(upstreamResponse);
    }),
  );

  router.post(
    '/api/robot/reset',
    commanderAccess,
    asyncHandler(async (_request, response) => {
      const upstreamResponse = await executeRobotCommand({
        commandType: 'RESET',
        simulatorPath: '/api/reset',
        requestInit: {
          method: 'POST',
        },
        statusSnapshotSource: 'command/reset',
      });

      response.json(upstreamResponse);
    }),
  );

  return router;
};
