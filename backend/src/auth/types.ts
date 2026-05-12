export const roles = ['VIEWER', 'COMMANDER'] as const;

export type Role = (typeof roles)[number];

export type StoredUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: string;
};

export type AuthUser = Pick<StoredUser, 'id' | 'name' | 'email' | 'role'>;
