// Entirely fictional records used only for review validation and screenshots.
import { emptyState, type Session } from "../../src/storage/contracts";
export function fictionalReview() {
  const state = emptyState("play");
  state.preferences.welcomeDone = true;
  const base: Session = {
    id: "fictional-base",
    schemaVersion: 1,
    appVersion: "0.11.0",
    contentVersion: "starter-1",
    game: "sudoku",
    puzzleId: "fictional-sudoku-a",
    startedAt: "2026-10-10T14:55:00Z",
    endedAt: "2026-10-10T15:00:00Z",
    activeMs: 120000,
    hints: 2,
    undos: 0,
    outcome: "completed",
    mode: "9x9:Classic",
    attempt: 2,
    source: "local-guest",
  };
  const record = (patch: Partial<Session>): Session => ({ ...base, ...patch });
  state.sessions = [
    record({
      id: "fictional-repeat-2",
      endedAt: "2026-10-08T15:00:00Z",
      startedAt: "2026-10-08T14:55:00Z",
    }),
    record({
      id: "fictional-repeat-3",
      attempt: 3,
      hints: 4,
      activeMs: 180000,
      endedAt: "2026-10-09T15:00:00Z",
      startedAt: "2026-10-09T14:55:00Z",
    }),
    record({
      id: "fictional-unfinished",
      attempt: 4,
      hints: 99,
      activeMs: 240000,
      outcome: "unfinished",
    }),
    record({ id: "fictional-first", attempt: 1, hints: 8 }),
    record({ id: "fictional-old-app", appVersion: "0.10.0" }),
    record({
      id: "fictional-hidden",
      mode: "9x9:Hidden singles",
      contentVersion: "sudoku-hidden-singles-1",
    }),
    record({
      id: "fictional-new-content",
      contentVersion: "other-fictional-version",
    }),
    record({ id: "fictional-other-puzzle", puzzleId: "fictional-sudoku-b" }),
    record({
      id: "fictional-lab",
      game: "lab",
      puzzleId: "fictional-slide",
      mode: "workbench:microbiology",
      contentVersion: "lab-workflow-1",
      outcome: "explored",
      hints: 100,
    }),
    record({
      id: "fictional-piano",
      game: "music",
      puzzleId: "music-studio-v1",
      mode: "piano",
      outcome: "completed",
      hints: 200,
    }),
    record({
      id: "fictional-clock",
      puzzleId: "fictional-clock",
      startedAt: "2026-10-10T16:00:00Z",
      endedAt: "2026-10-10T15:00:00Z",
    }),
    record({
      id: "fictional-utc-boundary",
      puzzleId: "fictional-boundary",
      startedAt: "2026-10-10T23:50:00-04:00",
      endedAt: "2026-10-10T23:55:00-04:00",
    }),
    ...Array.from({ length: 7 }, (_, i) =>
      record({
        id: `fictional-extra-${i}`,
        puzzleId: `fictional-extra-puzzle-${i}`,
      }),
    ),
  ];
  return state;
}
