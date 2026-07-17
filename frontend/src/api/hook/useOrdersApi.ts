import { clientApi } from '../clientApi';
import type { CreateOrderInput, OrderAnalysisMessage, OrdersSearchFilter, OrderStatus } from '../types';
import { useApiRequest } from './useApiRequest';
export function useOrdersApi() {
  const request = useApiRequest();
  return {
    ...request,
    create: (input: CreateOrderInput) => request.execute(() => clientApi.orders.create(input)),
    fetchAllAdmin: (filter?: OrdersSearchFilter) => request.execute(() => clientApi.orders.fetchAllAdmin(filter)),
    fetchOneAdmin: (id: string) => request.execute(() => clientApi.orders.fetchOneAdmin(id)),
    fetchAttachmentAdmin: (id: string, index: number) => request.execute(() => clientApi.orders.fetchAttachmentAdmin(id, index)),
    updateStatusAdmin: (id: string, status: OrderStatus) => request.execute(() => clientApi.orders.updateStatusAdmin(id, status)),
    sendPaymentLinkAdmin: (id: string, link: string) => request.execute(() => clientApi.orders.sendPaymentLinkAdmin(id, link)),
    analyzeAdmin: (question: string, history: OrderAnalysisMessage[]) => request.execute(() => clientApi.orders.analyzeAdmin(question, history)),
  };
}
