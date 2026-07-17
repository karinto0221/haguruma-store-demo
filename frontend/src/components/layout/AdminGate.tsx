import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import type { AdminCredentials } from '@/api';
import { useAuthApi } from '@/api/hook/useAuthApi';
import { AdminAuthProvider, useAdminAuth, LoginForm } from '@/features/admin-auth';
import AdminLayout from './AdminLayout';

// /admin配下のルートに適用するゲート。ログイン状態はAdminAuthProviderで
// このコンポーネント配下(=管理画面配下の全ページ)に共有される。
function AdminGateInner() {
  const { account, initializing, login, logout } = useAdminAuth();
  const authApi = useAuthApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (creds: AdminCredentials) => {
    setLoading(true);
    setError('');
    try {
      const authenticatedAccount = await authApi.login(creds);
      login(authenticatedAccount);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (initializing) return null;

  if (!account) {
    return <LoginForm loading={loading} error={error} onLogin={handleLogin} />;
  }

  return (
    <AdminLayout account={account} onLogout={() => { void authApi.logout(); logout(); }}>
      <Outlet />
    </AdminLayout>
  );
}

export default function AdminGate() {
  return (
    <AdminAuthProvider>
      <AdminGateInner />
    </AdminAuthProvider>
  );
}
