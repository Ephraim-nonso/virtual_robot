import { vi } from 'vitest';

type UserRow = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  createdAt: string;
};

type CommandAuditRow = {
  id: string;
  createdAt: string;
  actor: string;
  commandType: string;
  requestPayload: string | null;
  resultStatus: 'SUCCEEDED' | 'FAILED';
  responsePayload: string | null;
  errorMessage: string | null;
};

type StatusAuditRow = {
  id: string;
  createdAt: string;
  source: string;
  robotId: string;
  positionX: number;
  positionY: number;
  battery: number;
  robotStatus: string;
  rawPayload: string;
};

export const mockDatabaseModule = () => {
  vi.doMock('../../src/database.js', () => {
    const users: UserRow[] = [];
    const commandAuditLogs: CommandAuditRow[] = [];
    const statusAuditLogs: StatusAuditRow[] = [];

    const query = async <TRow extends Record<string, unknown>>(text: string, values: unknown[] = []) => {
      const normalized = text.replace(/\s+/g, ' ').trim();

      if (normalized.startsWith('SELECT id, name, email, password_hash AS "passwordHash", role, created_at AS "createdAt" FROM users WHERE email = $1')) {
        const email = values[0] as string;
        const user = users.find((entry) => entry.email === email);
        return { rows: (user ? [user] : []) as TRow[] };
      }

      if (normalized.startsWith('INSERT INTO users')) {
        const [id, name, email, passwordHash, role, createdAt] = values as string[];
        const existingUser = users.find((entry) => entry.email === email);

        if (existingUser) {
          throw { code: '23505' };
        }

        users.push({ id, name, email, passwordHash, role, createdAt });
        return { rows: [] as TRow[] };
      }

      if (normalized.startsWith('SELECT email, role FROM users ORDER BY email ASC')) {
        return {
          rows: users
            .map(({ email, role }) => ({ email, role }))
            .sort((left, right) => left.email.localeCompare(right.email)) as TRow[],
        };
      }

      if (normalized.startsWith('SELECT email FROM users ORDER BY email ASC')) {
        return {
          rows: users
            .map(({ email }) => ({ email }))
            .sort((left, right) => left.email.localeCompare(right.email)) as TRow[],
        };
      }

      if (normalized.startsWith('INSERT INTO command_audit_logs')) {
        const [createdAt, actor, commandType, requestPayload, resultStatus, responsePayload, errorMessage] = values as [
          string,
          string,
          string,
          string | null,
          'SUCCEEDED' | 'FAILED',
          string | null,
          string | null,
        ];

        commandAuditLogs.push({
          id: String(commandAuditLogs.length + 1),
          createdAt,
          actor,
          commandType,
          requestPayload,
          resultStatus,
          responsePayload,
          errorMessage,
        });

        return { rows: [] as TRow[] };
      }

      if (normalized.startsWith('INSERT INTO status_audit_logs')) {
        const [createdAt, source, robotId, positionX, positionY, battery, robotStatus, rawPayload] = values as [
          string,
          string,
          string,
          number,
          number,
          number,
          string,
          string,
        ];

        statusAuditLogs.push({
          id: String(statusAuditLogs.length + 1),
          createdAt,
          source,
          robotId,
          positionX,
          positionY,
          battery,
          robotStatus,
          rawPayload,
        });

        return { rows: [] as TRow[] };
      }

      if (normalized.startsWith('SELECT id::text AS id, created_at AS "createdAt", actor,')) {
        const limit = values[0] as number;
        return {
          rows: [...commandAuditLogs]
            .sort((left, right) => Number(right.id) - Number(left.id))
            .slice(0, limit) as TRow[],
        };
      }

      if (normalized.startsWith('SELECT id::text AS id, created_at AS "createdAt", source,')) {
        const limit = values[0] as number;
        return {
          rows: [...statusAuditLogs]
            .sort((left, right) => Number(right.id) - Number(left.id))
            .slice(0, limit) as TRow[],
        };
      }

      return { rows: [] as TRow[] };
    };

    return {
      initializeDatabase: async () => undefined,
      closeDatabase: async () => undefined,
      getDatabase: () => {
        throw new Error('getDatabase is not available in mocked tests.');
      },
      query,
    };
  });
};
