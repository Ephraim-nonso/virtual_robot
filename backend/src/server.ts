import http from 'node:http';

import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import { ZodError } from 'zod';

import { config } from './config.js';
import {
  SimulatorConnectionError,
  SimulatorHttpError,
  simulatorRequest,
  type SimulatorRequestOptions,
  toSimulatorWsUrl,
  validateMoveCommand,
} from './simulatorClient.js';

const app = express();
const simulatorRequestOptions: SimulatorRequestOptions = {
  timeoutMs: config.simulatorRequestTimeoutMs,
  readRetryCount: config.simulatorReadRetryCount,
  readRetryDelayMs: config.simulatorReadRetryDelayMs,
};
type AsyncRouteHandler = (request: Request, response: Response) => Promise<void>;

const asyncHandler =
  (handler: AsyncRouteHandler) =>
  (request: Request, response: Response, next: NextFunction) => {
    void handler(request, response).catch(next);
  };

const requestSimulator = (path: string, init?: RequestInit) =>
  simulatorRequest(config.robotSimUrl, path, init, simulatorRequestOptions);

const proxyReadRoute = (path: string) =>
  asyncHandler(async (_request, response) => {
    response.json(await requestSimulator(path));
  });

app.use(cors());
app.use(express.json());

app.get(
  '/health',
  asyncHandler(async (_request, response) => {
    const upstreamStatus = await requestSimulator('/api/status');

    response.json({
      ok: true,
      simulatorUrl: config.robotSimUrl,
      upstreamStatus,
    });
  }),
);

app.get('/api/robot/status', proxyReadRoute('/api/status'));
app.get('/api/robot/map', proxyReadRoute('/api/map'));
app.get('/api/robot/sensor', proxyReadRoute('/api/sensor'));

app.post(
  '/api/robot/move',
  asyncHandler(async (request, response) => {
    const payload = validateMoveCommand(request.body);
    const upstreamResponse = await requestSimulator('/api/move', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    response.json(upstreamResponse);
  }),
);

app.post(
  '/api/robot/reset',
  asyncHandler(async (_request, response) => {
    const upstreamResponse = await requestSimulator('/api/reset', {
      method: 'POST',
    });

    response.json(upstreamResponse);
  }),
);

app.use(
  (error: unknown, _request: Request, response: Response, _next: NextFunction) => {
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
  },
);

const server = http.createServer(app);
const wsServer = new WebSocketServer({ noServer: true });

wsServer.on('connection', (clientSocket) => {
  const upstreamSocket = new WebSocket(`${toSimulatorWsUrl(config.robotSimUrl)}/ws/telemetry`);

  upstreamSocket.on('message', (message, isBinary) => {
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(message, { binary: isBinary });
    }
  });

  upstreamSocket.on('close', (code, reason) => {
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.close(code, reason.toString());
    }
  });

  upstreamSocket.on('error', () => {
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(
        JSON.stringify({
          type: 'backend_error',
          message: 'Unable to connect to simulator telemetry stream.',
        }),
      );
      clientSocket.close(1011, 'Simulator telemetry unavailable');
    }
  });

  clientSocket.on('close', () => {
    if (
      upstreamSocket.readyState === WebSocket.OPEN ||
      upstreamSocket.readyState === WebSocket.CONNECTING
    ) {
      upstreamSocket.close();
    }
  });
});

server.on('upgrade', (request, socket, head) => {
  if (request.url !== '/ws/telemetry') {
    socket.destroy();
    return;
  }

  wsServer.handleUpgrade(request, socket, head, (clientSocket) => {
    wsServer.emit('connection', clientSocket, request);
  });
});

server.listen(config.port, () => {
  console.log(`Backend listening on http://localhost:${config.port}`);
  console.log(`Proxying robot simulator from ${config.robotSimUrl}`);
});
