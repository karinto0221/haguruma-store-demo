import { clientApi } from '../clientApi';
import type { CreateAdminAccountInput, UpdateAdminAccountInput } from '../types';
import { useApiRequest } from './useApiRequest';
export function useAdminAccountsApi() {
  const request = useApiRequest();
  return {
    ...request,
    fetchAll: () => request.execute(clientApi.accounts.fetchAll),
    create: (input: CreateAdminAccountInput) => request.execute(() => clientApi.accounts.create(input)),
    update: (id: string, input: UpdateAdminAccountInput) => request.execute(() => clientApi.accounts.update(id, input)),
    updatePassword: (id: string, password: string) => request.execute(() => clientApi.accounts.updatePassword(id, password)),
  };
}
