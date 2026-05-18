import type { FormEvent } from 'react';
import { useState } from 'react';

import '../auth.css';
import { useAuthContext } from '../context/useAuthContext';
import type { Role } from '../types';

export const LoginPanel = () => {
  const { error, isSubmitting, login, register, clearError } = useAuthContext();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('VIEWER');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const switchMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setSuccessMessage(null);
    clearError();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    clearError();
    setSuccessMessage(null);

    try {
      if (mode === 'register') {
        await register({ name, email, password, role });
        setPassword('');
        setMode('login');
        setSuccessMessage('Account created successfully. Sign in with your new credentials.');
        return;
      }

      await login({ email, password });
    } catch {
      // Auth context surfaces the error state for the panel.
    }
  };

  return (
    <section className="auth-layout">
      <article className="panel auth-panel auth-form-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Authentication</p>
            <h2>{mode === 'login' ? 'Sign in to ground control' : 'Create an account'}</h2>
            <p className="panel-subcopy">
              {mode === 'login'
                ? 'Use a valid backend account to unlock protected robot status, telemetry, and commander controls.'
                : 'Create a new account and choose whether it should start with viewer or commander access.'}
            </p>
          </div>
        </div>

        <div className="auth-mode-switch" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            className={`auth-mode-button ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`auth-mode-button ${mode === 'register' ? 'active' : ''}`}
            onClick={() => switchMode('register')}
          >
            Create account
          </button>
        </div>

        <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
          {mode === 'register' ? (
            <>
              <label>
                Full name
                <input value={name} onChange={(event) => setName(event.target.value)} minLength={2} required />
              </label>
              <label>
                Access role
                <select value={role} onChange={(event) => setRole(event.target.value as Role)}>
                  <option value="VIEWER">Viewer</option>
                  <option value="COMMANDER">Commander</option>
                </select>
              </label>
            </>
          ) : null}
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? mode === 'login'
                ? 'Signing in...'
                : 'Creating account...'
              : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
          </button>
        </form>

        {successMessage ? <div className="banner auth-success-banner">{successMessage}</div> : null}
        {error ? <div className="banner error auth-error-banner">{error}</div> : null}
      </article>

      <article className="panel auth-panel auth-rbac-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Access Rules</p>
            <h2>Role permissions</h2>
            <p className="panel-subcopy">Choose the access pattern that matches the operator you are onboarding.</p>
          </div>
        </div>

        <div className="auth-role-grid">
          <div className="auth-role-card">
            <strong>Viewer</strong>
            <p>Can view robot status, sensor data, audit-safe dashboard content, and authenticated telemetry.</p>
          </div>
          <div className="auth-role-card">
            <strong>Commander</strong>
            <p>Can do everything a viewer can, plus move the robot and reset the simulator from the dashboard.</p>
          </div>
        </div>
      </article>
    </section>
  );
};
