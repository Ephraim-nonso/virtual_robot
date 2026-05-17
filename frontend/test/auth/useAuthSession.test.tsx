import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthSession } from '../../src/features/auth/hooks/useAuthSession';
import { ApiError } from '../../src/lib/api/httpClient';

const authApiMocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  loginUser: vi.fn(),
  registerUser: vi.fn(),
}));

const storageMocks = vi.hoisted(() => ({
  getStoredAuthToken: vi.fn(),
  storeAuthToken: vi.fn(),
  clearStoredAuthToken: vi.fn(),
}));

vi.mock('../../src/lib/api/authApi', () => ({
  getCurrentUser: authApiMocks.getCurrentUser,
  loginUser: authApiMocks.loginUser,
  registerUser: authApiMocks.registerUser,
}));

vi.mock('../../src/features/auth/lib/authStorage', () => ({
  getStoredAuthToken: storageMocks.getStoredAuthToken,
  storeAuthToken: storageMocks.storeAuthToken,
  clearStoredAuthToken: storageMocks.clearStoredAuthToken,
}));

describe('useAuthSession', () => {
  beforeEach(() => {
    authApiMocks.getCurrentUser.mockReset();
    authApiMocks.loginUser.mockReset();
    authApiMocks.registerUser.mockReset();
    storageMocks.getStoredAuthToken.mockReset();
    storageMocks.storeAuthToken.mockReset();
    storageMocks.clearStoredAuthToken.mockReset();
  });

  it('restores an existing authenticated session from /api/auth/me', async () => {
    storageMocks.getStoredAuthToken.mockReturnValue('jwt-token');
    authApiMocks.getCurrentUser.mockResolvedValue({
      user: {
        id: 'viewer-1',
        name: 'Viewer',
        email: 'viewer@example.com',
        role: 'VIEWER',
      },
    });

    const { result } = renderHook(() => useAuthSession());

    await waitFor(() => expect(result.current.status).toBe('authenticated'));

    expect(result.current.user?.email).toBe('viewer@example.com');
    expect(result.current.isCommander).toBe(false);
  });

  it('logs in and stores the returned JWT', async () => {
    storageMocks.getStoredAuthToken.mockReturnValue(null);
    authApiMocks.loginUser.mockResolvedValue({
      token: 'fresh-token',
      user: {
        id: 'commander-1',
        name: 'Commander',
        email: 'commander@example.com',
        role: 'COMMANDER',
      },
    });

    const { result } = renderHook(() => useAuthSession());

    await waitFor(() => expect(result.current.status).toBe('unauthenticated'));

    await act(async () => {
      await result.current.login({
        email: 'commander@example.com',
        password: 'change-me',
      });
    });

    expect(storageMocks.storeAuthToken).toHaveBeenCalledWith('fresh-token');
    expect(result.current.status).toBe('authenticated');
    expect(result.current.user?.role).toBe('COMMANDER');
  });

  it('clears invalid stored tokens when session restore gets a 401', async () => {
    storageMocks.getStoredAuthToken.mockReturnValue('expired-token');
    authApiMocks.getCurrentUser.mockRejectedValue(new ApiError('Unauthorized', 401));

    const { result } = renderHook(() => useAuthSession());

    await waitFor(() => expect(result.current.status).toBe('unauthenticated'));
    expect(storageMocks.clearStoredAuthToken).toHaveBeenCalled();
  });
});
