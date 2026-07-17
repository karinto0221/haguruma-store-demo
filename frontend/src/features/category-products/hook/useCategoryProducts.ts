import { useEffect, useMemo, useState } from 'react';
import type { Product, ProductCategory } from '@/api';
import { useCatalogApi } from '@/api/hook/useCatalogApi';
import type { ProductGridColumns } from '../type';

export function useCategoryProducts(categoryId: string | undefined) {
  const api = useCatalogApi();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [columns, setColumns] = useState<ProductGridColumns>(2);

  useEffect(() => {
    Promise.all([api.fetchProducts(), api.fetchProductCategories()])
      .then(([productList, categoryList]) => {
        setProducts(productList);
        setCategories(categoryList);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const numericCategoryId = Number(categoryId);
  const category = useMemo(
    () => categories.find((item) => item.id === numericCategoryId),
    [categories, numericCategoryId],
  );
  const filteredProducts = useMemo(
    () => products.filter((product) => product.productCategoryId === numericCategoryId),
    [products, numericCategoryId],
  );

  return {
    category,
    filteredProducts,
    loading,
    error,
    columns,
    setColumns,
  };
}
