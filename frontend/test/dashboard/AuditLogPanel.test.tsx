import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AuditLogPanel } from '../../src/features/dashboard/components/AuditLogPanel';
import { DashboardContext } from '../../src/features/dashboard/context/dashboardStore';
import { createDashboardState } from '../helpers/stateFactories';

describe('AuditLogPanel', () => {
  it('renders command and status mission history items', () => {
    render(
      <DashboardContext.Provider
        value={createDashboardState({
          commandAuditItems: [
            {
              id: 1,
              createdAt: '2026-05-17T12:00:00.000Z',
              actor: 'system',
              commandType: 'MOVE',
              requestPayload: '{"x":1,"y":2}',
              resultStatus: 'SUCCEEDED',
              responsePayload: '{"ok":true}',
              errorMessage: null,
            },
          ],
          statusAuditItems: [
            {
              id: 2,
              createdAt: '2026-05-17T12:01:00.000Z',
              source: 'status_poll',
              robotId: 'robot-1',
              positionX: 1,
              positionY: 2,
              battery: 77,
              robotStatus: 'MOVING',
              rawPayload: '{"id":"robot-1"}',
            },
          ],
        })}
      >
        <AuditLogPanel />
      </DashboardContext.Provider>,
    );

    expect(screen.getByText('MOVE')).toBeInTheDocument();
    expect(screen.getByText(/Request:/)).toBeInTheDocument();
    expect(screen.getByText('MOVING')).toBeInTheDocument();
    expect(screen.getByText(/Position \(1, 2\) with battery 77%/)).toBeInTheDocument();
  });

  it('refreshes mission history on demand', async () => {
    const loadAuditHistory = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <DashboardContext.Provider value={createDashboardState({ loadAuditHistory })}>
        <AuditLogPanel />
      </DashboardContext.Provider>,
    );

    await user.click(screen.getByRole('button', { name: 'Refresh history' }));
    expect(loadAuditHistory).toHaveBeenCalled();
  });
});
