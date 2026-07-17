import { apiClient } from '../apiClient';
import type { Product, ProductCategory } from '../types';
import { normalizeCategory, normalizeProduct } from './apiUrl';

export const catalogApi = {
  async fetchProducts() {
    return (await apiClient.get<Product[]>('/products', '商品一覧の取得に失敗しました')).map(normalizeProduct);
  },
  async fetchProduct(id: string) {
    return normalizeProduct(await apiClient.get<Product>(`/products/${encodeURIComponent(id)}`, '商品情報の取得に失敗しました'));
  },
  async fetchProductCategories() {
    return (await apiClient.get<ProductCategory[]>('/product-categories', '商品カテゴリ一覧の取得に失敗しました')).map(normalizeCategory);
  },
};
