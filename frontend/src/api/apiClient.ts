import type { AdminAccount } from './types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

let accessToken: string | null = null;
let refreshPromise: Promise<AdminAccount | null> | null = null;
let unauthorizedHandler: (() => void) | null = null;

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

export function setAccessToken(token: string | null) { accessToken = token; }
export function setUnauthorizedHandler(handler: (() => void) | null) { unauthorizedHandler = handler; }
export function resolveApiUrl(path: string) {
  if (/^https?:\/\//i.test(path) || path === API_BASE_URL || path.startsWith(`${API_BASE_URL}/`)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

async function extractError(response: Response, fallback: string) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const body = await response.json().catch(() => null);
    const message = body?.message;
    return new ApiError(Array.isArray(message) ? message.join(' / ') : message || fallback, response.status, body);
  }
  return new ApiError(response.status === 404 ? 'APIが見つかりません' : fallback, response.status);
}

interface AdminSessionResponse {
  accessToken: string;
  account: AdminAccount;
}

async function refreshAccessToken(): Promise<AdminAccount | null> {
  if (!refreshPromise) {
    refreshPromise = globalThis.fetch(resolveApiUrl('/admin/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
    }).then(async (response) => {
      if (!response.ok) return null;
      const body = await response.json() as AdminSessionResponse;
      accessToken = body.accessToken;
      return body.account;
    }).catch(() => null).finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
}

export async function initializeApiAuth() { return refreshAccessToken(); }

export async function apiFetch(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  const response = await globalThis.fetch(resolveApiUrl(path), { ...init, headers, credentials: 'include' });
  if (response.status === 401 && retry && !path.startsWith('/admin/auth/')) {
    if (await refreshAccessToken()) return apiFetch(path, init, false);
    accessToken = null;
    unauthorizedHandler?.();
  }
  return response;
}

async function request<T>(path: string, init: RequestInit = {}, fallback = '通信に失敗しました'): Promise<T> {
  const response = await apiFetch(path, init);
  if (!response.ok) throw await extractError(response, fallback);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string, fallback?: string) => request<T>(path, {}, fallback),
  post: <T>(path: string, body?: unknown, fallback?: string) => request<T>(path, {
    method: 'POST',
    headers: body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
    body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
  }, fallback),
  patch: <T>(path: string, body: unknown, fallback?: string) => request<T>(path, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }, fallback),
  put: <T>(path: string, body: unknown, fallback?: string) => request<T>(path, {
    method: 'PUT',
    headers: body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
    body: body instanceof FormData ? body : JSON.stringify(body),
  }, fallback),
  delete: <T = void>(path: string, fallback?: string) => request<T>(path, { method: 'DELETE' }, fallback),
  blob: async (path: string, fallback?: string) => {
    const response = await apiFetch(path);
    if (!response.ok) throw await extractError(response, fallback || 'ファイルの取得に失敗しました');
    return response.blob();
  },
};

export async function establishSession(loginId: string, password: string) {
  const body = await apiClient.post<AdminSessionResponse>('/admin/auth/login', { loginId, password }, 'ログインIDまたはパスワードが正しくありません');
  setAccessToken(body.accessToken);
  return body.account;
}

export async function destroySession() {
  try { await apiClient.post<void>('/admin/auth/logout'); } finally { setAccessToken(null); }
}
