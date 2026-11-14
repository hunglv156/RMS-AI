import type { ApiError as ApiErrorBody, AuthTokens } from '@rms/contracts';

const API = '/api/v1';
const REFRESH_KEY = 'rms.refresh';

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let accessToken: string | null = null;
let refreshInFlight: Promise<AuthTokens | null> | null = null;

export const tokens = {
  get refresh(): string | null {
    try { return localStorage.getItem(REFRESH_KEY); } catch { return null; }
  },
  set(t: AuthTokens | null): void {
    accessToken = t?.access_token ?? null;
    try {
      if (t) localStorage.setItem(REFRESH_KEY, t.refresh_token);
      else localStorage.removeItem(REFRESH_KEY);
    } catch { /* storage bị chặn: chỉ giữ trong bộ nhớ */ }
  },
  get access(): string | null { return accessToken; },
};

async function raw(path: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  return fetch(`${API}${path}`, { ...init, headers });
}

/** Refresh token xoay vòng nên chỉ cho phép một lời gọi refresh tại một thời điểm. */
export function refreshSession(): Promise<AuthTokens | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const rt = tokens.refresh;
      if (!rt) return null;
      const res = await fetch(`${API}/auth/refresh`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: rt }),
      });
      if (!res.ok) { tokens.set(null); return null; }
      const t = (await res.json()) as AuthTokens;
      tokens.set(t);
      return t;
    })().finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await raw(path, init);
  if (res.status === 401 && tokens.refresh && !path.startsWith('/auth/')) {
    if (await refreshSession()) res = await raw(path, init);
  }
  if (res.status === 204) return undefined as T;
  const body = (await res.json().catch(() => null)) as (T & Partial<ApiErrorBody>) | null;
  if (!res.ok) {
    throw new ApiError(res.status, body?.error?.code ?? 'error', body?.error?.message ?? res.statusText);
  }
  return body as T;
}

export const post = <T>(path: string, data?: unknown) =>
  api<T>(path, { method: 'POST', body: data === undefined ? undefined : JSON.stringify(data) });
export const patch = <T>(path: string, data: unknown) =>
  api<T>(path, { method: 'PATCH', body: JSON.stringify(data) });
export const del = (path: string) => api<void>(path, { method: 'DELETE' });
