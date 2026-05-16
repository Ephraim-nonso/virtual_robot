import { getStoredAuthToken } from '../../features/auth/lib/authStorage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export const httpRequest = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const headers = new Headers(init?.headers);
  const authToken = getStoredAuthToken();

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (authToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `Request failed: ${response.status}`;

    try {
      const errorBody = (await response.json()) as { message?: string; error?: string };
      errorMessage = errorBody.message ?? errorBody.error ?? errorMessage;
    } catch {
      // Ignore parse failures and fall back to status-based messaging.
    }

    throw new ApiError(errorMessage, response.status);
  }

  return response.json() as Promise<T>;
};

export const getApiBaseUrl = () => API_BASE_URL;
