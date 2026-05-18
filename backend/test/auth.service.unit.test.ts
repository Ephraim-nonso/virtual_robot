import { beforeEach, describe, expect, it } from 'vitest';

import { mockDatabaseModule } from './helpers/mockDatabase.js';
import { withEnv } from './helpers/testEnv.js';

describe('auth service', () => {
  beforeEach(() => {
    mockDatabaseModule();
  });

  it('seeds a commander, registers a viewer, and logs the viewer in', async () => {
    await withEnv(
      {
        DATABASE_URL: 'postgres://test:test@127.0.0.1:5432/vrm_auth_tests',
        AUTH_JWT_SECRET: 'test-secret',
        SEED_COMMANDER_EMAIL: 'lead@example.com',
        SEED_COMMANDER_PASSWORD: 'commander-secret',
        SEED_COMMANDER_NAME: 'Lead Commander',
      },
      async () => {
        const { initializeAuth, loginUser, registerViewer } = await import('../src/auth/service.js');
        const { closeDatabase, query } = await import('../src/database.js');

        try {
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

          const storedUsers = await query<{ email: string; role: string }>(
            `
              SELECT email, role
              FROM users
              ORDER BY email ASC
            `,
          );

          expect(storedUsers.rows.map((user) => user.email)).toEqual(
            expect.arrayContaining(['lead@example.com', 'viewer@example.com']),
          );
        } finally {
          await closeDatabase();
        }
      },
    );
  });

  it('rejects invalid login credentials', async () => {
    await withEnv(
      {
        DATABASE_URL: 'postgres://test:test@127.0.0.1:5432/vrm_auth_tests_invalid_login',
        AUTH_JWT_SECRET: 'test-secret',
      },
      async () => {
        const { initializeAuth, loginUser } = await import('../src/auth/service.js');
        const { closeDatabase } = await import('../src/database.js');

        try {
          await initializeAuth();

          await expect(
            loginUser({
              email: 'commander@example.com',
              password: 'wrong-password',
            }),
          ).rejects.toThrow('Invalid email or password.');
        } finally {
          await closeDatabase();
        }
      },
    );
  });
});
