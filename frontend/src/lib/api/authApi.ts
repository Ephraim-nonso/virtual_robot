import { httpRequest } from './httpClient';
import type {
  CurrentUserResponse,
  LoginInput,
  LoginResponse,
  RegisterInput,
  RegisterResponse,
} from '../../features/auth/types';

export const loginUser = (input: LoginInput) =>
  httpRequest<LoginResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const registerUser = (input: RegisterInput) =>
  httpRequest<RegisterResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const getCurrentUser = () => httpRequest<CurrentUserResponse>('/api/auth/me');
