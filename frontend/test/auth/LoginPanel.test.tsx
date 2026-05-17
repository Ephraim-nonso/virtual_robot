import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LoginPanel } from '../../src/features/auth/components/LoginPanel';
import { AuthContext } from '../../src/features/auth/context/authStore';
import { createAuthSessionState } from '../helpers/stateFactories';

describe('LoginPanel', () => {
  it('submits login credentials in sign-in mode', async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <AuthContext.Provider value={createAuthSessionState({ login })}>
        <LoginPanel />
      </AuthContext.Provider>,
    );

    await user.type(screen.getByLabelText('Email'), 'viewer@example.com');
    const passwordInput = screen.getByLabelText('Password');
    await user.type(passwordInput, 'password123');
    const loginForm = passwordInput.closest('form') as HTMLFormElement;
    await user.click(within(loginForm).getByRole('button', { name: 'Sign in' }));

    expect(login).toHaveBeenCalledWith({
      email: 'viewer@example.com',
      password: 'password123',
    });
  });

  it('switches to create-account mode and submits the selected role', async () => {
    const register = vi.fn().mockResolvedValue({
      id: 'viewer-2',
      name: 'New Viewer',
      email: 'new@example.com',
      role: 'COMMANDER',
    });
    const user = userEvent.setup();

    render(
      <AuthContext.Provider value={createAuthSessionState({ register })}>
        <LoginPanel />
      </AuthContext.Provider>,
    );

    await user.click(screen.getAllByRole('button', { name: 'Create account' })[0]);

    await user.type(screen.getByLabelText('Full name'), 'New Commander');
    await user.type(screen.getByLabelText('Email'), 'new@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.selectOptions(screen.getByLabelText('Access role'), 'COMMANDER');
    const accessRoleSelect = screen.getByLabelText('Access role');
    const registerForm = accessRoleSelect.closest('form') as HTMLFormElement;
    await user.click(within(registerForm).getByRole('button', { name: 'Create account' }));

    expect(register).toHaveBeenCalledWith({
      name: 'New Commander',
      email: 'new@example.com',
      password: 'password123',
      role: 'COMMANDER',
    });

    expect(await screen.findByText('Account created successfully. Sign in with your new credentials.')).toBeInTheDocument();
  });
});
