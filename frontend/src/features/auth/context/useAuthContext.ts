import { useContext } from 'react';

import { AuthContext } from './authStore';

export const useAuthContext = () => {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error('useAuthContext must be used inside AuthProvider.');
  }

  return value;
};
