import { query } from './database.js';
import type { RobotStatusPayload } from './simulatorClient.js';

export type CommandAuditLogInput = {
  actor: string;
  commandType: string;
  requestPayload?: unknown;
  resultStatus: 'SUCCEEDED' | 'FAILED';
  responsePayload?: unknown;
  errorMessage?: string;
};

export type StatusAuditLogInput = {
  source: string;
  payload: RobotStatusPayload;
};

const serialize = (value: unknown) =>
  value === undefined ? null : JSON.stringify(value);

const parseLimit = (value: number | undefined) => {
  if (!value || Number.isNaN(value)) {
    return 50;
  }

  return Math.min(Math.max(Math.trunc(value), 1), 200);
};

export const recordCommandAuditLog = (input: CommandAuditLogInput) => {
  return query(
    `
      INSERT INTO command_audit_logs (
        created_at,
        actor,
        command_type,
        request_payload,
        result_status,
        response_payload,
        error_message
      ) VALUES ($1, $2, $3, $4::jsonb, $5, $6::jsonb, $7)
    `,
    [
      new Date().toISOString(),
      input.actor,
      input.commandType,
      serialize(input.requestPayload),
      input.resultStatus,
      serialize(input.responsePayload),
      input.errorMessage ?? null,
    ],
  );
};

export const recordStatusAuditLog = (input: StatusAuditLogInput) => {
  return query(
    `
      INSERT INTO status_audit_logs (
        created_at,
        source,
        robot_id,
        position_x,
        position_y,
        battery,
        robot_status,
        raw_payload
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
    `,
    [
      new Date().toISOString(),
      input.source,
      input.payload.id,
      input.payload.position.x,
      input.payload.position.y,
      input.payload.battery,
      input.payload.status,
      JSON.stringify(input.payload),
    ],
  );
};

export const listCommandAuditLogs = async (limit?: number) => {
  const result = await query<{
    id: string;
    createdAt: Date | string;
    actor: string;
    commandType: string;
    requestPayload: string | null;
    resultStatus: 'SUCCEEDED' | 'FAILED';
    responsePayload: string | null;
    errorMessage: string | null;
  }>(
    `
      SELECT
        id::text AS id,
        created_at AS "createdAt",
        actor,
        command_type AS "commandType",
        request_payload::text AS "requestPayload",
        result_status AS "resultStatus",
        response_payload::text AS "responsePayload",
        error_message AS "errorMessage"
      FROM command_audit_logs
      ORDER BY id DESC
      LIMIT $1
    `,
    [parseLimit(limit)],
  );

  return result.rows.map((row) => ({
    ...row,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  }));
};

export const listStatusAuditLogs = async (limit?: number) => {
  const result = await query<{
    id: string;
    createdAt: Date | string;
    source: string;
    robotId: string;
    positionX: number;
    positionY: number;
    battery: number;
    robotStatus: string;
    rawPayload: string;
  }>(
    `
      SELECT
        id::text AS id,
        created_at AS "createdAt",
        source,
        robot_id AS "robotId",
        position_x AS "positionX",
        position_y AS "positionY",
        battery,
        robot_status AS "robotStatus",
        raw_payload::text AS "rawPayload"
      FROM status_audit_logs
      ORDER BY id DESC
      LIMIT $1
    `,
    [parseLimit(limit)],
  );

  return result.rows.map((row) => ({
    ...row,
    createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
  }));
};
