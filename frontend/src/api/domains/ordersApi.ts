import { apiClient } from '../apiClient';
import type { CreateOrderInput, OrderAnalysisMessage, OrderAnalysisResult, OrderRecord, OrdersSearchFilter, OrderStatus } from '../types';

export const ordersApi = {
  async create(input: CreateOrderInput) {
    const form = new FormData();
    form.append('productId', input.productId); form.append('customerName', input.customerName);
    form.append('customerEmail', input.customerEmail); form.append('quantity', String(input.quantity));
    if (input.customerPhone) form.append('customerPhone', input.customerPhone);
    if (input.notes) form.append('notes', input.notes);
    input.files.forEach((file) => form.append('files', file));
    return apiClient.post<{ orderId: string }>('/orders', form, '注文の送信に失敗しました');
  },
  fetchAllAdmin(filter: OrdersSearchFilter = {}) {
    const params = new URLSearchParams();
    if (filter.status) params.set('status', filter.status);
    if (filter.keyword) params.set('keyword', filter.keyword);
    if (filter.dateFrom) params.set('dateFrom', filter.dateFrom);
    if (filter.dateTo) params.set('dateTo', filter.dateTo);
    if (filter.includeCompleted) params.set('includeCompleted', 'true');
    const query = params.toString();
    return apiClient.get<OrderRecord[]>(`/orders${query ? `?${query}` : ''}`, '注文一覧の取得に失敗しました');
  },
  fetchOneAdmin(id: string) {
    return apiClient.get<OrderRecord>(`/orders/${encodeURIComponent(id)}`, '注文詳細の取得に失敗しました');
  },
  fetchAttachmentAdmin(id: string, fileIndex: number) {
    return apiClient.blob(`/orders/${encodeURIComponent(id)}/files/${fileIndex}`, '添付ファイルの取得に失敗しました');
  },
  updateStatusAdmin(id: string, status: OrderStatus) {
    return apiClient.patch<OrderRecord>(`/orders/${encodeURIComponent(id)}/status`, { status }, 'ステータスの更新に失敗しました');
  },
  sendPaymentLinkAdmin(id: string, paymentLink: string) {
    return apiClient.post<OrderRecord>(`/orders/${encodeURIComponent(id)}/send-payment-link`, { paymentLink }, '送信に失敗しました');
  },
  analyzeAdmin(question: string, history: OrderAnalysisMessage[]) {
    return apiClient.post<OrderAnalysisResult>('/order-analysis', { question, history }, '注文分析に失敗しました');
  },
};
