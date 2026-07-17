import { useCallback, useEffect, useRef, useState } from 'react';
import type { OrderRecord, OrderStatus } from '@/api';
import { useOrdersApi } from '@/api/hook/useOrdersApi';
import { useAdminAuth } from '@/features/admin-auth';
import { AttachmentKind, OrderAttachment } from '../type';

function getAttachmentKind(fileName: string): AttachmentKind {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'].includes(extension || '')) {
    return 'image';
  }
  if (extension === 'pdf') return 'pdf';
  return 'other';
}

export function useOrderDetail(orderId: string | undefined) {
  const { account } = useAdminAuth();
  const api = useOrdersApi();
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [attachments, setAttachments] = useState<OrderAttachment[]>([]);
  const [paymentLink, setPaymentLink] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const objectUrls = useRef<string[]>([]);

  const clearObjectUrls = useCallback(() => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current = [];
  }, []);

  useEffect(() => {
    if (!account || !orderId) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    setSuccess('');
    setAttachments([]);

    const load = async () => {
      try {
        const data = await api.fetchOneAdmin(orderId);
        if (cancelled) return;
        setOrder(data);
        setPaymentLink(data.paymentLink || '');

        const loadedAttachments = await Promise.all(
          data.fileNames.map(async (name, index): Promise<OrderAttachment> => {
            try {
              const blob = await api.fetchAttachmentAdmin(orderId, index);
              if (cancelled) {
                return { index, name, kind: getAttachmentKind(name) };
              }
              const url = URL.createObjectURL(blob);
              objectUrls.current.push(url);
              return { index, name, kind: getAttachmentKind(name), url };
            } catch (e: any) {
              return {
                index,
                name,
                kind: getAttachmentKind(name),
                error: e.message || 'ファイルを読み込めませんでした',
              };
            }
          }),
        );
        if (!cancelled) setAttachments(loadedAttachments);
      } catch (e: any) {
        if (!cancelled) setError(e.message || '注文詳細の取得に失敗しました');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    clearObjectUrls();
    load();
    return () => {
      cancelled = true;
      clearObjectUrls();
    };
  }, [account, clearObjectUrls, orderId]);

  const updateStatus = async (status: OrderStatus) => {
    if (!account || !orderId) return;
    setSavingStatus(true);
    setError('');
    setSuccess('');
    try {
      setOrder(await api.updateStatusAdmin(orderId, status));
      setSuccess('注文ステータスを更新しました。');
    } catch (e: any) {
      setError(e.message || 'ステータスの更新に失敗しました');
    } finally {
      setSavingStatus(false);
    }
  };

  const sendPaymentLink = async () => {
    if (!account || !orderId || !paymentLink.trim()) return;
    setSending(true);
    setError('');
    setSuccess('');
    try {
      const updated = await api.sendPaymentLinkAdmin(orderId, paymentLink.trim());
      setOrder(updated);
      setPaymentLink(updated.paymentLink || paymentLink.trim());
      setSuccess('支払いURLをお客様へ送信しました。');
    } catch (e: any) {
      setError(e.message || '支払いURLの送信に失敗しました');
    } finally {
      setSending(false);
    }
  };

  return {
    order,
    attachments,
    paymentLink,
    setPaymentLink,
    loading,
    savingStatus,
    sending,
    error,
    success,
    updateStatus,
    sendPaymentLink,
  };
}
