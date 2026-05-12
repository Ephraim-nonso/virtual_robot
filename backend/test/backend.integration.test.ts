import fs from 'node:fs/promises';
import path from 'node:path';
import { once } from 'node:events';

import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';

import { createFakeSimulator } from './helpers/fakeSimulator.js';
import { createTempDir, withEnv } from './helpers/testEnv.js';

type RunningBackend = {
  request: request.SuperTest<request.Test>;
  baseUrl: string;
  close: () => Promise<void>;
};

const startBackend = async (values: Record<string, string>): Promise<RunningBackend> =>
  withEnv(values, async () => {
    const { createServer, initializeBackend } = await import('../src/app.js');
    await initializeBackend();
    const { server } = createServer();
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();

    if (!address || typeof address === 'string') {
      throw new Error('Unable to determine backend address.');
    }

    return {
      request: request(server),
      baseUrl: `http://127.0.0.1:${address.port}`,
      close: async () => {
        server.close();
        await once(server, 'close');
      },
    };
  });

describe('backend integration', () => {
  let cleanup: Array<() => Promise<void>> = [];

  afterEach(async () => {
    for (const close of cleanup.reverse()) {
      await close();
    }
    cleanup = [];
  });

  it('supports auth, RBAC, audit logging, and websocket telemetry', async () => {
    const tempDir = await createTempDir('vrm-backend-integration-');
    const simulator = await createFakeSimulator();
    cleanup.push(simulator.close);

    const backend = await startBackend({
      ROBOT_SIM_URL: simulator.baseUrl,
      DATABASE_PATH: path.join(tempDir, 'audit.db'),
      AUTH_USERS_FILE_PATH: path.join(tempDir, 'users.json'),
      AUTH_JWT_SECRET: 'integration-secret',
      SEED_COMMANDER_PASSWORD: 'commander-secret',
      AUDIT_DEFAULT_ACTOR: 'integration-test',
    });
    cleanup.push(backend.close);

    const register = await backend.request.post('/api/auth/register').send({
      name: 'Viewer Test',
      email: 'viewer@example.com',
      password: 'password123',
    });

    expect(register.status).toBe(201);
    expect(register.body.user.role).toBe('VIEWER');

    const viewerLogin = await backend.request.post('/api/auth/login').send({
      email: 'viewer@example.com',
      password: 'password123',
    });
    const viewerToken = viewerLogin.body.token as string;

    const commanderLogin = await backend.request.post('/api/auth/login').send({
      email: 'commander@example.com',
      password: 'commander-secret',
    });
    const commanderToken = commanderLogin.body.token as string;

    const me = await backend.request
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('viewer@example.com');

    const viewerStatus = await backend.request
      .get('/api/robot/status')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(viewerStatus.status).toBe(200);
    expect(viewerStatus.body.id).toBe('XR-900');

    const viewerMoveDenied = await backend.request
      .post('/api/robot/move')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({ x: 1, y: 1 });
    expect(viewerMoveDenied.status).toBe(403);

    const commanderMove = await backend.request
      .post('/api/robot/move')
      .set('Authorization', `Bearer ${commanderToken}`)
      .send({ x: 2, y: 2 });
    expect(commanderMove.status).toBe(200);
    expect(simulator.counts.move).toBe(1);

    const commanderReset = await backend.request
      .post('/api/robot/reset')
      .set('Authorization', `Bearer ${commanderToken}`);
    expect(commanderReset.status).toBe(200);
    expect(simulator.counts.reset).toBe(1);

    const health = await backend.request.get('/health');
    expect(health.status).toBe(200);

    const commandAudit = await backend.request
      .get('/api/audit/commands?limit=5')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(commandAudit.status).toBe(200);
    expect(commandAudit.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ commandType: 'MOVE', actor: 'integration-test' }),
        expect.objectContaining({ commandType: 'RESET', actor: 'integration-test' }),
      ]),
    );

    const statusAudit = await backend.request
      .get('/api/audit/statuses?limit=5')
      .set('Authorization', `Bearer ${viewerToken}`);
    expect(statusAudit.status).toBe(200);
    expect(statusAudit.body.items.length).toBeGreaterThan(0);

    const storedUsers = JSON.parse(
      await fs.readFile(path.join(tempDir, 'users.json'), 'utf8'),
    ) as { users: Array<{ email: string }> };
    expect(storedUsers.users.map((user) => user.email)).toEqual(
      expect.arrayContaining(['commander@example.com', 'viewer@example.com']),
    );

    await new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(
        `${backend.baseUrl.replace(/^http/, 'ws')}/ws/telemetry?token=${viewerToken}`,
      );

      const timeout = setTimeout(() => {
        socket.close();
        reject(new Error('Timed out waiting for websocket message.'));
      }, 10000);

      socket.once('message', (message) => {
        clearTimeout(timeout);
        expect(JSON.parse(message.toString())).toMatchObject({
          status: expect.any(String),
          position: expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }),
        });
        socket.close();
        resolve();
      });

      socket.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  });

  it('returns timeout and retry metadata when the simulator is too slow', async () => {
    const tempDir = await createTempDir('vrm-backend-timeout-');
    const simulator = await createFakeSimulator({ statusDelayMs: 200 });
    cleanup.push(simulator.close);

    const backend = await startBackend({
      ROBOT_SIM_URL: simulator.baseUrl,
      DATABASE_PATH: path.join(tempDir, 'audit.db'),
      AUTH_USERS_FILE_PATH: path.join(tempDir, 'users.json'),
      AUTH_JWT_SECRET: 'integration-secret',
      SIMULATOR_REQUEST_TIMEOUT_MS: '25',
      SIMULATOR_READ_RETRY_COUNT: '2',
      SIMULATOR_READ_RETRY_DELAY_MS: '0',
    });
    cleanup.push(backend.close);

    const response = await backend.request.get('/health');

    expect(response.status).toBe(504);
    expect(response.body.attempts).toBe(3);
    expect(simulator.counts.status).toBe(3);
  });
});
