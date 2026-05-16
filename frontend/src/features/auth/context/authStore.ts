import { createContext } from 'react';

import type { useAuthSession } from '../hooks/useAuthSession';

export type AuthSessionState = ReturnType<typeof useAuthSession>;

export const AuthContext = createContext<AuthSessionState | null>(null);
