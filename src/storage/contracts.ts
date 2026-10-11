import { validPresentation, type Presentation } from "./presentation";
import { validateGame } from "./validate-game";
export const APP_VERSION = "0.13.0";
export type Role = "play" | "companion" | "insights";
export type GameKind = "sudoku" | "connections" | "search" | "music" | "lab";
export interface Session {
  presentation?: Presentation;
  id: string;
  schemaVersion: 1;
  appVersion: string;
  contentVersion: string;
  game: GameKind;
  puzzleId: string;
  startedAt: string;
  endedAt: string;
  activeMs: number;
  hints: number;
  undos: number;
  outcome: "completed" | "explored" | "unfinished";
  mode: string;
  attempt: number;
  source: "local-guest";
}
export interface Draft {
  presentation?: Presentation;
  id: string;
  game: GameKind;
  puzzleId: string;
  startedAt: string;
  activeMs: number;
  hints: number;
  undos: number;
  mode: string;
  data: unknown;
  finalized?: boolean;
}
export interface Creation {
  id: string;
  kind: "melody" | "notebook";
  title: string;
  savedAt: string;
  lastViewedAt?: string;
  notes?: number[];
  specimenId?: string;
  observations?: string[];
  text?: string;
  zoom?: number;
  pan?: number[];
  labExperience?: "workbench" | "explorer";
  labWorkflowVersion?: 1;
  labDomain?: "microbiology";
}
export interface Preferences {
  theme: "light" | "dark";
  textSize: "normal" | "large";
  sound: boolean;
  volume: number;
  history: boolean;
  welcomeDone: boolean;
}
export interface LocalState {
  schemaVersion: 1;
  installationRole: Role;
  authenticatedUid: null;
  preferences: Preferences;
  drafts: Partial<Record<GameKind, Draft>>;
  sessions: Session[];
  creations: Creation[];
}
export const emptyState = (role: Role): LocalState => ({
  schemaVersion: 1,
  installationRole: role,
  authenticatedUid: null,
  preferences: {
    theme: "light",
    textSize: "normal",
    sound: false,
    volume: 0.25,
    history: false,
    welcomeDone: false,
  },
  drafts: {},
  sessions: [],
  creations: [],
});
export function validateState(
  value: unknown,
  role: Role,
): asserts value is LocalState {
  if (!value || typeof value !== "object") throw Error("Invalid save");
  const v = value as LocalState;
  if (
    v.schemaVersion !== 1 ||
    v.installationRole !== role ||
    v.authenticatedUid !== null ||
    !v.preferences ||
    !Array.isArray(v.sessions) ||
    !Array.isArray(v.creations) ||
    !v.drafts
  )
    throw Error("Unsupported save or app");
  if (
    !["light", "dark"].includes(v.preferences.theme) ||
    !["normal", "large"].includes(v.preferences.textSize) ||
    typeof v.preferences.history !== "boolean" ||
    typeof v.preferences.welcomeDone !== "boolean" ||
    typeof v.preferences.sound !== "boolean" ||
    !Number.isFinite(v.preferences.volume) ||
    v.preferences.volume < 0 ||
    v.preferences.volume > 1
  )
    throw Error("Invalid preferences");
  if (v.sessions.length > 100000 || v.creations.length > 10000)
    throw Error("Save exceeds supported size");
  if (
    new Set(v.sessions.map((s) => s.id)).size !== v.sessions.length ||
    new Set(v.creations.map((c) => c.id)).size !== v.creations.length
  )
    throw Error("Duplicate record ids");
  for (const s of v.sessions)
    if (
      !s ||
      s.schemaVersion !== 1 ||
      typeof s.appVersion !== "string" ||
      typeof s.contentVersion !== "string" ||
      typeof s.id !== "string" ||
      !["sudoku", "connections", "search", "music", "lab"].includes(s.game) ||
      !Number.isFinite(s.activeMs) ||
      s.activeMs < 0 ||
      !Number.isFinite(Date.parse(s.startedAt)) ||
      !Number.isFinite(Date.parse(s.endedAt)) ||
      !["completed", "explored", "unfinished"].includes(s.outcome) ||
      s.source !== "local-guest" ||
      (s.presentation !== undefined &&
        !validPresentation(s.presentation, s.game)) ||
      typeof s.puzzleId !== "string" ||
      typeof s.mode !== "string" ||
      !Number.isInteger(s.hints) ||
      s.hints < 0 ||
      !Number.isInteger(s.undos) ||
      s.undos < 0 ||
      !Number.isInteger(s.attempt) ||
      s.attempt < 1
    )
      throw Error("Invalid session");
  for (const c of v.creations)
    if (
      !c ||
      typeof c.id !== "string" ||
      typeof c.title !== "string" ||
      c.title.length > 100 ||
      !Number.isFinite(Date.parse(c.savedAt)) ||
      (c.lastViewedAt !== undefined &&
        (typeof c.lastViewedAt !== "string" ||
          !Number.isFinite(Date.parse(c.lastViewedAt)))) ||
      (c.text !== undefined &&
        (typeof c.text !== "string" || c.text.length > 1000)) ||
      (c.observations !== undefined &&
        (!Array.isArray(c.observations) ||
          c.observations.some((o) => typeof o !== "string"))) ||
      (c.zoom !== undefined &&
        (!Number.isFinite(c.zoom) || c.zoom < 1 || c.zoom > 3)) ||
      (c.pan !== undefined &&
        (!Array.isArray(c.pan) ||
          c.pan.length !== 2 ||
          c.pan.some((n) => !Number.isFinite(n) || Math.abs(n) > 35))) ||
      (c.labExperience !== undefined &&
        !["workbench", "explorer"].includes(c.labExperience)) ||
      (c.labWorkflowVersion !== undefined && c.labWorkflowVersion !== 1) ||
      (c.labDomain !== undefined && c.labDomain !== "microbiology") ||
      !["melody", "notebook"].includes(c.kind) ||
      (c.notes &&
        (!Array.isArray(c.notes) ||
          c.notes.some((n) => !Number.isInteger(n) || n < 0 || n > 7)))
    )
      throw Error("Invalid creation");
  for (const [kind, d] of Object.entries(v.drafts))
    if (
      !["sudoku", "connections", "search", "music", "lab"].includes(kind) ||
      !d ||
      d.game !== kind ||
      typeof d.id !== "string" ||
      !Number.isFinite(d.activeMs) ||
      d.activeMs < 0 ||
      !Number.isInteger(d.hints) ||
      d.hints < 0 ||
      !Number.isInteger(d.undos) ||
      d.undos < 0 ||
      typeof d.puzzleId !== "string" ||
      typeof d.mode !== "string" ||
      !Number.isFinite(Date.parse(d.startedAt)) ||
      (d.presentation !== undefined &&
        !validPresentation(d.presentation, kind)) ||
      !validateGame(kind, d.data)
    )
      throw Error("Invalid draft");
}
