import { useEffect, useState } from 'react';
import { fetchProduct, Product } from '@/api';

export function useProductDetail(productId: string | undefined) {
  const [product, setProduct] = useState<Product | null>(null);
  // 入力途中で「1」を消して別の値を入力できるよう、空文字を保持できる文字列で管理する。
  const [quantity, setQuantity] = useState('1');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!productId) return;
    fetchProduct(productId).then(setProduct).catch((e) => setError(e.message));
  }, [productId]);

  return {
    product,
    quantity,
    setQuantity,
    error,
  };
}
