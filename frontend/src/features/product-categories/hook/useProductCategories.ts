import { useEffect, useState } from 'react';
import type { ProductCategory, ProductCategoryInput } from '@/api';
import { useProductCategoriesApi } from '@/api/hook/useProductCategoriesApi';
import { useAdminAuth } from '@/features/admin-auth';

export function useProductCategories() {
  const { account } = useAdminAuth();
  const api = useProductCategoriesApi();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    if (!account) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.fetchAllAdmin();
      setCategories(data);
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

  // create/update/removeはエラーを飲み込まずそのまま呼び出し元(フォーム側)に伝える。
  // フォーム側でダイアログを閉じずにエラーを表示するために必要。
  const create = async (input: ProductCategoryInput) => {
    if (!account) return;
    await api.createAdmin(input);
    await load();
  };

  const update = async (id: number, input: ProductCategoryInput) => {
    if (!account) return;
    await api.updateAdmin(id, input);
    await load();
  };

  const remove = async (id: number) => {
    if (!account) return;
    await api.deleteAdmin(id);
    await load();
  };

  return { categories, loading, error, create, update, remove };
}
