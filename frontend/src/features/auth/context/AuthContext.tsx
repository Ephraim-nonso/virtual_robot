import type { PropsWithChildren } from 'react';

import { useAuthSession } from '../hooks/useAuthSession';
import { AuthContext } from './authStore';

export const AuthProvider = ({ children }: PropsWithChildren) => {
  const value = useAuthSession();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
