import http from 'node:http';

import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import { ZodError } from 'zod';

import {
  listCommandAuditLogs,
  listStatusAuditLogs,
  recordCommandAuditLog,
  recordStatusAuditLog,
} from './auditLog.js';
import { config } from './config.js';
import { getDatabase } from './database.js';
import {
  parseRobotStatus,
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

const safeAuditWrite = (description: string, operation: () => void) => {
  try {
    operation();
  } catch (error) {
    console.error(`Audit logging failed during ${description}.`, error);
  }
};

const recordStatusSnapshot = (source: string, payload: unknown) => {
  safeAuditWrite(`status snapshot for ${source}`, () => {
    recordStatusAuditLog({
      source,
      payload: parseRobotStatus(payload),
    });
  });
};

const captureCurrentStatusSnapshot = async (source: string) => {
  try {
    const statusPayload = await requestSimulator('/api/status');
    recordStatusSnapshot(source, statusPayload);
  } catch (error) {
    console.error(`Unable to capture audit status snapshot for ${source}.`, error);
  }
};

const recordCommandAudit = (input: {
  commandType: string;
  requestPayload?: unknown;
  resultStatus: 'SUCCEEDED' | 'FAILED';
  responsePayload?: unknown;
  errorMessage?: string;
}) => {
  safeAuditWrite(`command ${input.commandType}`, () => {
    recordCommandAuditLog({
      actor: config.auditDefaultActor,
      ...input,
    });
  });
};

const executeCommand = async (input: {
  commandType: string;
  simulatorPath: string;
  requestPayload?: unknown;
  requestInit?: RequestInit;
  statusSnapshotSource: string;
}) => {
  try {
    const responsePayload = await requestSimulator(input.simulatorPath, input.requestInit);
    recordCommandAudit({
      commandType: input.commandType,
      requestPayload: input.requestPayload,
      responsePayload,
      resultStatus: 'SUCCEEDED',
    });
    await captureCurrentStatusSnapshot(input.statusSnapshotSource);
    return responsePayload;
  } catch (error) {
    recordCommandAudit({
      commandType: input.commandType,
      requestPayload: input.requestPayload,
      resultStatus: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown command failure.',
    });
    throw error;
  }
};

const parseAuditLimit = (request: Request) => {
  const rawLimit = request.query.limit;
  const limit =
    typeof rawLimit === 'string' ? Number.parseInt(rawLimit, 10) : undefined;

  return Number.isNaN(limit) ? undefined : limit;
};

app.use(cors());
app.use(express.json());

app.get(
  '/health',
  asyncHandler(async (_request, response) => {
    const upstreamStatus = await requestSimulator('/api/status');
    recordStatusSnapshot('health', upstreamStatus);

    response.json({
      ok: true,
      simulatorUrl: config.robotSimUrl,
      upstreamStatus,
    });
  }),
);

app.get(
  '/api/robot/status',
  asyncHandler(async (_request, response) => {
    const payload = await requestSimulator('/api/status');
    recordStatusSnapshot('api/robot/status', payload);
    response.json(payload);
  }),
);
app.get('/api/robot/map', proxyReadRoute('/api/map'));
app.get('/api/robot/sensor', proxyReadRoute('/api/sensor'));
app.get(
  '/api/audit/commands',
  asyncHandler(async (request, response) => {
    response.json({
      items: listCommandAuditLogs(parseAuditLimit(request)),
    });
  }),
);
app.get(
  '/api/audit/statuses',
  asyncHandler(async (request, response) => {
    response.json({
      items: listStatusAuditLogs(parseAuditLimit(request)),
    });
  }),
);

app.post(
  '/api/robot/move',
  asyncHandler(async (request, response) => {
    const payload = validateMoveCommand(request.body);
    const upstreamResponse = await executeCommand({
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

app.post(
  '/api/robot/reset',
  asyncHandler(async (_request, response) => {
    const upstreamResponse = await executeCommand({
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
getDatabase();

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
