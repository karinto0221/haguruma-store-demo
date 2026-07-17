import { destroySession, establishSession } from '../apiClient';
import type { AdminCredentials } from '../types';

export const authApi = {
  login: (credentials: AdminCredentials) => establishSession(credentials.id, credentials.password),
  logout: destroySession,
};
