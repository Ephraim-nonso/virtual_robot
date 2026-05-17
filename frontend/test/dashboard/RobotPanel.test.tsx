import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RobotPanel } from '../../src/features/dashboard/components/RobotPanel';
import { AuthContext } from '../../src/features/auth/context/authStore';
import { DashboardContext } from '../../src/features/dashboard/context/dashboardStore';
import { createAuthSessionState, createDashboardState } from '../helpers/stateFactories';

describe('RobotPanel RBAC', () => {
  it('hides commander actions for viewers', () => {
    render(
      <AuthContext.Provider
        value={createAuthSessionState({
          user: {
            id: 'viewer-1',
            name: 'Viewer',
            email: 'viewer@example.com',
            role: 'VIEWER',
          },
          isCommander: false,
        })}
      >
        <DashboardContext.Provider value={createDashboardState()}>
          <RobotPanel />
        </DashboardContext.Provider>
      </AuthContext.Provider>,
    );

    expect(screen.getByText('Commander access required')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Move robot' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset simulation' })).not.toBeInTheDocument();
  });

  it('shows move and reset actions for commanders', () => {
    render(
      <AuthContext.Provider value={createAuthSessionState()}>
        <DashboardContext.Provider value={createDashboardState()}>
          <RobotPanel />
        </DashboardContext.Provider>
      </AuthContext.Provider>,
    );

    expect(screen.getByRole('button', { name: 'Move robot' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset simulation' })).toBeInTheDocument();
  });
});
