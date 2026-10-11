// Music Room memory: kept on this device only.
export interface MusicRoomProgress {
  version: 1;
  /** Pieces in the order they will be offered; refilled when used up. */
  queue: string[];
  favorites: string[];
  named: Record<string, number>;
  heard: Record<string, number>;
  family: "all" | "classical" | "ragtime" | "hymn";
  mode: "ear" | "score";
  answer: "choices" | "reveal";
}

const KEY = "curiosity-lab:music-room:v1";
export const freshProgress = (): MusicRoomProgress => ({
  version: 1,
  queue: [],
  favorites: [],
  named: {},
  heard: {},
  family: "all",
  mode: "ear",
  answer: "choices",
});

export function readProgress(): MusicRoomProgress {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (raw?.version === 1) return { ...freshProgress(), ...raw };
  } catch {
    /* private mode or damaged entry */
  }
  return freshProgress();
}

export function writeProgress(progress: MusicRoomProgress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress));
  } catch {
    /* storage unavailable: keep working in memory */
  }
}
