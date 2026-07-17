import { useEffect, useState } from 'react';
import type { OrderRecord, OrdersSearchFilter } from '@/api';
import { useOrdersApi } from '@/api/hook/useOrdersApi';
import { useAdminAuth } from '@/features/admin-auth';

const EMPTY_FILTER: OrdersSearchFilter = {
  status: '',
  keyword: '',
  dateFrom: '',
  dateTo: '',
  includeCompleted: false,
};

export function useAdminOrders() {
  const { account } = useAdminAuth();
  const api = useOrdersApi();
  const [filter, setFilter] = useState<OrdersSearchFilter>(EMPTY_FILTER);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async (appliedFilter: OrdersSearchFilter) => {
    if (!account) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.fetchAllAdmin(appliedFilter);
      setOrders(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  const handleSearch = async () => {
    await load(filter);
  };

  const handleResetFilter = async () => {
    setFilter(EMPTY_FILTER);
    await load(EMPTY_FILTER);
  };

  return {
    filter,
    setFilter,
    orders,
    error,
    loading,
    handleSearch,
    handleResetFilter,
  };
}
