import { useEffect, useState } from "react";
import { useWorkspace } from "./context";
/** Resolve job titles through the existing authorized job endpoint. */
function useLookup(
  ids: (string | null | undefined)[],
  enabled: boolean,
  read: (id: string, signal: AbortSignal) => Promise<string>,
) {
  const [names, setNames] = useState<Record<string, string>>({});
  const wanted = [...new Set(ids.filter((id): id is string => !!id))]
    .sort()
    .join(",");
  useEffect(() => {
    if (!enabled || !wanted) return;
    const c = new AbortController();
    for (const id of wanted.split(","))
      read(id, c.signal)
        .then((name) => {
          if (!c.signal.aborted) setNames((v) => ({ ...v, [id]: name }));
        })
        .catch(() => {
          /* The view retains its generic job label if a title is unavailable. */
        });
    return () => c.abort();
    // read is derived from the stable client; ids are compared by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted, enabled]);
  return names;
}
export function useJobTitles(ids: (string | null | undefined)[]) {
  const { client } = useWorkspace();
  return useLookup(ids, true, async (id, s) => (await client.job(id, s)).title);
}
