export type Role = 'VIEWER' | 'COMMANDER';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  role: Role;
};

export type LoginResponse = {
  user: AuthUser;
  token: string;
};

export type CurrentUserResponse = {
  user: AuthUser;
};

export type RegisterResponse = {
  user: AuthUser;
};
