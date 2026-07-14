import { createContext, ReactNode, useState } from "react";
import type { AdminCredentials } from "@/api";

const ADMIN_CREDENTIALS_STORAGE_KEY = "haguruma-store-portal-admin-credentials";

function loadStoredCredentials(): AdminCredentials | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.sessionStorage.getItem(ADMIN_CREDENTIALS_STORAGE_KEY);
    if (!stored) return null;

    const credentials = JSON.parse(stored) as Partial<AdminCredentials>;
    if (
      typeof credentials.id !== "string" ||
      typeof credentials.password !== "string"
    ) {
      window.sessionStorage.removeItem(ADMIN_CREDENTIALS_STORAGE_KEY);
      return null;
    }

    return { id: credentials.id, password: credentials.password };
  } catch {
    storeCredentials(null);
    return null;
  }
}

function storeCredentials(credentials: AdminCredentials | null) {
  if (typeof window === "undefined") return;

  try {
    if (credentials) {
      window.sessionStorage.setItem(
        ADMIN_CREDENTIALS_STORAGE_KEY,
        JSON.stringify(credentials),
      );
    } else {
      window.sessionStorage.removeItem(ADMIN_CREDENTIALS_STORAGE_KEY);
    }
  } catch {
    // sessionStorageが利用できない環境でも、現在の画面内ではstateでログイン状態を維持する。
  }
}

interface AdminAuthContextValue {
  credentials: AdminCredentials | null;
  login: (credentials: AdminCredentials) => void;
  logout: () => void;
}

export const AdminAuthContext = createContext<AdminAuthContextValue | null>(
  null,
);

// 管理画面配下の複数ページでログイン状態を共有し、同一タブのリロード時は
// sessionStorageから復元する。ID・パスワードの検証自体はAdminGateが担当する。
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [credentials, setCredentials] = useState<AdminCredentials | null>(
    loadStoredCredentials,
  );

  const login = (creds: AdminCredentials) => {
    storeCredentials(creds);
    setCredentials(creds);
  };
  const logout = () => {
    storeCredentials(null);
    setCredentials(null);
  };

  return (
    <AdminAuthContext.Provider value={{ credentials, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}
