import { clientApi } from '../clientApi';
import { useApiRequest } from './useApiRequest';
export function useCatalogApi() {
  const request = useApiRequest();
  return {
    ...request,
    fetchProducts: () => request.execute(clientApi.catalog.fetchProducts),
    fetchProduct: (id: string) => request.execute(() => clientApi.catalog.fetchProduct(id)),
    fetchProductCategories: () => request.execute(clientApi.catalog.fetchProductCategories),
  };
}
