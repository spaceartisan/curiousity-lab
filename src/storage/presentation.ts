import type { Draft, Preferences, LocalState } from "./contracts";
import type { MusicData } from "../games/Music";

export interface Presentation {
  version: 1;
  coverage: "from-start" | "partial";
  themes: Preferences["theme"][];
  textSizes: Preferences["textSize"][];
  sudoku?: {
    coverage: "from-start" | "partial";
    cellSizes: ("compact" | "large")[];
  };
  input?: {
    version: 1;
    coverage: "from-start" | "partial";
    methods: InputMethod[];
  };
  music?: {
    soundSettings: boolean[];
    volumeRange: [number, number];
    views: (NonNullable<MusicData["presentation"]> | "rhythm-pattern")[];
    tempos: NonNullable<MusicData["tempo"]>[];
    flexibility: NonNullable<MusicData["flexibility"]>[];
  };
}
export type InputMethod = "keyboard" | "mouse" | "pen" | "touch";
const inputMethods: InputMethod[] = ["keyboard", "mouse", "pen", "touch"];
const union = <T extends string | boolean>(values: T[], value: T): T[] =>
  [...new Set([...values, value])].sort();

export function observePresentation(
  draft: Draft,
  prefs: Preferences,
  fromStart = false,
): Draft {
  if (draft.finalized) return draft;
  if (!prefs.history) {
    const { presentation: _ignored, ...necessary } = draft;
    return necessary;
  }
  const old = draft.presentation;
  const presentation: Presentation = {
    version: 1,
    coverage: old?.coverage ?? (fromStart ? "from-start" : "partial"),
    themes: union(old?.themes ?? [], prefs.theme),
    textSizes: union(old?.textSizes ?? [], prefs.textSize),
    input: old?.input ?? {
      version: 1,
      coverage: fromStart ? "from-start" : "partial",
      methods: [],
    },
  };
  if (draft.game === "music") {
    const data = draft.data as MusicData;
    const prior = old?.music;
    presentation.music = {
      soundSettings: union(prior?.soundSettings ?? [], prefs.sound),
      volumeRange: [
        Math.min(prior?.volumeRange[0] ?? prefs.volume, prefs.volume),
        Math.max(prior?.volumeRange[1] ?? prefs.volume, prefs.volume),
      ],
      views: union(
        prior?.views ?? [],
        data.mode === "rhythm"
          ? "rhythm-pattern"
          : (data.presentation ?? "staff"),
      ),
      tempos: union(prior?.tempos ?? [], data.tempo ?? "comfortable"),
      flexibility:
        data.mode === "rhythm"
          ? union(prior?.flexibility ?? [], data.flexibility ?? "gentle")
          : [],
    };
  }
  if (draft.game === "sudoku") {
    presentation.sudoku = {
      coverage: old?.sudoku?.coverage ?? (fromStart ? "from-start" : "partial"),
      cellSizes: union(
        old?.sudoku?.cellSizes ?? [],
        (draft.data as { largeCells?: boolean }).largeCells
          ? "large"
          : "compact",
      ),
    };
  }
  return { ...draft, presentation };
}

// Store categories only, never event objects, key values or coordinates.
export function observeInput(
  draft: Draft,
  prefs: Preferences,
  method: string,
): Draft {
  if (
    draft.finalized ||
    !prefs.history ||
    !inputMethods.includes(method as InputMethod)
  )
    return draft;
  const next = observePresentation(draft, prefs);
  const input = next.presentation!.input!;
  if (input.methods.includes(method as InputMethod)) return draft;
  return {
    ...next,
    presentation: {
      ...next.presentation!,
      input: {
        ...input,
        methods: union(input.methods, method as InputMethod),
      },
    },
  };
}

function choices(value: unknown, allowed: readonly unknown[], empty = false) {
  return (
    Array.isArray(value) &&
    (empty || value.length > 0) &&
    value.length <= allowed.length &&
    new Set(value).size === value.length &&
    value.every((v) => allowed.includes(v))
  );
}
export function validPresentation(
  value: unknown,
  game: string,
): value is Presentation {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const p = value as Presentation;
  if (
    Object.keys(p).some(
      (k) =>
        ![
          "version",
          "coverage",
          "themes",
          "textSizes",
          "music",
          "input",
          "sudoku",
        ].includes(k),
    ) ||
    p.version !== 1 ||
    !["from-start", "partial"].includes(p.coverage) ||
    !choices(p.themes, ["system", "light", "dark"]) ||
    !choices(p.textSizes, ["normal", "large"])
  )
    return false;
  if (
    p.sudoku !== undefined &&
    (game !== "sudoku" ||
      !p.sudoku ||
      typeof p.sudoku !== "object" ||
      Array.isArray(p.sudoku) ||
      Object.keys(p.sudoku).some(
        (k) => !["coverage", "cellSizes"].includes(k),
      ) ||
      !["from-start", "partial"].includes(p.sudoku.coverage) ||
      !choices(p.sudoku.cellSizes, ["compact", "large"]))
  )
    return false;
  if (
    p.input !== undefined &&
    (!p.input ||
      typeof p.input !== "object" ||
      Array.isArray(p.input) ||
      Object.keys(p.input).some(
        (k) => !["version", "coverage", "methods"].includes(k),
      ) ||
      p.input.version !== 1 ||
      !["from-start", "partial"].includes(p.input.coverage) ||
      !choices(p.input.methods, inputMethods, true))
  )
    return false;
  if (game !== "music") return p.music === undefined;
  const m = p.music;
  return (
    !!m &&
    typeof m === "object" &&
    !Array.isArray(m) &&
    !Object.keys(m).some(
      (k) =>
        ![
          "soundSettings",
          "volumeRange",
          "views",
          "tempos",
          "flexibility",
        ].includes(k),
    ) &&
    choices(m.soundSettings, [false, true]) &&
    choices(m.views, ["staff", "pattern", "ear", "rhythm-pattern"]) &&
    choices(m.tempos, ["comfortable", "slow"]) &&
    choices(m.flexibility, ["gentle", "extra"], true) &&
    Array.isArray(m.volumeRange) &&
    m.volumeRange.length === 2 &&
    m.volumeRange.every((n) => Number.isFinite(n) && n >= 0 && n <= 1) &&
    m.volumeRange[0] <= m.volumeRange[1]
  );
}

export function presentationKey(p?: Presentation) {
  if (!p) return "unrecorded";
  return JSON.stringify([
    p.version,
    p.coverage,
    [...p.themes].sort(),
    [...p.textSizes].sort(),
    p.music
      ? [
          [...p.music.soundSettings].sort(),
          p.music.volumeRange,
          [...p.music.views].sort(),
          [...p.music.tempos].sort(),
          [...p.music.flexibility].sort(),
        ]
      : null,
    p.input
      ? [p.input.version, p.input.coverage, [...p.input.methods].sort()]
      : null,
    p.sudoku ? [p.sudoku.coverage, [...p.sudoku.cellSizes].sort()] : null,
  ]);
}
export function presentationLabel(p?: Presentation) {
  if (!p) return "Presentation settings unrecorded";
  const names = {
    staff: "staff notation",
    pattern: "note pattern",
    ear: "by ear",
    "rhythm-pattern": "rhythm pattern",
  };
  return (
    `${p.coverage === "from-start" ? "Settings observed from start" : "Partial setting observations"}: ${p.themes.join(" / ")} theme, ${p.textSizes.join(" / ")} text` +
    (p.music
      ? `; sound setting ${p.music.soundSettings.map((v) => (v ? "on" : "off")).join(" / ")}, volume ${p.music.volumeRange.map((v) => Math.round(v * 100)).join("–")}%${p.music.volumeRange[1] === 0 ? " (muted)" : ""}, ${p.music.views.map((v) => names[v]).join(" / ")}, ${p.music.tempos.join(" / ")} pace${p.music.flexibility.length ? `, ${p.music.flexibility.join(" / ")} rhythm flexibility` : ""}`
      : "") +
    (p.input
      ? `; input observations ${p.input.coverage === "from-start" ? "from start" : "partial"}: ${p.input.methods.length ? p.input.methods.join(" / ") : "none yet"}`
      : "; input methods unrecorded") +
    (p.sudoku
      ? `; Sudoku square sizes ${p.sudoku.coverage === "from-start" ? "observed from start" : "partially observed"}: ${p.sudoku.cellSizes.join(" / ")}`
      : "")
  );
}

export function withoutRecordedHistory(state: LocalState): LocalState {
  return {
    ...state,
    sessions: [],
    drafts: Object.fromEntries(
      Object.entries(state.drafts).map(([game, draft]) => {
        const {
          presentation: _ignored,
          timing: _timingIgnored,
          clock: _clockIgnored,
          ...progress
        } = draft;
        return [game, { ...progress, activeMs: 0, hints: 0, undos: 0 }];
      }),
    ),
  };
}
