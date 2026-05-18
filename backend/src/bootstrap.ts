import { initializeAuth } from './auth/service.js';
import { initializeDatabase } from './database.js';

export const initializeBackend = async () => {
  await initializeDatabase();
  await initializeAuth();
};
