import { Pool, type QueryResultRow } from 'pg';

import { config } from './config.js';

let databaseInstance: Pool | null = null;
let initializationPromise: Promise<Pool> | null = null;

const initializeSchema = async (database: Pool) => {
  await database.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL
    )
  `);

  await database.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email
      ON users(email)
  `);

  await database.query(`
    CREATE TABLE IF NOT EXISTS command_audit_logs (
      id BIGSERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL,
      actor TEXT NOT NULL,
      command_type TEXT NOT NULL,
      request_payload JSONB,
      result_status TEXT NOT NULL,
      response_payload JSONB,
      error_message TEXT
    )
  `);

  await database.query(`
    CREATE INDEX IF NOT EXISTS idx_command_audit_logs_created_at
      ON command_audit_logs(created_at DESC)
  `);

  await database.query(`
    CREATE TABLE IF NOT EXISTS status_audit_logs (
      id BIGSERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL,
      source TEXT NOT NULL,
      robot_id TEXT NOT NULL,
      position_x DOUBLE PRECISION NOT NULL,
      position_y DOUBLE PRECISION NOT NULL,
      battery DOUBLE PRECISION NOT NULL,
      robot_status TEXT NOT NULL,
      raw_payload JSONB NOT NULL
    )
  `);

  await database.query(`
    CREATE INDEX IF NOT EXISTS idx_status_audit_logs_created_at
      ON status_audit_logs(created_at DESC)
  `);
};

export const initializeDatabase = async () => {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      if (!databaseInstance) {
        databaseInstance = new Pool({
          connectionString: config.databaseUrl,
          ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
        });
      }

      await initializeSchema(databaseInstance);
      return databaseInstance;
    })();
  }

  return initializationPromise;
};

export const getDatabase = () => {
  if (!databaseInstance) {
    throw new Error('Database has not been initialized. Call initializeDatabase() first.');
  }

  return databaseInstance;
};

export const query = async <TRow extends QueryResultRow>(text: string, values?: unknown[]) => {
  const database = await initializeDatabase();
  const result = await database.query<TRow>(text, values);
  return result;
};

export const closeDatabase = async () => {
  const database = databaseInstance;
  databaseInstance = null;
  initializationPromise = null;

  if (database) {
    await database.end();
  }
};
