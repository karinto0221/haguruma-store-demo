// 既存featureから型・定数を参照するための公開口。API実装はdomains配下に統一する。
export * from './types';
export { clientApi } from './clientApi';

export { catalogApi } from './domains/catalogApi';
export { ordersApi } from './domains/ordersApi';
export { productCategoriesApi } from './domains/productCategoriesApi';
export { productsApi } from './domains/productsApi';
export { accountsApi } from './domains/accountsApi';
export { authApi } from './domains/authApi';
