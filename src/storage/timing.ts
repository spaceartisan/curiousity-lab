import type { Draft, LocalState, Preferences } from "./contracts";
import type { ClockSlice } from "../games/activity-clock";
export const TIME_ALGORITHM = "visible-interaction-60s-v2";
export interface Timing {
  version: 1;
  algorithm: typeof TIME_ALGORITHM;
  coverage: "from-start" | "partial";
  pausedMs: number;
}
export function validTiming(value: unknown): value is Timing {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const t = value as Timing;
  return (
    !Object.keys(t).some(
      (k) => !["version", "algorithm", "coverage", "pausedMs"].includes(k),
    ) &&
    t.version === 1 &&
    t.algorithm === TIME_ALGORITHM &&
    ["from-start", "partial"].includes(t.coverage) &&
    Number.isFinite(t.pausedMs) &&
    t.pausedMs >= 0
  );
}
export function withTiming(
  draft: Draft,
  prefs: Preferences,
  fromStart = false,
): Draft {
  if (draft.finalized) return draft;
  if (!prefs.history) {
    const { timing: _ignored, ...progress } = draft;
    return progress;
  }
  return draft.timing
    ? draft
    : {
        ...draft,
        timing: {
          version: 1,
          algorithm: TIME_ALGORITHM,
          coverage: fromStart ? "from-start" : "partial",
          pausedMs: 0,
        },
      };
}
export function applyClock(
  state: LocalState,
  slice: ClockSlice | null,
): LocalState {
  if (!slice || !state.preferences.history) return state;
  const old = state.drafts[slice.game];
  if (!old || old.id !== slice.id || old.finalized) return state;
  const draft = withTiming(old, state.preferences);
  return {
    ...state,
    drafts: {
      ...state.drafts,
      [slice.game]: {
        ...draft,
        activeMs: draft.activeMs + slice.activeMs,
        timing: {
          ...draft.timing!,
          pausedMs: draft.timing!.pausedMs + slice.pausedMs,
        },
      },
    },
  };
}
export function timingKey(t?: Timing) {
  return t
    ? JSON.stringify([t.version, t.algorithm, t.coverage])
    : "unrecorded";
}
export function timingLabel(t?: Timing) {
  return t
    ? `${t.coverage === "from-start" ? "Timing observed from start" : "Partial timing observations"} · ${t.algorithm}`
    : "Pause timing unrecorded";
}
