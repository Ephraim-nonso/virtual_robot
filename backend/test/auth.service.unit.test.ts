import fs from 'node:fs/promises';
import path from 'node:path';

import { beforeEach, describe, expect, it } from 'vitest';

import { createTempDir, withEnv } from './helpers/testEnv.js';

describe('auth service', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await createTempDir('vrm-auth-tests-');
  });

  it('seeds a commander, registers a viewer, and logs the viewer in', async () => {
    await withEnv(
      {
        AUTH_USERS_FILE_PATH: path.join(tempDir, 'users.json'),
        AUTH_JWT_SECRET: 'test-secret',
        SEED_COMMANDER_EMAIL: 'lead@example.com',
        SEED_COMMANDER_PASSWORD: 'commander-secret',
        SEED_COMMANDER_NAME: 'Lead Commander',
      },
      async () => {
        const { initializeAuth, loginUser, registerViewer } = await import('../src/auth/service.js');

        await initializeAuth();

        const registered = await registerViewer({
          name: 'Viewer Test',
          email: 'viewer@example.com',
          password: 'password123',
        });

        expect(registered.role).toBe('VIEWER');

        const login = await loginUser({
          email: 'viewer@example.com',
          password: 'password123',
        });

        expect(login.user.email).toBe('viewer@example.com');
        expect(login.token).toBeTypeOf('string');

        const storedUsers = JSON.parse(
          await fs.readFile(path.join(tempDir, 'users.json'), 'utf8'),
        ) as { users: Array<{ email: string; role: string }> };

        expect(storedUsers.users.map((user) => user.email)).toEqual(
          expect.arrayContaining(['lead@example.com', 'viewer@example.com']),
        );
      },
    );
  });

  it('rejects invalid login credentials', async () => {
    await withEnv(
      {
        AUTH_USERS_FILE_PATH: path.join(tempDir, 'users.json'),
        AUTH_JWT_SECRET: 'test-secret',
      },
      async () => {
        const { initializeAuth, loginUser } = await import('../src/auth/service.js');

        await initializeAuth();

        await expect(
          loginUser({
            email: 'commander@example.com',
            password: 'wrong-password',
          }),
        ).rejects.toThrow('Invalid email or password.');
      },
    );
  });
});
