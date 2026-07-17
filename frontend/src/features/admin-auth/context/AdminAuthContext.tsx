import { createContext, ReactNode, useEffect, useState } from "react";
import type { AdminAccount } from "@/api";
import { useAuthApi } from "@/api/hook/useAuthApi";

interface AdminAuthContextValue {
  account: AdminAccount | null;
  initializing: boolean;
  login: (account: AdminAccount) => void;
  logout: () => void;
}

export const AdminAuthContext = createContext<AdminAuthContextValue | null>(
  null,
);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const authApi = useAuthApi();
  const [account, setAccount] = useState<AdminAccount | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    authApi.setUnauthorizedHandler(() => setAccount(null));
    authApi.initialize().then((restoredAccount) => {
      if (restoredAccount) setAccount(restoredAccount);
    }).finally(() => setInitializing(false));
    return () => authApi.setUnauthorizedHandler(null);
  }, []);

  const login = (authenticatedAccount: AdminAccount) => {
    setAccount(authenticatedAccount);
  };
  const logout = () => {
    setAccount(null);
  };

  return (
    <AdminAuthContext.Provider value={{ account, initializing, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}
