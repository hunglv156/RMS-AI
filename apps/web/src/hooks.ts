import { useEffect, useRef, useState } from 'react';
import { can, type Permission } from '@rms/contracts';
import { useAuth } from './auth/AuthContext';

export function useCan(p: Permission): boolean {
  const { me } = useAuth();
  return me?.active_role ? can(me.active_role, p) : false;
}

interface FetchOptions<T> {
  /** Poll mỗi `intervalMs` chừng nào `shouldPoll(data)` còn đúng. */
  intervalMs?: number;
  shouldPoll?: (data: T) => boolean;
}

/** Tải dữ liệu theo `key`; `reload()` tải lại và khởi động lại polling. */
export function useFetch<T>(load: () => Promise<T>, key: string, opts: FetchOptions<T> = {}) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const latest = useRef({ load, opts });
  latest.current = { load, opts };

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try {
        const d = await latest.current.load();
        if (stop) return;
        setData(d);
        setError(null);
        const { intervalMs, shouldPoll } = latest.current.opts;
        if (intervalMs && (!shouldPoll || shouldPoll(d))) timer = setTimeout(() => void tick(), intervalMs);
      } catch (e) {
        if (!stop) setError((e as Error).message);
      }
    };
    void tick();
    return () => {
      stop = true;
      if (timer) clearTimeout(timer);
    };
  }, [key, version]);

  return { data, error, reload: () => setVersion((v) => v + 1) };
}
