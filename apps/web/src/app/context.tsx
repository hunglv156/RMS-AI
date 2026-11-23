import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { PlatformClient, Session } from "@rms-ai/contracts";
import { platformClient, message } from "../lib/api/platform";
export const Workspace = createContext<{
  client: PlatformClient;
  session: Session;
  refreshSession: () => Promise<void>;
}>({} as never);
export const useWorkspace = () => useContext(Workspace);
export function useLoad<T>(
  load: (signal: AbortSignal) => Promise<T>,
  deps: unknown[],
) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [generation, setGeneration] = useState(0);
  const loaded = useRef(-1);
  useEffect(() => {
    const c = new AbortController();
    // A reload of the same request keeps current content mounted (forms keep their confirmation).
    const refresh = loaded.current !== -1 && loaded.current !== generation;
    loaded.current = generation;
    if (!refresh) {
      setLoading(true);
      setData(undefined);
    }
    setError("");
    load(c.signal)
      .then((v) => {
        if (!c.signal.aborted) setData(v);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(message(e));
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
    // Callers enumerate the request identity; load is deliberately not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, generation]);
  return { data, error, loading, reload: () => setGeneration((v) => v + 1) };
}
export { platformClient };
