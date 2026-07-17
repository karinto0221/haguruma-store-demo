import { useEffect, useState } from 'react';
import type { ProductCategory } from '@/api';
import { useCatalogApi } from '@/api/hook/useCatalogApi';
import type { CategoryGridColumns } from '../type';

export function useProductSelect() {
  const api = useCatalogApi();
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [columns, setColumns] = useState<CategoryGridColumns>(2);

  useEffect(() => {
    api.fetchProductCategories()
      .then(setCategories)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return {
    categories,
    loading,
    error,
    columns,
    setColumns,
  };
}
