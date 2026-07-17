import { apiClient } from '../apiClient';
import type { ProductCategory, ProductCategoryInput } from '../types';
import { normalizeCategory } from './apiUrl';

async function uploadImage(id: number, image: File) {
  const form = new FormData(); form.append('image', image);
  return normalizeCategory(await apiClient.put<ProductCategory>(`/product-categories/${id}/image`, form, 'カテゴリ画像の保存に失敗しました'));
}

export const productCategoriesApi = {
  async fetchAllAdmin() {
    return (await apiClient.get<ProductCategory[]>('/product-categories', '商品カテゴリ一覧の取得に失敗しました')).map(normalizeCategory);
  },
  async createAdmin(input: ProductCategoryInput) {
    const category = normalizeCategory(await apiClient.post<ProductCategory>('/product-categories', { name: input.name }, '商品カテゴリの作成に失敗しました'));
    return input.image ? uploadImage(category.id, input.image) : category;
  },
  async updateAdmin(id: number, input: ProductCategoryInput) {
    const category = normalizeCategory(await apiClient.patch<ProductCategory>(`/product-categories/${id}`, { name: input.name }, '商品カテゴリの更新に失敗しました'));
    return input.image ? uploadImage(id, input.image) : category;
  },
  deleteAdmin(id: number) {
    return apiClient.delete(`/product-categories/${id}`, '商品カテゴリの削除に失敗しました');
  },
};
