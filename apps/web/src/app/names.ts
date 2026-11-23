import { useEffect, useState } from "react";
import { useWorkspace } from "./context";
/**
 * Applications and runs carry only IDs. Resolve readable candidate names and job
 * titles through the existing read endpoints the signed-in role may already call;
 * reviewers cannot read candidates, so they keep the short application reference.
 */
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
          /* A missing name falls back to the short reference. */
        });
    return () => c.abort();
    // read is derived from the stable client; ids are compared by value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted, enabled]);
  return names;
}
export function useCandidateNames(ids: (string | null | undefined)[]) {
  const { client, session } = useWorkspace();
  return useLookup(
    ids,
    session.user.role !== "reviewer",
    async (id, s) => (await client.candidate(id, s)).display_name,
  );
}
export function useJobTitles(ids: (string | null | undefined)[]) {
  const { client } = useWorkspace();
  return useLookup(ids, true, async (id, s) => (await client.job(id, s)).title);
}
