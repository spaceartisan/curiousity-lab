import type { Draft, LocalState, Preferences } from "./contracts";

export const CLOCK_ALGORITHM = "wall-monotonic-v1";
export interface ClockObservation {
  version: 1;
  algorithm: typeof CLOCK_ALGORITHM;
  coverage: "from-start" | "partial";
  timeZone: string | null;
  timeZoneChanged: boolean;
  wallClockShift: boolean;
  observationGap: boolean;
}
export interface ClockSample {
  timeZone: string | null;
  wallClockShift: boolean;
  observationGap: boolean;
  changed: boolean;
}
export function clientTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}
const validZone = (v: unknown) =>
  v === null || (typeof v === "string" && /^[A-Za-z0-9_+/-]{1,80}$/.test(v));
export function validClockObservation(
  value: unknown,
): value is ClockObservation {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const c = value as ClockObservation;
  return (
    !Object.keys(c).some(
      (k) =>
        ![
          "version",
          "algorithm",
          "coverage",
          "timeZone",
          "timeZoneChanged",
          "wallClockShift",
          "observationGap",
        ].includes(k),
    ) &&
    c.version === 1 &&
    c.algorithm === CLOCK_ALGORITHM &&
    ["from-start", "partial"].includes(c.coverage) &&
    validZone(c.timeZone) &&
    [c.timeZoneChanged, c.wallClockShift, c.observationGap].every(
      (v) => typeof v === "boolean",
    )
  );
}
// Raw readings exist only here in memory. No server accuracy claim or time correction.
export class ClockObserver {
  constructor(
    private monotonic = performance.now(),
    private wall = Date.now(),
    private zone = clientTimeZone(),
  ) {}
  sample(
    monotonic: number,
    wall = Date.now(),
    zone = clientTimeZone(),
  ): ClockSample {
    const elapsed = monotonic - this.monotonic;
    const wallClockShift =
      !Number.isFinite(elapsed) ||
      elapsed < 0 ||
      !Number.isFinite(wall) ||
      Math.abs(wall - this.wall - elapsed) > 2000;
    const observationGap = elapsed > 90000 || wall - this.wall > 90000;
    const changed = wallClockShift || observationGap || zone !== this.zone;
    this.monotonic = monotonic;
    this.wall = wall;
    this.zone = zone;
    return { timeZone: zone, wallClockShift, observationGap, changed };
  }
}
export function withClockObservation(
  draft: Draft,
  prefs: Preferences,
  fromStart = false,
): Draft {
  if (draft.finalized) return draft;
  if (!prefs.history) {
    const { clock: _ignored, ...necessary } = draft;
    return necessary;
  }
  return draft.clock
    ? draft
    : {
        ...draft,
        clock: {
          version: 1,
          algorithm: CLOCK_ALGORITHM,
          coverage: fromStart ? "from-start" : "partial",
          timeZone: clientTimeZone(),
          timeZoneChanged: false,
          wallClockShift: false,
          observationGap: false,
        },
      };
}
export function mergeClockObservation(
  c: ClockObservation,
  s?: ClockSample,
): ClockObservation {
  return s
    ? {
        ...c,
        timeZoneChanged: c.timeZoneChanged || c.timeZone !== s.timeZone,
        wallClockShift: c.wallClockShift || s.wallClockShift,
        observationGap: c.observationGap || s.observationGap,
      }
    : c;
}
// A closed browser/restore interval cannot be checked against the previous monotonic clock.
export function resumeClockObservations(state: LocalState): LocalState {
  return {
    ...state,
    drafts: Object.fromEntries(
      Object.entries(state.drafts).map(([k, d]) => [
        k,
        d.clock && !d.finalized
          ? { ...d, clock: { ...d.clock, coverage: "partial" } }
          : d,
      ]),
    ),
  };
}
export function clockKey(c?: ClockObservation) {
  return c
    ? JSON.stringify([
        c.version,
        c.algorithm,
        c.coverage,
        c.timeZone,
        c.timeZoneChanged,
        c.wallClockShift,
        c.observationGap,
      ])
    : "unrecorded";
}
export function clockLabel(c?: ClockObservation) {
  return c
    ? `Local clock observations ${c.coverage === "from-start" ? "from start" : "partial"}; zone ${c.timeZone ?? "unavailable"}${c.timeZoneChanged ? " (changed or unavailable later)" : ""}; ${c.wallClockShift ? "clock shift observed" : "no clock shift observed"}; ${c.observationGap ? "observation gap recorded" : "no long observation gap recorded"}; UTC accuracy unverified`
    : "Clock context unrecorded; UTC accuracy unverified";
}
