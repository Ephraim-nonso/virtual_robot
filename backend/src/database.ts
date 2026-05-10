import fs from 'node:fs';
import path from 'node:path';

import Database from 'better-sqlite3';

import { config } from './config.js';

let databaseInstance: Database.Database | null = null;

const initializeSchema = (database: Database.Database) => {
  database.exec(`
    CREATE TABLE IF NOT EXISTS command_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      actor TEXT NOT NULL,
      command_type TEXT NOT NULL,
      request_payload TEXT,
      result_status TEXT NOT NULL,
      response_payload TEXT,
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS status_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      source TEXT NOT NULL,
      robot_id TEXT NOT NULL,
      position_x REAL NOT NULL,
      position_y REAL NOT NULL,
      battery REAL NOT NULL,
      robot_status TEXT NOT NULL,
      raw_payload TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_command_audit_logs_created_at
      ON command_audit_logs(created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_status_audit_logs_created_at
      ON status_audit_logs(created_at DESC);
  `);
};

export const getDatabase = () => {
  if (!databaseInstance) {
    fs.mkdirSync(path.dirname(config.databasePath), { recursive: true });

    databaseInstance = new Database(config.databasePath);
    databaseInstance.pragma('journal_mode = WAL');
    initializeSchema(databaseInstance);
  }

  return databaseInstance;
};
