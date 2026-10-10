import { useEffect, useRef, useState } from "react";
import type { LocalState } from "../storage/contracts";
import type { FamilyContext } from "../family/useFamilyConnection";
import { sharingScope, scopeKey, prepareSessions } from "./local";

export function usePreparation(
  context: FamilyContext,
  state: LocalState | null,
) {
  const scope = sharingScope(context);
  const key = scope ? scopeKey(scope) : "";
  const sessions = state?.sessions;
  const seen = useRef<{ key: string; ids: Set<string> } | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    if (!sessions) return;
    const previous = seen.current;
    seen.current = { key, ids: new Set(sessions.map((session) => session.id)) };
    setError("");
    // Loading, reconnecting or switching accounts never enrolls existing history.
    // Only sessions newly recorded while this account is approved are eligible.
    if (
      !scope ||
      !previous ||
      previous.key !== key ||
      state?.installationRole !== "play"
    )
      return;
    const added = sessions.filter((session) => !previous.ids.has(session.id));
    if (added.length)
      void prepareSessions(scope, added, "future").catch(() => {
        if (active)
          setError(
            "New activity could not be prepared. Original history is safe; select it explicitly in Settings to retry.",
          );
      });
    return () => {
      active = false;
    };
  }, [key, sessions]);
  return error;
}
