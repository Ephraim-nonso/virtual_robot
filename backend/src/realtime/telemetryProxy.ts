import type http from 'node:http';

import type { Request } from 'express';
import { WebSocket, WebSocketServer } from 'ws';

import { authenticateRequest } from '../auth/middleware.js';
import { config } from '../config.js';
import { toSimulatorWsUrl } from '../simulatorClient.js';

export const attachTelemetryProxy = (server: http.Server) => {
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
      if (!request.url?.startsWith('/ws/telemetry')) {
        socket.destroy();
        return;
      }
    }

    try {
      const authUser = authenticateRequest({
        headers: request.headers,
        originalUrl: request.url ?? '/ws/telemetry',
      } as Request);

      if (authUser.role !== 'VIEWER' && authUser.role !== 'COMMANDER') {
        socket.destroy();
        return;
      }
    } catch {
      socket.destroy();
      return;
    }

    wsServer.handleUpgrade(request, socket, head, (clientSocket) => {
      wsServer.emit('connection', clientSocket, request);
    });
  });

  return wsServer;
};
