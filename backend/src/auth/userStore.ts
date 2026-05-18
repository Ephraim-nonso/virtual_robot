import { randomUUID } from 'node:crypto';

import { config } from '../config.js';
import { query } from '../database.js';
import { hashPassword } from './passwords.js';
import type { AuthUser, Role, StoredUser } from './types.js';

export class UserConflictError extends Error {}

type StoredUserRow = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: Date | string;
};

const mapStoredUser = (row: StoredUserRow): StoredUser => {
  const createdAt = row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt;
  return { ...row, createdAt };
};

export const toAuthUser = ({ passwordHash: _passwordHash, ...user }: StoredUser): AuthUser => user;

export const findUserByEmail = async (email: string) => {
  const result = await query<StoredUserRow>(
    `
      SELECT
        id,
        name,
        email,
        password_hash AS "passwordHash",
        role,
        created_at AS "createdAt"
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [email],
  );

  const user = result.rows[0];
  return user ? mapStoredUser(user) : undefined;
};

export const createUser = async (input: {
  name: string;
  email: string;
  password: string;
  role: Role;
}) => {
  const nextUser: StoredUser = {
    id: randomUUID(),
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    role: input.role,
    createdAt: new Date().toISOString(),
  };

  try {
    await query(
      `
        INSERT INTO users (
          id,
          name,
          email,
          password_hash,
          role,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        nextUser.id,
        nextUser.name,
        nextUser.email,
        nextUser.passwordHash,
        nextUser.role,
        nextUser.createdAt,
      ],
    );
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    ) {
      throw new UserConflictError('A user with that email already exists.');
    }

    throw error;
  }

  return nextUser;
};

export const ensureSeedCommander = async () => {
  const existingUser = await findUserByEmail(config.seedCommanderEmail.toLowerCase());

  if (existingUser) {
    return existingUser;
  }

  return createUser({
    name: config.seedCommanderName,
    email: config.seedCommanderEmail.toLowerCase(),
    password: config.seedCommanderPassword,
    role: 'COMMANDER',
  });
};
