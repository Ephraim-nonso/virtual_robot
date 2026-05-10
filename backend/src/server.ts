import http from 'node:http';

import cors from 'cors';
import express from 'express';
import { ZodError } from 'zod';

import { config } from './config.js';
import {
  SimulatorConnectionError,
  SimulatorHttpError,
  simulatorRequest,
  validateMoveCommand,
} from './simulatorClient.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', async (_request, response, next) => {
  try {
    const upstreamStatus = await simulatorRequest(config.robotSimUrl, '/api/status');

    response.json({
      ok: true,
      simulatorUrl: config.robotSimUrl,
      upstreamStatus,
    });
  } catch (error) {
    next(error);
  }
});

app.get('/api/robot/status', async (_request, response, next) => {
  try {
    const payload = await simulatorRequest(config.robotSimUrl, '/api/status');
    response.json(payload);
  } catch (error) {
    next(error);
  }
});

app.get('/api/robot/map', async (_request, response, next) => {
  try {
    const payload = await simulatorRequest(config.robotSimUrl, '/api/map');
    response.json(payload);
  } catch (error) {
    next(error);
  }
});

app.get('/api/robot/sensor', async (_request, response, next) => {
  try {
    const payload = await simulatorRequest(config.robotSimUrl, '/api/sensor');
    response.json(payload);
  } catch (error) {
    next(error);
  }
});

app.post('/api/robot/move', async (request, response, next) => {
  try {
    const payload = validateMoveCommand(request.body);
    const upstreamResponse = await simulatorRequest(config.robotSimUrl, '/api/move', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    response.json(upstreamResponse);
  } catch (error) {
    next(error);
  }
});

app.post('/api/robot/reset', async (_request, response, next) => {
  try {
    const upstreamResponse = await simulatorRequest(config.robotSimUrl, '/api/reset', {
      method: 'POST',
    });

    response.json(upstreamResponse);
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
  if (error instanceof ZodError) {
    response.status(400).json({
      message: 'Invalid request body.',
      issues: error.issues,
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
    response.status(503).json({
      message: 'Robot simulator is unavailable.',
      details: error.message,
    });
    return;
  }

  console.error(error);
  response.status(500).json({
    message: 'Unexpected backend error.',
  });
});

const server = http.createServer(app);

server.listen(config.port, () => {
  console.log(`Backend listening on http://localhost:${config.port}`);
  console.log(`Proxying robot simulator from ${config.robotSimUrl}`);
});
