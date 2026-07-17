import { useEffect, useState } from 'react';
import type { Product, ProductCategory, CreateProductInput, UpdateProductInput } from '@/api';
import { useProductsApi } from '@/api/hook/useProductsApi';
import { useProductCategoriesApi } from '@/api/hook/useProductCategoriesApi';
import { useAdminAuth } from '@/features/admin-auth';

export function useProductMaster() {
  const { account } = useAdminAuth();
  const productsApi = useProductsApi();
  const categoriesApi = useProductCategoriesApi();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!account) return;
    setLoading(true);
    setError('');
    try {
      const [productList, categoryList] = await Promise.all([
        productsApi.fetchAllAdmin(),
        categoriesApi.fetchAllAdmin(),
      ]);
      setProducts(productList);
      setCategories(categoryList);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  const create = async (input: CreateProductInput) => {
    if (!account) return;
    await productsApi.createAdmin(input);
    await load();
  };

  const update = async (id: string, input: UpdateProductInput) => {
    if (!account) return;
    await productsApi.updateAdmin(id, input);
    await load();
  };

  const remove = async (id: string) => {
    if (!account) return;
    await productsApi.deleteAdmin(id);
    await load();
  };

  return { products, categories, loading, error, create, update, remove };
}
