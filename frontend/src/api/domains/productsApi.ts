import { apiClient } from '../apiClient';
import type { CreateProductInput, Product, UpdateProductInput } from '../types';
import { normalizeProduct } from './apiUrl';

async function uploadImage(id: string, image: File) {
  const form = new FormData(); form.append('image', image);
  return normalizeProduct(await apiClient.put<Product>(`/products/${encodeURIComponent(id)}/image`, form, '商品画像の保存に失敗しました'));
}

export const productsApi = {
  async fetchAllAdmin() {
    return (await apiClient.get<Product[]>('/products', '商品一覧の取得に失敗しました')).map(normalizeProduct);
  },
  async createAdmin(input: CreateProductInput) {
    const product = normalizeProduct(await apiClient.post<Product>('/products', {
      id: input.id, name: input.name, description: input.description,
      priceFrom: input.priceFrom, productCategoryId: input.productCategoryId,
    }, '商品の作成に失敗しました'));
    return input.image ? uploadImage(product.id, input.image) : product;
  },
  async updateAdmin(id: string, input: UpdateProductInput) {
    const product = normalizeProduct(await apiClient.patch<Product>(`/products/${encodeURIComponent(id)}`, {
      name: input.name, description: input.description, priceFrom: input.priceFrom,
      productCategoryId: input.productCategoryId,
    }, '商品の更新に失敗しました'));
    return input.image ? uploadImage(id, input.image) : product;
  },
  deleteAdmin(id: string) {
    return apiClient.delete(`/products/${encodeURIComponent(id)}`, '商品の削除に失敗しました');
  },
};
