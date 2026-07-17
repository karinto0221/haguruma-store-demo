import { clientApi } from '../clientApi';
import type { AdminCredentials } from '../types';
import { initializeApiAuth, setUnauthorizedHandler } from '../apiClient';
import { useApiRequest } from './useApiRequest';
export function useAuthApi() {
  const request = useApiRequest();
  return {
    ...request,
    login: (credentials: AdminCredentials) => request.execute(() => clientApi.auth.login(credentials)),
    logout: () => request.execute(clientApi.auth.logout),
    initialize: initializeApiAuth,
    setUnauthorizedHandler,
  };
}
