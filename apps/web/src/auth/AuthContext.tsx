import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthTokens, MeDto, RegisterInput } from '@rms/contracts';
import { api, post, refreshSession, tokens } from '../api/client';

interface AuthState {
  loading: boolean;
  me: MeDto | null;
  login(email: string, password: string): Promise<void>;
  register(input: RegisterInput): Promise<void>;
  logout(): Promise<void>;
  switchOrg(orgId: string): Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<MeDto | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMe = useCallback(async () => setMe(await api<MeDto>('/me')), []);

  useEffect(() => {
    void (async () => {
      try {
        if (tokens.refresh && (await refreshSession())) await loadMe();
      } catch { tokens.set(null); }
      setLoading(false);
    })();
  }, [loadMe]);

  const value = useMemo<AuthState>(() => ({
    loading, me,
    async login(email, password) {
      tokens.set(await post<AuthTokens>('/auth/login', { email, password }));
      await loadMe();
    },
    async register(input) {
      tokens.set(await post<AuthTokens>('/auth/register', input));
      await loadMe();
    },
    async logout() {
      const rt = tokens.refresh;
      if (rt) await post('/auth/logout', { refresh_token: rt }).catch(() => undefined);
      tokens.set(null);
      setMe(null);
    },
    async switchOrg(orgId) {
      const rt = tokens.refresh;
      if (!rt) return;
      tokens.set(await post<AuthTokens>('/auth/switch-org', { organization_id: orgId, refresh_token: rt }));
      await loadMe();
    },
  }), [loading, me, loadMe]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth ngoài AuthProvider');
  return v;
}
