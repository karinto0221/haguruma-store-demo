import { clientApi } from '../clientApi';
import type { CreateProductInput, UpdateProductInput } from '../types';
import { useApiRequest } from './useApiRequest';
export function useProductsApi() {
  const request = useApiRequest();
  return {
    ...request,
    fetchAllAdmin: () => request.execute(clientApi.products.fetchAllAdmin),
    createAdmin: (input: CreateProductInput) => request.execute(() => clientApi.products.createAdmin(input)),
    updateAdmin: (id: string, input: UpdateProductInput) => request.execute(() => clientApi.products.updateAdmin(id, input)),
    deleteAdmin: (id: string) => request.execute(() => clientApi.products.deleteAdmin(id)),
  };
}
