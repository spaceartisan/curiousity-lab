// One small, readable record per finished activity. Shared by Play (writes), Companion and Insights (read).
import type { Session } from "../storage/contracts";

export type ActivityKind =
  | "name-that-piece"
  | "play-it-yourself"
  | "bench"
  | "differential"
  | "killer"
  | "countdown"
  | "cryptogram"
  | "hive"
  | "ladder"
  | "sudoku"
  | "connections"
  | "word-search"
  | "music-exercise"
  | "microscope";

export type Outcome =
  "solved" | "correct" | "incorrect" | "revealed" | "finished" | "stopped";

export interface ActivityRecord {
  v: 1;
  id: string;
  /** When it ended (ISO, UTC). */
  at: string;
  startedAt?: string;
  /** Rough time spent, seconds. */
  seconds?: number;
  tz: string | null;
  app: string;
  activity: ActivityKind;
  /** Stable content id (piece, case, puzzle…). */
  item: string;
  title: string;
  outcome: Outcome;
  detail: Record<string, number | string | boolean>;
}

export const ACTIVITY_KINDS: ActivityKind[] = [
  "name-that-piece",
  "play-it-yourself",
  "bench",
  "differential",
  "killer",
  "countdown",
  "cryptogram",
  "hive",
  "ladder",
  "sudoku",
  "connections",
  "word-search",
  "music-exercise",
  "microscope",
];
export const OUTCOMES: Outcome[] = [
  "solved",
  "correct",
  "incorrect",
  "revealed",
  "finished",
  "stopped",
];

export const ACTIVITY: Record<
  ActivityKind,
  { label: string; area: "Music" | "Lab" | "Numbers" | "Words" }
> = {
  "name-that-piece": { label: "Name that piece", area: "Music" },
  "play-it-yourself": { label: "Played a piece", area: "Music" },
  "music-exercise": { label: "Music exercises", area: "Music" },
  bench: { label: "Bench unknown", area: "Lab" },
  differential: { label: "Blood differential", area: "Lab" },
  microscope: { label: "Microscope", area: "Lab" },
  sudoku: { label: "Sudoku", area: "Numbers" },
  killer: { label: "Killer Sudoku", area: "Numbers" },
  countdown: { label: "Countdown", area: "Numbers" },
  cryptogram: { label: "Cryptogram", area: "Words" },
  hive: { label: "Letter Hive", area: "Words" },
  ladder: { label: "Word ladder", area: "Words" },
  connections: { label: "Connections", area: "Words" },
  "word-search": { label: "Word search", area: "Words" },
};

export function timeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

const shortText = (v: unknown, max: number) =>
  typeof v === "string" && v.length > 0 && v.length <= max;

/** Strict check used before upload and when reading from the cloud. */
export function validRecord(value: unknown): value is ActivityRecord {
  if (!value || typeof value !== "object") return false;
  const r = value as ActivityRecord;
  const allowed = [
    "v",
    "id",
    "at",
    "startedAt",
    "seconds",
    "tz",
    "app",
    "activity",
    "item",
    "title",
    "outcome",
    "detail",
    "uid",
  ];
  if (Object.keys(r).some((k) => !allowed.includes(k))) return false;
  return (
    r.v === 1 &&
    /^[A-Za-z0-9_-]{8,64}$/.test(r.id) &&
    shortText(r.at, 40) &&
    !Number.isNaN(Date.parse(r.at)) &&
    (r.startedAt === undefined ||
      (shortText(r.startedAt, 40) && !Number.isNaN(Date.parse(r.startedAt)))) &&
    (r.seconds === undefined ||
      (Number.isFinite(r.seconds) && r.seconds >= 0 && r.seconds < 86400)) &&
    (r.tz === null || shortText(r.tz, 64)) &&
    shortText(r.app, 20) &&
    ACTIVITY_KINDS.includes(r.activity) &&
    shortText(r.item, 120) &&
    shortText(r.title, 160) &&
    OUTCOMES.includes(r.outcome) &&
    !!r.detail &&
    typeof r.detail === "object" &&
    Object.keys(r.detail).length <= 16 &&
    Object.entries(r.detail).every(
      ([k, v]) =>
        k.length <= 32 &&
        (typeof v === "boolean" ||
          (typeof v === "number" && Number.isFinite(v)) ||
          (typeof v === "string" && v.length <= 200)),
    )
  );
}

const LEGACY: Record<Session["game"], ActivityKind> = {
  sudoku: "sudoku",
  connections: "connections",
  search: "word-search",
  music: "music-exercise",
  lab: "microscope",
};
const LEGACY_TITLE: Record<Session["game"], string> = {
  sudoku: "Sudoku",
  connections: "Word Connections",
  search: "Word Search",
  music: "Music exercise",
  lab: "Microscope",
};

const legacyId = (id: string) => {
  const clean = id.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 57);
  return clean.length >= 8 ? clean : `legacy-${clean}`.padEnd(8, "0");
};

/** The original games file Sessions; this turns them into the shared record shape. */
export function fromSession(s: Session): ActivityRecord {
  return {
    v: 1,
    id: legacyId(s.id),
    at: s.endedAt,
    startedAt: s.startedAt,
    seconds: Math.round(s.activeMs / 1000),
    tz: s.clock?.timeZone ?? null,
    app: s.appVersion,
    activity: LEGACY[s.game],
    item: s.puzzleId.slice(0, 120),
    title: `${LEGACY_TITLE[s.game]} · ${s.mode}`.slice(0, 160),
    outcome:
      s.outcome === "completed"
        ? "solved"
        : s.outcome === "explored"
          ? "finished"
          : "stopped",
    detail: {
      mode: s.mode.slice(0, 200),
      hints: s.hints,
      undos: s.undos,
      attempt: s.attempt,
    },
  };
}
