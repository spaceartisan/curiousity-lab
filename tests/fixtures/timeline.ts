// Fictional records for plotting checks and screenshots; no family data.
import { fictionalReview } from "./review";
import { TIME_ALGORITHM } from "../../src/storage/timing";
export function fictionalTimeline() {
  const state = fictionalReview();
  const base = {
    ...state.sessions[0],
    appVersion: "0.14.0",
    puzzleId: "fictional-timeline-sudoku",
  };
  state.sessions = Array.from({ length: 32 }, (_, i) => {
    const end = Date.UTC(2026, 9, 1 + Math.floor(i / 2), 15);
    return {
      ...base,
      id: `fictional-point-${String(i).padStart(2, "0")}`,
      attempt: i + 2,
      startedAt: new Date(end - 900000).toISOString(),
      endedAt:
        i === 1 ? "2026-10-01T11:00:00-04:00" : new Date(end).toISOString(),
      activeMs: i === 31 ? 600000 : 24000 + (Math.floor(i / 2) % 10) * 10000,
      hints: i === 4 ? 99 : i % 5,
      outcome: i === 4 ? ("unfinished" as const) : ("completed" as const),
      timing: {
        version: 1 as const,
        algorithm: TIME_ALGORITHM,
        coverage: "from-start" as const,
        pausedMs: (i % 3) * 1500,
      },
    };
  });
  state.sessions.push({
    ...state.sessions[0],
    id: "fictional-pause-unknown",
    timing: undefined,
  });
  state.sessions.push({
    ...state.sessions[0],
    id: "fictional-exploration",
    game: "music",
    mode: "piano",
    puzzleId: "fictional-free-piano",
    outcome: "explored",
  });
  return state;
}
