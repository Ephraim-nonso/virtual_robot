import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import { config } from '../config.js';
import { hashPassword } from './passwords.js';
import type { AuthUser, Role, StoredUser } from './types.js';

type UserCollection = {
  users: StoredUser[];
};

export class UserConflictError extends Error {}

const ensureStoreExists = () => {
  fs.mkdirSync(path.dirname(config.authUsersFilePath), { recursive: true });

  if (!fs.existsSync(config.authUsersFilePath)) {
    fs.writeFileSync(
      config.authUsersFilePath,
      JSON.stringify({ users: [] } satisfies UserCollection, null, 2),
      'utf8',
    );
  }
};

const readStore = (): UserCollection => {
  ensureStoreExists();
  const content = fs.readFileSync(config.authUsersFilePath, 'utf8');
  return JSON.parse(content) as UserCollection;
};

const writeStore = (store: UserCollection) => {
  ensureStoreExists();
  fs.writeFileSync(config.authUsersFilePath, JSON.stringify(store, null, 2), 'utf8');
};

export const toAuthUser = ({ passwordHash: _passwordHash, ...user }: StoredUser): AuthUser => user;

export const findUserByEmail = (email: string) =>
  readStore().users.find((user) => user.email === email);

export const createUser = async (input: {
  name: string;
  email: string;
  password: string;
  role: Role;
}) => {
  const store = readStore();

  if (store.users.some((user) => user.email === input.email)) {
    throw new UserConflictError('A user with that email already exists.');
  }

  const nextUser: StoredUser = {
    id: randomUUID(),
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    role: input.role,
    createdAt: new Date().toISOString(),
  };

  store.users.push(nextUser);
  writeStore(store);

  return nextUser;
};

export const ensureSeedCommander = async () => {
  const existingUser = findUserByEmail(config.seedCommanderEmail.toLowerCase());

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
