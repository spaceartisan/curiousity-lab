import type { Session } from "../storage/contracts";
import { contextKey, hasTimeIssue } from "./review";
export type TimelineMetric = "active" | "hints" | "pause";
export const TIMELINE_VERSION = "local-session-points-4";
export const POINTS_PER_PAGE = 24;
export interface TimelinePoint {
  session: Session;
  endedAtMs: number;
  value: number;
}
export function sessionTimeline(
  sessions: Session[],
  context: string,
  metric: TimelineMetric,
) {
  const records =
    context === "all" ? [] : sessions.filter((s) => contextKey(s) === context);
  const exploration = records.some(
    (s) => s.game === "lab" || (s.game === "music" && s.mode === "piano"),
  );
  const points: TimelinePoint[] = records
    .filter(
      (s) =>
        metric === "active" ||
        (metric === "pause"
          ? !!s.timing
          : !exploration && s.outcome === "completed"),
    )
    .map((session) => ({
      session,
      endedAtMs: Date.parse(session.endedAt),
      value:
        metric === "active"
          ? session.activeMs
          : metric === "pause"
            ? session.timing!.pausedMs
            : session.hints,
    }))
    .sort(
      (a, b) =>
        a.endedAtMs - b.endedAtMs || a.session.id.localeCompare(b.session.id),
    );
  const times = points.map((p) => p.endedAtMs);
  const min = times.length ? Math.min(...times) : 0,
    max = times.length ? Math.max(...times) : 0;
  const timeDomain: [number, number] =
    min === max
      ? [
          Math.max(-8640000000000000, min - 60000),
          Math.min(8640000000000000, max + 60000),
        ]
      : [min, max];
  const values = points.map((p) => p.value),
    valueMax = values.length ? Math.max(...values) : 0;
  const unit =
    metric === "hints" ? "hints" : valueMax < 60000 ? "seconds" : "minutes";
  const divisor = metric === "hints" ? 1 : unit === "seconds" ? 1000 : 60000;
  const plottedIds = new Set(points.map((p) => p.session.id));
  return {
    version: TIMELINE_VERSION,
    metric,
    records: records.length,
    recordIds: records.map((s) => s.id),
    omittedSessionIds: records
      .filter((s) => !plottedIds.has(s.id))
      .map((s) => s.id),
    timeIssues: records.filter(hasTimeIssue).length,
    days: new Set(
      records.map((s) => new Date(s.endedAt).toISOString().split("T")[0]),
    ).size,
    exploration,
    points,
    omitted: records.length - points.length,
    timeDomain,
    valueDomain: [0, Math.max(metric === "hints" ? 1 : divisor, valueMax)] as [
      number,
      number,
    ],
    unit,
    divisor,
  };
}

export function timelineExport(
  model: ReturnType<typeof sessionTimeline>,
  context: string,
) {
  return {
    plotVersion: TIMELINE_VERSION,
    context,
    metric: model.metric,
    selectedSourceSessionIds: [...model.recordIds],
    sourceSessionIds: model.points.map((p) => p.session.id),
    excludedSourceSessionIds: [...model.omittedSessionIds],
    records: model.records,
    omitted: model.omitted,
    timeIssues: model.timeIssues,
    dateBasis: "session endedAt in UTC",
    timeDomainUtc: model.timeDomain.map((t) => new Date(t).toISOString()),
    valueDomain: [...model.valueDomain],
    valueDomainUnit: model.metric === "hints" ? "count" : "ms",
    points: model.points.map((p) => ({
      sessionId: p.session.id,
      sourceEndedAt: p.session.endedAt,
      clock: p.session.clock ? { ...p.session.clock } : null,
      endedAtUtc: new Date(p.endedAtMs).toISOString(),
      value: p.value,
      unit: model.metric === "hints" ? "count" : "ms",
      outcome: p.session.outcome,
      attempt: p.session.attempt,
      hints: p.session.hints,
      undos: p.session.undos,
    })),
    limitations: [
      "Actual selected source observations only; unrecorded play is unknown.",
      "No trend estimate or independent-participant assumption. Local clock observations do not verify UTC accuracy; missing clock context is unknown.",
      "Same context does not prove equivalent difficulty or matched reference forms.",
      "Timing coverage may be partial; older pause values remain unknown.",
    ],
  };
}
