import { useCallback, useEffect, useMemo, useState } from 'react';

import { getCurrentUser, loginUser as loginUserRequest, registerUser as registerUserRequest } from '../../../lib/api/authApi';
import { ApiError } from '../../../lib/api/httpClient';
import { clearStoredAuthToken, getStoredAuthToken, storeAuthToken } from '../lib/authStorage';
import type { AuthUser, LoginInput, RegisterInput } from '../types';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export const useAuthSession = () => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const logout = useCallback(() => {
    clearStoredAuthToken();
    setUser(null);
    setError(null);
    setStatus('unauthenticated');
  }, []);

  const restoreSession = useCallback(async () => {
    const existingToken = getStoredAuthToken();

    if (!existingToken) {
      setStatus('unauthenticated');
      return;
    }

    try {
      const result = await getCurrentUser();
      setUser(result.user);
      setStatus('authenticated');
      setError(null);
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) {
        logout();
        return;
      }

      const message =
        requestError instanceof Error ? requestError.message : 'Unable to restore the current session.';
      setError(message);
      logout();
    }
  }, [logout]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void restoreSession();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [restoreSession]);

  const login = useCallback(
    async (input: LoginInput) => {
      setIsSubmitting(true);
      setError(null);

      try {
        const result = await loginUserRequest(input);
        storeAuthToken(result.token);
        setUser(result.user);
        setStatus('authenticated');
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : 'Unable to sign in.';
        setError(message);
        setStatus('unauthenticated');
        throw requestError;
      } finally {
        setIsSubmitting(false);
      }
    },
    [],
  );

  const register = useCallback(async (input: RegisterInput) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await registerUserRequest(input);
      setStatus('unauthenticated');
      return result.user;
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unable to create account.';
      setError(message);
      setStatus('unauthenticated');
      throw requestError;
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  const isCommander = user?.role === 'COMMANDER';

  return useMemo(
    () => ({
      status,
      user,
      error,
      isSubmitting,
      isAuthenticated: status === 'authenticated',
      isCommander,
      login,
      register,
      logout,
      clearError: () => setError(null),
    }),
    [error, isCommander, isSubmitting, login, logout, register, status, user],
  );
};
