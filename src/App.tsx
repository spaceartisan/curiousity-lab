import React, { useEffect, useRef, useState } from "react";
import {
  APP_VERSION,
  emptyState,
  type LocalState,
  type Role,
  type GameKind,
  type Draft,
  type Creation,
} from "./storage/contracts";
import { loadState, saveState, clearState } from "./storage/local";
import { SessionReview } from "./insights/SessionReview";
import { Creations } from "./creations/Creations";
import {
  latestNotebookVisit,
  type CollectionFilter,
} from "./creations/collection";
import { Icon } from "./ui/Icon";
import { Sudoku } from "./games/Sudoku";
import {
  generateSudoku,
  sudokuPuzzle,
  sudokuContentVersion,
  type SudokuData,
} from "./games/sudoku-engine";
import { connections, searchBoard, searchPacks } from "./content/words";
import { connectionsPuzzle } from "./games/connections-engine";
import { Connections, WordSearch } from "./games/Words";
import { Music, type MusicData } from "./games/Music";
import { exerciseCount, musicPuzzle } from "./content/music";
import { Laboratory } from "./games/Laboratory";
import { ActivityClock } from "./games/activity-clock";
import { stopAudio, playNotes } from "./games/audio";
import { specimens } from "./content/specimens";
import {
  labMode,
  labPuzzle,
  blankLabPage,
  selectLabSlide,
  type LabData,
} from "./content/laboratory";
import { incomingInvitation } from "./family/invitations";
import { FamilySetup } from "./family/FamilySetup";
import { useFamilyConnection } from "./family/useFamilyConnection";
import { SharingPreparation } from "./sharing/SharingPreparation";
import { usePreparation } from "./sharing/usePreparation";
import { clearAllPreparations } from "./sharing/local";
import { RecoveryPanel } from "./storage/RecoveryPanel";
import {
  parseBackup,
  clearRecovery,
  clearRecoveryHistory,
} from "./storage/recovery";
import "./styles.css";
const base = import.meta.env.BASE_URL;
const titles: Record<GameKind, string> = {
  sudoku: "Sudoku",
  connections: "Word Connections",
  search: "Word Search",
  music: "Music Studio",
  lab: "My Laboratory",
};
export function relativeTime(utc: string, now = Date.now()) {
  const delta = now - Date.parse(utc);
  if (!Number.isFinite(delta) || delta < 0)
    return "on " + new Date(utc).toLocaleDateString();
  if (delta < 60000) return "just now";
  if (delta < 3600000) return `${Math.floor(delta / 60000)} minutes ago`;
  if (delta < 86400000) return `${Math.floor(delta / 3600000)} hours ago`;
  return "on " + new Date(utc).toLocaleDateString();
}
function newDraft(game: GameKind, previous?: Draft, samePuzzle = false): Draft {
  const seed = crypto.getRandomValues(new Uint32Array(1))[0];
  const oldSudoku =
    previous?.game === "sudoku" ? (previous.data as SudokuData) : undefined;
  const oldMusic =
    previous?.game === "music" ? (previous.data as MusicData) : undefined;
  const oldLab =
    previous?.game === "lab" ? (previous.data as LabData) : undefined;
  const data =
    game === "sudoku"
      ? generateSudoku(
          oldSudoku?.size || 9,
          samePuzzle && oldSudoku ? oldSudoku.seed : seed,
          oldSudoku?.tier || "Classic",
        )
      : game === "connections"
        ? {
            pack: previous
              ? (Number((previous.data as { pack: number }).pack) +
                  (samePuzzle ? 0 : 1)) %
                connections.length
              : 0,
            solved: [],
            selected: [],
          }
        : game === "search"
          ? {
              pack: previous
                ? (Number((previous.data as { pack?: number }).pack ?? 0) +
                    (samePuzzle ? 0 : 1)) %
                  searchPacks.length
                : 0,
              found: [],
            }
          : game === "music"
            ? {
                mode: oldMusic?.mode ?? "piano",
                exercise: oldMusic
                  ? ((oldMusic.exercise ?? 0) + (samePuzzle ? 0 : 1)) %
                    exerciseCount(oldMusic.mode)
                  : 0,
                notes:
                  oldMusic?.mode !== "piano" ? (oldMusic?.notes ?? []) : [],
                title: oldMusic?.title ?? "My melody",
                solved: false,
                taps: 0,
                presentation: oldMusic?.presentation ?? "staff",
                tempo: oldMusic?.tempo ?? "comfortable",
                flexibility: oldMusic?.flexibility ?? "gentle",
              }
            : {
                ...blankLabPage(samePuzzle && oldLab ? oldLab.specimen : 0),
                stage: samePuzzle && oldLab ? "microscope" : "desk",
                experience: oldLab?.experience ?? "workbench",
                workflowRevision: 1,
                pages: oldLab?.pages ?? [],
              };
  return {
    id: crypto.randomUUID(),
    game,
    puzzleId:
      game === "sudoku"
        ? sudokuPuzzle(data as SudokuData)
        : game === "connections"
          ? connectionsPuzzle((data as { pack: number }).pack)
          : game === "search"
            ? searchBoard((data as { pack: number }).pack).id
            : game === "music"
              ? musicPuzzle(data as MusicData)
              : labPuzzle(data as LabData),
    startedAt: new Date().toISOString(),
    activeMs: 0,
    hints: 0,
    undos: 0,
    mode:
      game === "sudoku"
        ? `${oldSudoku?.size || 9}x${oldSudoku?.size || 9}:${oldSudoku?.tier || "Classic"}`
        : game === "music"
          ? (data as MusicData).mode
          : game === "lab"
            ? labMode(data as LabData)
            : "explore",
    data,
  };
}
function archive(
  state: LocalState,
  draft: Draft,
  outcome: "completed" | "explored" | "unfinished",
): LocalState {
  if (draft.finalized) return state;
  const sessions = state.preferences.history
    ? [
        ...state.sessions,
        {
          id: draft.id,
          schemaVersion: 1 as const,
          appVersion: APP_VERSION,
          contentVersion:
            draft.game === "sudoku"
              ? sudokuContentVersion(draft.data as SudokuData)
              : draft.game === "connections" &&
                  (draft.data as { pack: number }).pack >= 2
                ? "connections-2"
                : draft.game === "search" &&
                    draft.puzzleId !== "quiet-garden-v1"
                  ? "word-search-2"
                  : draft.game === "music" &&
                      draft.puzzleId !== "music-studio-v1"
                    ? "music-exercises-1"
                    : draft.game === "lab" &&
                        (draft.data as LabData).workflowRevision === 1
                      ? "lab-workflow-1"
                      : "starter-1",
          game: draft.game,
          puzzleId: draft.puzzleId,
          startedAt: draft.startedAt,
          endedAt: new Date().toISOString(),
          activeMs: Math.round(draft.activeMs),
          hints: draft.hints,
          undos: draft.undos,
          outcome,
          mode: draft.mode,
          attempt:
            state.sessions.filter(
              (s) => s.puzzleId === draft.puzzleId && s.mode === draft.mode,
            ).length + 1,
          source: "local-guest" as const,
        },
      ]
    : state.sessions;
  return {
    ...state,
    sessions,
    drafts: { ...state.drafts, [draft.game]: { ...draft, finalized: true } },
  };
}
export class Boundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <main>
        <h1>Let's take a fresh look.</h1>
        <p>This screen could not open. Your saved data has not been deleted.</p>
        <button onClick={() => location.reload()}>Reload the app</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
export function InstallPage() {
  return (
    <main className="install-page">
      <div className="brand">
        <Icon name="lab" />
        <span>Curiosity Lab</span>
      </div>
      <h1>
        A little room
        <br />
        for discovery.
      </h1>
      <p>
        Games, music, and a familiar laboratory desk.
        <br />
        Choose an installation link during setup.
      </p>
      <div className="install-links">
        {(["play", "companion", "insights"] as Role[]).map((r) => (
          <a className="install-link" href={base + r + "/"} key={r}>
            <Icon name={r === "play" ? "creations" : r} />
            <strong>
              {r === "play"
                ? "Play"
                : r === "companion"
                  ? "Companion"
                  : "Insights"}
            </strong>
            <span>
              {r === "play"
                ? "Open games"
                : r === "companion"
                  ? "Open companion view"
                  : "Open insights view"}{" "}
              →
            </span>
          </a>
        ))}
      </div>
      <p className="muted">
        Local preview · Family sharing is not connected in this first release.
      </p>
    </main>
  );
}
export function App({ appRole }: { appRole: Role }) {
  const family = useFamilyConnection(appRole);
  const connected = family.connection.status === "approved";
  const [state, setState] = useState<LocalState | null>(null),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false),
    [screen, setScreen] = useState<
      GameKind | "home" | "settings" | "connect" | "creations"
    >(incomingInvitation ? "connect" : "home"),
    [paused, setPaused] = useState(false),
    [demo, setDemo] = useState(false),
    [review, setReview] = useState<LocalState | null>(null),
    [updateReady, setUpdateReady] = useState<ServiceWorker | null>(null);
  const [creationFilter, setCreationFilter] = useState<CollectionFilter>("all");
  const [reviewRevision, setReviewRevision] = useState(0);
  const [restoreEpoch, setRestoreEpoch] = useState(0);
  const [restoreBusy, setRestoreBusy] = useState(false);
  const preparationError = usePreparation(family, state, restoreEpoch);
  const stateRef = useRef(state),
    screenRef = useRef(screen),
    clock = useRef(new ActivityClock(performance.now())),
    heading = useRef<HTMLHeadingElement>(null);
  stateRef.current = state;
  screenRef.current = screen;
  useEffect(() => {
    let active = true;
    loadState(appRole)
      .then((s) => {
        if (active) setState(s);
      })
      .catch(() => {
        if (active)
          setError(
            "Saved data could not be opened. It has not been deleted. Try reloading, or export an existing backup before starting fresh.",
          );
      });
    return () => {
      active = false;
    };
  }, [appRole]);
  useEffect(() => {
    if (!state || restoreBusy) return;
    setSaved(false);
    const timer = setTimeout(() => {
      saveState(state)
        .then(() => {
          if (stateRef.current === state) {
            setSaved(true);
            setError("");
          }
        })
        .catch(() =>
          setError(
            "This device could not save your latest changes. Keep this page open and download a backup in Settings.",
          ),
        );
    }, 200);
    return () => clearTimeout(timer);
  }, [state, restoreBusy]);
  useEffect(() => {
    heading.current?.focus();
    stopAudio();
    setPaused(false);
  }, [screen]);
  useEffect(() => {
    const add = (delta: number) => {
      const activeScreen = screenRef.current;
      if (
        delta > 0 &&
        activeScreen !== "home" &&
        activeScreen !== "settings" &&
        activeScreen !== "connect" &&
        activeScreen !== "creations"
      )
        setState((s) => {
          if (!s) return s;
          const d = s.drafts[activeScreen];
          if (!d || d.finalized || !s.preferences.history) return s;
          return {
            ...s,
            drafts: {
              ...s.drafts,
              [activeScreen]: { ...d, activeMs: d.activeMs + delta },
            },
          };
        });
    };
    const interacted = () => clock.current.interact(performance.now());
    const visibility = () => {
      add(clock.current.visibility(performance.now(), !document.hidden));
      if (document.hidden) stopAudio();
    };
    const flush = () => {
      const current = stateRef.current;
      if (current) void saveState(current).catch(() => undefined);
    };
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", flush);
    for (const event of ["pointerdown", "keydown"] as const)
      document.addEventListener(event, interacted);
    const timer = setInterval(
      () => add(clock.current.sample(performance.now())),
      1000,
    );
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", flush);
      for (const event of ["pointerdown", "keydown"] as const)
        document.removeEventListener(event, interacted);
    };
  }, []);
  useEffect(() => {
    clock.current.pause(
      performance.now(),
      paused ||
        screen === "home" ||
        screen === "settings" ||
        screen === "connect" ||
        screen === "creations",
    );
    clock.current.interact(performance.now());
  }, [screen, paused]);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register(base + appRole + "/sw.js", { scope: base + appRole + "/" })
      .then((reg) => {
        if (reg.waiting) setUpdateReady(reg.waiting);
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          worker?.addEventListener("statechange", () => {
            if (
              worker.state === "installed" &&
              navigator.serviceWorker.controller
            )
              setUpdateReady(worker);
          });
        });
      })
      .catch(() =>
        setError(
          "Offline setup could not finish. Games still work while this page is open.",
        ),
      );
  }, [appRole]);
  function open(game: GameKind) {
    setState((s) =>
      s
        ? {
            ...s,
            drafts: { ...s.drafts, [game]: s.drafts[game] ?? newDraft(game) },
          }
        : s,
    );
    setScreen(game);
  }
  function replay(samePuzzle = false) {
    if (!state || !(screen in titles)) return;
    const game = screen as GameKind;
    setState((s) => {
      if (!s) return s;
      const old = s.drafts[game];
      const archived = old ? archive(s, old, "unfinished") : s;
      return {
        ...archived,
        drafts: { ...archived.drafts, [game]: newDraft(game, old, samePuzzle) },
      };
    });
  }
  function update(
    data: unknown,
    metrics?: { hint?: boolean; undo?: boolean; mode?: string; view?: boolean },
  ) {
    const game = screen as GameKind;
    setState((s) => {
      if (!s) return s;
      const old = s.drafts[game];
      if (!old) return s;
      let d = old;
      let next = s;
      const newContent =
        game === "sudoku" &&
        (data as { seed: number }).seed !== (old.data as { seed: number }).seed;
      const newSpecimen =
        game === "lab" &&
        (data as { specimen: number }).specimen !==
          (old.data as { specimen: number }).specimen;
      if (
        (old.finalized && !metrics?.view) ||
        newContent ||
        newSpecimen ||
        (metrics?.mode && metrics.mode !== old.mode)
      ) {
        next = archive(s, old, "unfinished");
        d = {
          ...newDraft(game),
          data,
          puzzleId:
            game === "sudoku"
              ? sudokuPuzzle(data as SudokuData)
              : game === "lab"
                ? labPuzzle(data as LabData)
                : game === "music"
                  ? musicPuzzle(data as MusicData)
                  : old.puzzleId,
          mode: metrics?.mode || old.mode,
        };
      }
      return {
        ...next,
        drafts: {
          ...next.drafts,
          [game]: {
            ...d,
            data,
            hints: s.preferences.history
              ? d.hints + (metrics?.hint ? 1 : 0)
              : 0,
            undos: s.preferences.history
              ? d.undos + (metrics?.undo ? 1 : 0)
              : 0,
          },
        },
      };
    });
  }
  function finish(outcome: "completed" | "explored" | "unfinished") {
    const game = screen as GameKind;
    setState((s) =>
      s && s.drafts[game] ? archive(s, s.drafts[game]!, outcome) : s,
    );
  }
  function create(item: Omit<Creation, "id" | "savedAt">) {
    setState((s) =>
      s
        ? {
            ...s,
            creations: [
              ...s.creations,
              {
                ...item,
                id: crypto.randomUUID(),
                savedAt: new Date().toISOString(),
              },
            ],
          }
        : s,
    );
  }
  function openCreations(filter: CollectionFilter = "all") {
    setCreationFilter(filter);
    setScreen("creations");
  }
  function revisitCreation(c: Creation) {
    const index = specimens.findIndex((asset) => asset.id === c.specimenId);
    if (index < 0) {
      setError(
        "This specimen is not available in the current content pack. Your note is preserved.",
      );
      return;
    }
    setState((s) => {
      if (!s) return s;
      const data: LabData = {
        specimen: index,
        stage: "microscope",
        zoom: c.zoom || 1,
        pan: c.pan || [0, 0],
        observations: c.observations || [],
        text: c.text || "",
        pages: s.drafts.lab
          ? selectLabSlide(
              s.drafts.lab.data as LabData,
              index,
              c.labExperience ?? "workbench",
              "microscope",
            ).pages
          : [],
        ...(c.labWorkflowVersion === 1
          ? { workflowRevision: 1, experience: c.labExperience ?? "workbench" }
          : {}),
      };
      const next = s.drafts.lab ? archive(s, s.drafts.lab, "unfinished") : s;
      return {
        ...next,
        creations: next.creations.map((entry) =>
          entry.id === c.id
            ? { ...entry, lastViewedAt: new Date().toISOString() }
            : entry,
        ),
        drafts: {
          ...next.drafts,
          lab: {
            ...newDraft("lab"),
            data,
            puzzleId: labPuzzle(data),
            mode: labMode(data),
          },
        },
      };
    });
    setScreen("lab");
  }
  async function importFile(file: File, inspect = false) {
    try {
      const parsed = await parseBackup(file, inspect ? "play" : appRole);
      if (inspect) {
        setReview(parsed);
        setReviewRevision((n) => n + 1);
        return;
      }
    } catch {
      setError(
        "This file is not a supported backup for this app. Your existing data is unchanged.",
      );
    }
  }
  if (!state)
    return (
      <main>
        <h1>Curiosity Lab</h1>
        <p>{error || "Opening your desk…"}</p>
        {error && (
          <>
            <button onClick={() => location.reload()}>Try again</button>
            <button
              onClick={() => {
                if (
                  window.confirm(
                    "Remove the unreadable local save and start fresh?",
                  )
                ) {
                  void clearState(appRole).then(() => {
                    setState(emptyState(appRole));
                    setError("");
                  });
                }
              }}
            >
              Start fresh
            </button>
          </>
        )}
      </main>
    );
  const prefs = state.preferences;
  const changePrefs = (p: Partial<typeof prefs>) =>
    setState((s) => {
      if (!s) return s;
      const drafts =
        p.history !== undefined && p.history !== s.preferences.history
          ? Object.fromEntries(
              Object.entries(s.drafts).map(([key, d]) => [
                key,
                {
                  ...d,
                  id: crypto.randomUUID(),
                  startedAt: new Date().toISOString(),
                  activeMs: 0,
                  hints: 0,
                  undos: 0,
                },
              ]),
            )
          : s.drafts;
      return { ...s, drafts, preferences: { ...s.preferences, ...p } };
    });
  const game = screen in titles ? (screen as GameKind) : null;
  const draft = game ? state.drafts[game] : null;
  const props = draft
    ? {
        draft,
        update,
        finish,
        create,
        replay: () => replay(),
        repeat: () => replay(true),
      }
    : null;
  return (
    <div className={`app theme-${prefs.theme} text-${prefs.textSize}`}>
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <header className="topbar">
        <button
          className="brand"
          disabled={restoreBusy}
          onClick={() => setScreen("home")}
          aria-label="Curiosity Lab home"
        >
          <Icon name="lab" />
          <span>
            Curiosity Lab{" "}
            <small>
              {appRole === "play"
                ? "Play"
                : appRole === "companion"
                  ? "Companion"
                  : "Insights"}
            </small>
          </span>
        </button>
        <button
          className="settings-button"
          disabled={restoreBusy}
          onClick={() => setScreen("settings")}
        >
          <Icon name="settings" small />
          Settings
        </button>
      </header>
      <main id="content">
        {error && (
          <p className="notice" role="alert">
            {error}
          </p>
        )}
        {updateReady && (
          <div className="notice">
            An update is ready. Your progress is saved before updating.{" "}
            <button
              onClick={async () => {
                try {
                  await saveState(state);
                  navigator.serviceWorker.addEventListener(
                    "controllerchange",
                    () => location.reload(),
                    { once: true },
                  );
                  updateReady.postMessage({ type: "ACTIVATE_UPDATE" });
                } catch {
                  setError(
                    "Please download a backup before updating; your latest save could not be written.",
                  );
                }
              }}
            >
              Update now
            </button>
          </div>
        )}
        {screen !== "home" && (
          <button
            className="back-button"
            disabled={restoreBusy}
            onClick={() => setScreen("home")}
          >
            <Icon name="back" small />
            {appRole === "play" ? "Back to games" : "Back to overview"}
          </button>
        )}
        {screen === "home" && appRole === "play" ? (
          <>
            <section className="welcome">
              <p className="eyebrow">Your curiosity belongs here</p>
              <h1 ref={heading} tabIndex={-1}>
                What would you like
                <br />
                to explore?
              </h1>
              <p>
                A puzzle, a melody, a closer look.
                <br />
                There is always time to come back.
              </p>
              <div className="welcome-mark" aria-hidden="true">
                <Icon name="lab" />
              </div>
            </section>
            {preparationError && <p role="alert">{preparationError}</p>}
            {connected && (
              <div className="connection-note" role="status">
                Connected to your family. Your games stay on this device.
                Optional sharing choices are in Settings.
              </div>
            )}
            {!prefs.welcomeDone && (
              <div className="welcome-note">
                <strong>Make yourself at home.</strong>
                <p>
                  Your puzzles and creations save on this device. Activity
                  history is optional, stays here, and can be switched off in
                  Settings. Connecting your family does not start sharing.
                </p>
                <div className="actions">
                  <button
                    className="primary"
                    onClick={() =>
                      changePrefs({ welcomeDone: true, history: false })
                    }
                  >
                    Play without activity history
                  </button>
                  <button
                    onClick={() =>
                      changePrefs({ welcomeDone: true, history: true })
                    }
                  >
                    Keep activity history on this device
                  </button>
                </div>
              </div>
            )}
            <div className="library-grid">
              {[
                {
                  title: "Numbers",
                  icon: "numbers",
                  text: "Settle into a Sudoku.",
                  game: "sudoku",
                },
                {
                  title: "Words",
                  icon: "words",
                  text: "Find a familiar connection.",
                  game: "connections",
                },
                {
                  title: "Music",
                  icon: "music",
                  text: "Hear, play, and make a melody.",
                  game: "music",
                },
                {
                  title: "My Laboratory",
                  icon: "lab",
                  text: "Take a closer look at your desk.",
                  game: "lab",
                },
                {
                  title: "My Creations",
                  icon: "creations",
                  text: "Your melodies and lab notebook.",
                  game: "creations",
                },
              ].map((card, i) => {
                const previous = state.sessions
                  .filter((s) => s.game === card.game)
                  .at(-1);
                return (
                  <button
                    key={card.title}
                    className={`library-card card-${i}`}
                    onClick={() =>
                      card.game === "creations"
                        ? openCreations()
                        : open(card.game as GameKind)
                    }
                  >
                    <span className="card-top">
                      <Icon name={card.icon} />
                      <span aria-hidden="true">↗</span>
                    </span>
                    <h2>{card.title}</h2>
                    <p>{card.text}</p>
                    <span className="card-history">
                      {state.drafts[card.game as GameKind] &&
                      !state.drafts[card.game as GameKind]?.finalized
                        ? "A saved activity to continue"
                        : previous
                          ? `Last played: ${relativeTime(previous.endedAt)}`
                          : card.game === "creations"
                            ? `${state.creations.length} saved creations`
                            : "Explore whenever you like"}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="word-choice">
              <span>Another way to enjoy words</span>
              <button onClick={() => open("search")}>Open Word Search →</button>
            </div>
          </>
        ) : screen === "home" ? (
          <>
            <section className="welcome">
              <p className="eyebrow">
                {appRole === "companion"
                  ? "A companion to curiosity"
                  : "A thoughtful view of activity"}
              </p>
              <h1 ref={heading} tabIndex={-1}>
                {appRole === "companion" ? (
                  <>
                    The little things
                    <br />
                    worth sharing.
                  </>
                ) : (
                  <>
                    Keep the context.
                    <br />
                    Follow the curiosity.
                  </>
                )}
              </h1>
              <p>
                {appRole === "companion"
                  ? "Favorite activities, saved discoveries, and ideas for time together."
                  : "Review recorded activity with its source, versions, and limits."}
              </p>
            </section>
            <div className="empty-family">
              <Icon name={appRole} />
              <h2>
                {connected
                  ? "Connected to your family"
                  : family.connection.status === "checking"
                    ? "Checking your family connection…"
                    : family.connection.status === "revoked"
                      ? "This device’s connection was removed"
                      : family.connection.status === "unavailable"
                        ? "Family connection could not be checked"
                        : "Family sharing is not connected"}
              </h2>
              <button className="primary" onClick={() => setScreen("connect")}>
                {connected
                  ? "Manage family connection"
                  : appRole === "insights"
                    ? "Connect your family"
                    : "Enter a connection code"}
              </button>
              <p>
                {connected
                  ? "Your connection is ready. Activity sharing has not started, so there are no shared records to show yet."
                  : "Connect once to join your family. Activity stays on Play’s device until sharing is separately enabled."}
              </p>
              <button onClick={() => setDemo(!demo)}>
                {demo ? "Close fictional example" : "View a fictional example"}
              </button>
            </div>
            {demo && (
              <section className="demo-panel">
                <p className="eyebrow">Fictional example · No family data</p>
                {appRole === "companion" ? (
                  <>
                    <h2>A few things to revisit together</h2>
                    <div className="summary-grid">
                      <article>
                        <Icon name="music" />
                        <h3>A melody saved</h3>
                        <p>“Morning notes” is ready to hear again.</p>
                      </article>
                      <article>
                        <Icon name="lab" />
                        <h3>A notebook discovery</h3>
                        <p>Fungal forms were added to the notebook.</p>
                      </article>
                    </div>
                    <p>
                      Conversation idea: “Would you like to show me your
                      favorite slide?”
                    </p>
                  </>
                ) : (
                  <>
                    <h2>Recorded activity</h2>
                    <p>
                      Compare activities only when content, difficulty, and
                      presentation match. Duration does not establish enjoyment
                      or cognitive change.
                    </p>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Activity</th>
                            <th>Context</th>
                            <th>Active time</th>
                            <th>Outcome</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Sudoku</td>
                            <td>9×9 Classic · first attempt</td>
                            <td>8 min</td>
                            <td>Completed</td>
                          </tr>
                          <tr>
                            <td>Laboratory</td>
                            <td>Free exploration · PHIL 26402</td>
                            <td>3 min</td>
                            <td>Explored</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </section>
            )}
            {appRole === "insights" && (
              <>
                <section className="subtle-panel local-export-review">
                  <h2>Review a local Play export</h2>
                  <p>
                    Choose a backup from Play to inspect it in this tab. It is
                    not uploaded, merged, or stored in Insights.
                  </p>
                  <label className="file-control">
                    Open Play JSON backup
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void importFile(file, true);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  {review && (
                    <SessionReview
                      key={reviewRevision}
                      review={review}
                      onClose={() => setReview(null)}
                    />
                  )}
                </section>
                <section className="subtle-panel">
                  <h2>Installation links</h2>
                  <div className="actions">
                    {(["play", "companion", "insights"] as Role[]).map((r) => (
                      <a href={base + r + "/"} key={r}>
                        Curiosity Lab — {r[0].toUpperCase() + r.slice(1)}
                      </a>
                    ))}
                  </div>
                </section>
              </>
            )}
          </>
        ) : null}
        {screen === "connect" && (
          <div className="connection-page">
            <h1 ref={heading} tabIndex={-1}>
              {appRole === "insights"
                ? "Connect your family"
                : "Connect your app"}
            </h1>
            <FamilySetup role={appRole} context={family} />
          </div>
        )}
        {screen === "settings" && (
          <>
            <p className="eyebrow">A comfortable place to play</p>
            <h1 ref={heading} tabIndex={-1}>
              Settings
            </h1>
            <div className="settings-grid">
              <section>
                <h2>Look & sound</h2>
                <label>
                  Theme{" "}
                  <select
                    value={prefs.theme}
                    onChange={(e) =>
                      changePrefs({ theme: e.target.value as "light" | "dark" })
                    }
                  >
                    <option value="light">Warm light</option>
                    <option value="dark">Quiet dark</option>
                  </select>
                </label>
                <label>
                  Text size{" "}
                  <select
                    value={prefs.textSize}
                    onChange={(e) =>
                      changePrefs({
                        textSize: e.target.value as "normal" | "large",
                      })
                    }
                  >
                    <option value="normal">Comfortable</option>
                    <option value="large">Larger</option>
                  </select>
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={prefs.sound}
                    onChange={(e) => {
                      stopAudio();
                      changePrefs({ sound: e.target.checked });
                    }}
                  />
                  Sound on
                </label>
                <label>
                  Volume{" "}
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={prefs.volume}
                    onChange={(e) =>
                      changePrefs({ volume: Number(e.target.value) })
                    }
                  />
                </label>
                <button
                  disabled={!prefs.sound}
                  onClick={() =>
                    playNotes([0, 2, 4], prefs.volume).catch(() =>
                      setError(
                        "Sound could not start. Check your device volume and try again.",
                      ),
                    )
                  }
                >
                  Try a few notes
                </button>
              </section>
              <section>
                <h2>Your data, your choice</h2>
                <p>
                  Puzzle progress and things you save stay on this device.
                  Optional history records active time, puzzle version, hints,
                  and undo counts. Nothing is sent to a server.
                </p>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={prefs.history}
                    onChange={(e) => changePrefs({ history: e.target.checked })}
                  />
                  Keep activity history on this device
                </label>
                <p className="muted">
                  Switching off stops new history records. Existing history
                  stays until you clear it. Saved progress and creations keep
                  working.
                </p>
                <button
                  disabled={restoreBusy}
                  onClick={async () => {
                    if (
                      window.confirm(
                        "Clear recorded activity history and prepared copies? Saved puzzles and creations will remain.",
                      )
                    ) {
                      try {
                        if (appRole === "play") await clearAllPreparations();
                        await clearRecoveryHistory(appRole);
                        setState((s) => (s ? { ...s, sessions: [] } : s));
                      } catch {
                        setError(
                          "Prepared copies could not be cleared. Please try again; your history has not been removed.",
                        );
                      }
                    }
                  }}
                >
                  Clear activity history
                </button>
              </section>
              <FamilySetup role={appRole} context={family} />
              {appRole === "play" && (
                <SharingPreparation context={family} state={state} />
              )}
              <RecoveryPanel
                onRestoreBusy={setRestoreBusy}
                role={appRole}
                state={state}
                onRestore={(next) => {
                  setRestoreEpoch((epoch) => epoch + 1);
                  setState(next);
                  setError("");
                }}
              />
              <section>
                <h2>Remove local data</h2>
                <button
                  disabled={restoreBusy}
                  onClick={async () => {
                    if (
                      window.confirm(
                        "Remove all local data for this app, including progress, creations, and history? Download a backup first if you want to keep it.",
                      )
                    ) {
                      try {
                        if (appRole === "play") await clearAllPreparations();
                        await clearRecovery(appRole);
                        await clearState(appRole);
                        setState(emptyState(appRole));
                        setScreen("home");
                      } catch {
                        setError(
                          "Local data could not be fully removed. Please try again.",
                        );
                      }
                    }
                  }}
                >
                  Remove this app’s local data
                </button>
              </section>
              <section>
                <h2>Install this app</h2>
                <p>
                  On iPhone or iPad: open this app link in Safari, tap Share,
                  then Add to Home Screen. On Android or desktop: use the
                  browser’s Install app option when offered.
                </p>
                <p>
                  Each role has its own icon and launch link. Installation on
                  the family’s actual devices still needs verification.
                </p>
                <p className="muted">Version {APP_VERSION} · Local recovery</p>
              </section>
            </div>
          </>
        )}
        {screen === "creations" && (
          <>
            <p className="eyebrow">Made and discovered by you</p>
            <h1 className="collection-heading" ref={heading} tabIndex={-1}>
              {creationFilter === "notebook"
                ? "My Lab Notebook"
                : creationFilter === "melody"
                  ? "My Melodies"
                  : "My Creations"}
            </h1>
            <Creations
              creations={state.creations}
              filter={creationFilter}
              onFilter={setCreationFilter}
              relativeTime={relativeTime}
              sound={prefs.sound}
              volume={prefs.volume}
              onSound={(sound) => changePrefs({ sound })}
              onVolume={(volume) => changePrefs({ volume })}
              onMusic={() => open("music")}
              onLab={() => open("lab")}
              onRevisit={revisitCreation}
              onHear={(c) => {
                if (prefs.sound)
                  void playNotes(c.notes || [], prefs.volume).catch(() =>
                    setError(
                      "Sound could not start. Check your volume and try again.",
                    ),
                  );
                else setError("Turn sound on here to hear your melody.");
              }}
              onRemove={(c) => {
                if (window.confirm("Remove this saved creation?"))
                  setState((s) =>
                    s
                      ? {
                          ...s,
                          creations: s.creations.filter((x) => x.id !== c.id),
                        }
                      : s,
                  );
              }}
            />
          </>
        )}
        {game && props && (
          <>
            <div className="game-heading">
              <div>
                <p className="eyebrow">A little discovery, at your pace</p>
                <h1 ref={heading} tabIndex={-1}>
                  {titles[game]}
                </h1>
              </div>
              <div className="actions">
                <button onClick={() => setPaused(!paused)}>
                  {paused ? "Resume" : "Pause"}
                </button>
                <button
                  onClick={() => {
                    finish(
                      game === "lab" || game === "music"
                        ? "explored"
                        : "unfinished",
                    );
                    setScreen("home");
                  }}
                >
                  Finish for now
                </button>
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        "Start a new activity? Your current attempt will finish.",
                      )
                    )
                      replay();
                  }}
                >
                  New activity
                </button>
              </div>
            </div>
            {paused ? (
              <section className="pause-panel">
                <h2>Your place is kept.</h2>
                <p>Come back whenever you like.</p>
                <button className="primary" onClick={() => setPaused(false)}>
                  Resume
                </button>
              </section>
            ) : (
              <section className="game-surface">
                {game === "sudoku" ? (
                  <Sudoku key={props.draft.id} {...props} />
                ) : game === "connections" ? (
                  <Connections key={props.draft.id} {...props} />
                ) : game === "search" ? (
                  <WordSearch key={props.draft.id} {...props} />
                ) : game === "music" ? (
                  <Music
                    key={props.draft.id}
                    {...props}
                    sound={prefs.sound}
                    volume={prefs.volume}
                    onSoundChange={(sound) => changePrefs({ sound })}
                    onVolumeChange={(volume) => changePrefs({ volume })}
                  />
                ) : (
                  <Laboratory
                    key={props.draft.id}
                    {...props}
                    onNotebook={() => openCreations("notebook")}
                    lastNotebookVisit={(() => {
                      const value = latestNotebookVisit(
                        state.creations,
                        specimens[(props.draft.data as LabData).specimen].id,
                      );
                      return value ? relativeTime(value) : undefined;
                    })()}
                  />
                )}
              </section>
            )}
          </>
        )}
      </main>
      <footer>
        <span>Curiosity Lab · A place to explore</span>
        <span aria-live="polite">
          {saved ? "Saved on this device" : "Saving on this device…"}
        </span>
      </footer>
    </div>
  );
}
