import http from 'node:http';
import { once } from 'node:events';

import request from 'supertest';
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';

import { createFakeSimulator } from './helpers/fakeSimulator.js';
import { mockDatabaseModule } from './helpers/mockDatabase.js';
import { withEnv } from './helpers/testEnv.js';

type RunningBackend = {
  request: request.SuperTest<request.Test>;
  baseUrl: string;
  query: <TRow extends Record<string, unknown>>(text: string, values?: unknown[]) => Promise<{
    rows: TRow[];
  }>;
  close: () => Promise<void>;
};

const startBackend = async (values: Record<string, string>): Promise<RunningBackend> =>
  withEnv(values, async () => {
    const { createApp } = await import('../src/app.js');
    const { initializeBackend } = await import('../src/bootstrap.js');
    const { closeDatabase, query } = await import('../src/database.js');
    const { attachTelemetryProxy } = await import('../src/realtime/telemetryProxy.js');
    await initializeBackend();
    const server = http.createServer(createApp());
    attachTelemetryProxy(server);
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address();

    if (!address || typeof address === 'string') {
      throw new Error('Unable to determine backend address.');
    }

    return {
      request: request(server),
      baseUrl: `http://127.0.0.1:${address.port}`,
      query,
      close: async () => {
        server.close();
        await once(server, 'close');
        await closeDatabase();
      },
    };
  });

describe('backend integration', () => {
  let cleanup: Array<() => Promise<void>> = [];

  mockDatabaseModule();

  afterEach(async () => {
    for (const close of cleanup.reverse()) {
      await close();
    }
    cleanup = [];
  });

  it('supports auth, RBAC, audit logging, and websocket telemetry', async () => {
    const simulator = await createFakeSimulator();
    cleanup.push(simulator.close);

    const backend = await startBackend({
      ROBOT_SIM_URL: simulator.baseUrl,
      DATABASE_URL: 'postgres://test:test@127.0.0.1:5432/vrm_backend_integration',
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

    const liveHealth = await backend.request.get('/health/live');
    expect(liveHealth.status).toBe(200);
    expect(liveHealth.body).toEqual({ ok: true });

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

    const storedUsers = await backend.query<{ email: string }>(
      `
        SELECT email
        FROM users
        ORDER BY email ASC
      `,
    );
    expect(storedUsers.rows.map((user) => user.email)).toEqual(
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
    const simulator = await createFakeSimulator({ statusDelayMs: 200 });
    cleanup.push(simulator.close);

    const backend = await startBackend({
      ROBOT_SIM_URL: simulator.baseUrl,
      DATABASE_URL: 'postgres://test:test@127.0.0.1:5432/vrm_backend_timeout',
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
