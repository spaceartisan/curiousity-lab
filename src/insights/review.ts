import { timingKey, timingLabel } from "../storage/timing";
import { presentationKey, presentationLabel } from "../storage/presentation";
import type { GameKind, Session } from "../storage/contracts";
export const ANALYSIS_VERSION = "local-context-review-3";
export const activityNames: Record<GameKind, string> = {
  sudoku: "Sudoku",
  connections: "Word Connections",
  search: "Word Search",
  music: "Music",
  lab: "Laboratory",
};
export interface ReviewFilters {
  game: GameKind | "all";
  context: string;
  exposure: "all" | "first" | "repeat";
  from: string;
  to: string;
}
export const emptyFilters = (): ReviewFilters => ({
  game: "all",
  context: "all",
  exposure: "all",
  from: "",
  to: "",
});
export function contextKey(s: Session) {
  return JSON.stringify([
    s.game,
    s.mode,
    s.puzzleId,
    s.contentVersion,
    s.appVersion,
    s.source,
    s.attempt === 1 ? "first" : "repeat",
    presentationKey(s.presentation),
    timingKey(s.timing),
  ]);
}
export function contextLabel(s: Session) {
  return `${activityNames[s.game]} · ${s.mode} · ${s.puzzleId} · ${s.contentVersion} · app ${s.appVersion} · ${s.attempt === 1 ? "first attempt" : "repeat attempts"} · ${presentationLabel(s.presentation)} · ${timingLabel(s.timing)}`;
}
export function filterSessions(
  sessions: Session[],
  f: ReviewFilters,
): Session[] {
  return sessions
    .filter((s) => {
      const day = new Date(s.endedAt).toISOString().slice(0, 10);
      return (
        (f.game === "all" || s.game === f.game) &&
        (f.context === "all" || contextKey(s) === f.context) &&
        (f.exposure === "all" ||
          (s.attempt === 1 ? "first" : "repeat") === f.exposure) &&
        (!f.from || day >= f.from) &&
        (!f.to || day <= f.to)
      );
    })
    .slice()
    .sort(
      (a, b) =>
        Date.parse(b.endedAt) - Date.parse(a.endedAt) ||
        a.id.localeCompare(b.id),
    );
}
export function hasTimeIssue(s: Session) {
  return (
    Date.parse(s.endedAt) < Date.parse(s.startedAt) ||
    s.activeMs + (s.timing?.pausedMs ?? 0) >
      Date.parse(s.endedAt) - Date.parse(s.startedAt) + 1
  );
}
export interface ContextSummary {
  key: string;
  label: string;
  sessionIds: string[];
  n: number;
  days: number;
  counts: Record<Session["outcome"], number>;
  activeMinutesRange: [number, number];
  pauseRecords: number;
  pausedMinutesRange: [number, number] | null;
  completedHints: {
    n: number;
    total: number;
    perSession: number;
    range: [number, number];
  } | null;
  exploration: boolean;
  timeIssues: number;
}
export function summarizeContexts(sessions: Session[]): ContextSummary[] {
  const groups = new Map<string, Session[]>();
  for (const s of sessions) {
    const key = contextKey(s);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }
  return [...groups.entries()]
    .map(([key, records]) => {
      const first = records[0],
        completed = records.filter((s) => s.outcome === "completed");
      const exploration =
        first.game === "lab" ||
        (first.game === "music" && first.mode === "piano");
      const hints = completed.map((s) => s.hints),
        active = records.map((s) => s.activeMs / 60000),
        pauses = records
          .filter((s) => s.timing)
          .map((s) => s.timing!.pausedMs / 60000);
      return {
        key,
        label: contextLabel(first),
        sessionIds: records.map((s) => s.id),
        n: records.length,
        days: new Set(
          records.map((s) => new Date(s.endedAt).toISOString().slice(0, 10)),
        ).size,
        counts: {
          completed: completed.length,
          explored: records.filter((s) => s.outcome === "explored").length,
          unfinished: records.filter((s) => s.outcome === "unfinished").length,
        },
        activeMinutesRange: [Math.min(...active), Math.max(...active)] as [
          number,
          number,
        ],
        pauseRecords: pauses.length,
        pausedMinutesRange: pauses.length
          ? ([Math.min(...pauses), Math.max(...pauses)] as [number, number])
          : null,
        completedHints:
          !exploration && completed.length
            ? {
                n: completed.length,
                total: hints.reduce((a, b) => a + b, 0),
                perSession: hints.reduce((a, b) => a + b, 0) / completed.length,
                range: [Math.min(...hints), Math.max(...hints)] as [
                  number,
                  number,
                ],
              }
            : null,
        exploration,
        timeIssues: records.filter(hasTimeIssue).length,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}
export function reviewSummary(sessions: Session[], filters: ReviewFilters) {
  const selected = filterSessions(sessions, filters);
  return {
    analysisVersion: ANALYSIS_VERSION,
    dateBasis: "session endedAt in UTC",
    filters: { ...filters },
    recordedSessionsInSource: sessions.length,
    selectedSessions: selected.length,
    contexts: summarizeContexts(selected),
    limitations: [
      "Only records present in this selected backup; unrecorded play is unknown.",
      "Older presentation settings were not recorded. New setting observations can be partial or mixed; sound settings do not establish audible playback. Explicit foreground pauses are observed only where timing metadata is present; hidden, idle and closed time remain excluded. Input method, clock quality and reference-set equivalence remain unrecorded.",
      "Same puzzle/mode/version is a grouping rule, not proof of comparable presentation or human difficulty.",
      "No trend estimate, clinical inference or enjoyment inference.",
    ],
  };
}
