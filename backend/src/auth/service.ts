import { AuthenticationError } from './middleware.js';
import { verifyPassword } from './passwords.js';
import { createAuthToken } from './tokenService.js';
import { createUser, ensureSeedCommander, findUserByEmail, toAuthUser } from './userStore.js';
import type { Role } from './types.js';

export const initializeAuth = async () => {
  await ensureSeedCommander();
};

export const registerUser = async (input: {
  name: string;
  email: string;
  password: string;
  role: Role;
}) => {
  const user = await createUser({
    ...input,
  });

  return toAuthUser(user);
};

export const loginUser = async (input: { email: string; password: string }) => {
  const user = findUserByEmail(input.email);

  if (!user) {
    throw new AuthenticationError('Invalid email or password.');
  }

  const isPasswordValid = await verifyPassword(input.password, user.passwordHash);

  if (!isPasswordValid) {
    throw new AuthenticationError('Invalid email or password.');
  }

  const authUser = toAuthUser(user);

  return {
    user: authUser,
    token: createAuthToken(authUser),
  };
};
