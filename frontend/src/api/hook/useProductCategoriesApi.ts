import { clientApi } from '../clientApi';
import type { ProductCategoryInput } from '../types';
import { useApiRequest } from './useApiRequest';
export function useProductCategoriesApi() {
  const request = useApiRequest();
  return {
    ...request,
    fetchAllAdmin: () => request.execute(clientApi.productCategories.fetchAllAdmin),
    createAdmin: (input: ProductCategoryInput) => request.execute(() => clientApi.productCategories.createAdmin(input)),
    updateAdmin: (id: number, input: ProductCategoryInput) => request.execute(() => clientApi.productCategories.updateAdmin(id, input)),
    deleteAdmin: (id: number) => request.execute(() => clientApi.productCategories.deleteAdmin(id)),
  };
}
