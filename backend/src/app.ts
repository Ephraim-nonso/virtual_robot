import cors from 'cors';
import express from 'express';

import { errorHandler } from './middleware/errorHandler.js';
import { createAuthRouter } from './routes/authRoutes.js';
import { createAuditRouter } from './routes/auditRoutes.js';
import { createRobotRouter } from './routes/robotRoutes.js';

export const createApp = () => {
  const app = express();

  app.use(cors());
  app.use(express.json());
  app.use(createAuthRouter());
  app.use(createRobotRouter());
  app.use(createAuditRouter());
  app.use(errorHandler);
  return app;
};
