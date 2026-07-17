import { accountsApi } from './domains/accountsApi';
import { authApi } from './domains/authApi';
import { catalogApi } from './domains/catalogApi';
import { ordersApi } from './domains/ordersApi';
import { productCategoriesApi } from './domains/productCategoriesApi';
import { productsApi } from './domains/productsApi';

// 全ドメインAPIの一覧。各実装はdomains配下で同じapiClientを利用する。
export const clientApi = {
  auth: authApi,
  catalog: catalogApi,
  orders: ordersApi,
  productCategories: productCategoriesApi,
  products: productsApi,
  accounts: accountsApi,
};

export type { AdminAccount, CreateAdminAccountInput, UpdateAdminAccountInput } from './types';
