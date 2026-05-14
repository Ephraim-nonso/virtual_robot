import { createContext } from 'react';

import { useDashboard } from '../hooks/useDashboard';

export type DashboardState = ReturnType<typeof useDashboard>;

export const DashboardContext = createContext<DashboardState | null>(null);
