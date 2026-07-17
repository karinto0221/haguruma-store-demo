import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { Product } from '@/api';
import { useCatalogApi } from '@/api/hook/useCatalogApi';
import { useOrdersApi } from '@/api/hook/useOrdersApi';

export function useOrderForm(productId: string | undefined) {
  const navigate = useNavigate();
  const catalogApi = useCatalogApi();
  const ordersApi = useOrdersApi();
  const [searchParams] = useSearchParams();

  const [product, setProduct] = useState<Product | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [quantity, setQuantity] = useState(() => {
    const requested = Number(searchParams.get('quantity'));
    return Number.isInteger(requested) && requested > 0 ? requested : 1;
  });
  const [notes, setNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!productId) return;
    catalogApi.fetchProduct(productId).then(setProduct).catch((e) => setError(e.message));
  }, [productId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!productId) return;
    setSubmitting(true);
    setError('');
    try {
      const { orderId } = await ordersApi.create({
        productId,
        customerName,
        customerEmail,
        customerPhone,
        quantity,
        notes,
        files,
      });
      navigate('/confirm', { state: { orderId } });
    } catch (e: any) {
      setError(e.message || '送信に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  return {
    product,
    customerName,
    setCustomerName,
    customerEmail,
    setCustomerEmail,
    customerPhone,
    setCustomerPhone,
    quantity,
    setQuantity,
    notes,
    setNotes,
    files,
    setFiles,
    submitting,
    error,
    handleSubmit,
  };
}
