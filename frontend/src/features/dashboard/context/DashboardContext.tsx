import type { PropsWithChildren } from 'react';

import { useDashboard } from '../hooks/useDashboard';
import { DashboardContext } from './dashboardStore';

export const DashboardProvider = ({ children }: PropsWithChildren) => {
  const value = useDashboard();
  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
};
