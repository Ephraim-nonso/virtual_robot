import http from 'node:http';
import { once } from 'node:events';

import { WebSocketServer } from 'ws';

type RobotState = {
  id: string;
  position: { x: number; y: number };
  battery: number;
  status: string;
};

const readJsonBody = async (request: http.IncomingMessage) => {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (chunks.length === 0) {
    return null;
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};

const sendJson = (response: http.ServerResponse, status: number, payload: unknown) => {
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify(payload));
};

export const createFakeSimulator = async (options?: {
  statusDelayMs?: number;
  alwaysFailStatus?: boolean;
}) => {
  const state: RobotState = {
    id: 'XR-900',
    position: { x: 0, y: 0 },
    battery: 100,
    status: 'IDLE',
  };

  const counts = {
    status: 0,
    move: 0,
    reset: 0,
  };

  const server = http.createServer(async (request, response) => {
    if (!request.url) {
      sendJson(response, 404, { message: 'Not found' });
      return;
    }

    if (request.url === '/api/status' && request.method === 'GET') {
      counts.status += 1;

      if (options?.statusDelayMs) {
        await new Promise((resolve) => setTimeout(resolve, options.statusDelayMs));
      }

      if (options?.alwaysFailStatus) {
        sendJson(response, 503, { message: 'Temporary simulator failure' });
        return;
      }

      sendJson(response, 200, state);
      return;
    }

    if (request.url === '/api/map' && request.method === 'GET') {
      sendJson(response, 200, {
        width: 3,
        height: 3,
        grid: [
          [0, 1, 0],
          [0, 0, 0],
          [0, 0, 0],
        ],
      });
      return;
    }

    if (request.url === '/api/sensor' && request.method === 'GET') {
      sendJson(response, 200, {
        N: 1,
        S: 2,
        E: 3,
        W: 4,
        lidar: Array.from({ length: 8 }, (_, index) => index + 1),
      });
      return;
    }

    if (request.url === '/api/move' && request.method === 'POST') {
      counts.move += 1;
      const payload = (await readJsonBody(request)) as { x: number; y: number };
      state.position = { x: payload.x, y: payload.y };
      state.battery = Math.max(0, state.battery - 0.5);
      state.status = 'MOVING';
      sendJson(response, 200, { message: `Navigating to (${payload.x}, ${payload.y})` });
      return;
    }

    if (request.url === '/api/reset' && request.method === 'POST') {
      counts.reset += 1;
      state.position = { x: 0, y: 0 };
      state.battery = 100;
      state.status = 'IDLE';
      sendJson(response, 200, { message: 'Simulation reset.' });
      return;
    }

    sendJson(response, 404, { message: 'Not found' });
  });

  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', (socket) => {
    socket.send(
      JSON.stringify({
        position: state.position,
        battery: state.battery,
        status: state.status,
        sensors: {
          N: 1,
          S: 2,
          E: 3,
          W: 4,
          lidar: [1, 2, 3, 4],
        },
      }),
    );
  });

  server.on('upgrade', (request, socket, head) => {
    if (request.url !== '/ws/telemetry') {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (client) => {
      wss.emit('connection', client, request);
    });
  });

  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();

  if (!address || typeof address === 'string') {
    throw new Error('Unable to determine fake simulator address.');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    counts,
    close: async () => {
      wss.close();
      server.close();
      await once(server, 'close');
    },
  };
};
