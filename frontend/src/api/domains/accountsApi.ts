import { apiClient } from '../apiClient';
import type { AdminAccount, CreateAdminAccountInput, UpdateAdminAccountInput } from '../types';

export const accountsApi = {
  fetchAll: () => apiClient.get<AdminAccount[]>('/admin/accounts', 'アカウント一覧の取得に失敗しました'),
  create: (input: CreateAdminAccountInput) => apiClient.post<AdminAccount>('/admin/accounts', input, 'アカウントの作成に失敗しました'),
  update: (id: string, input: UpdateAdminAccountInput) => apiClient.patch<AdminAccount>(`/admin/accounts/${id}`, input, 'アカウントの更新に失敗しました'),
  updatePassword: (id: string, password: string) => apiClient.patch<AdminAccount>(`/admin/accounts/${id}/password`, { password }, 'パスワードの変更に失敗しました'),
};
