import { useContext } from 'react';

import { DashboardContext } from './dashboardStore';

export const useDashboardContext = () => {
  const value = useContext(DashboardContext);

  if (!value) {
    throw new Error('useDashboardContext must be used inside DashboardProvider.');
  }

  return value;
};
