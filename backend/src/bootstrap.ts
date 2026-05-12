import { initializeAuth } from './auth/service.js';
import { getDatabase } from './database.js';

export const initializeBackend = async () => {
  getDatabase();
  await initializeAuth();
};
