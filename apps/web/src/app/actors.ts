import type { ActorDisplay } from "@rms-ai/contracts";
import { useWorkspace } from "./context";
export function useActorName() {
  const { session } = useWorkspace();
  return (actor?: ActorDisplay | null) =>
    actor
      ? `${actor.display_name}${actor.id === session.user.id ? " (bạn)" : ""}`
      : "Người dùng";
}
