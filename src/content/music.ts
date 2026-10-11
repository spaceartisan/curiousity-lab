// Original short exercises; no song recordings or copyrighted tune assets.
export const phraseExercises = [
  {
    id: "ascending-steps-v1",
    title: "Up one step",
    heard: [0, 1, 2],
    next: 3,
    rule: "Each note moves up one step. Which note comes next?",
    hint: "C, D, E… the next step is F.",
  },
  {
    id: "descending-steps-v1",
    title: "Down one step",
    heard: [6, 5, 4],
    next: 3,
    rule: "Each note moves down one step. Which note comes next?",
    hint: "B, A, G… the next step is F.",
  },
  {
    id: "rising-skips-v1",
    title: "Skip a step",
    heard: [0, 2, 4],
    next: 6,
    rule: "Each note skips one letter on the way up. Which note comes next?",
    hint: "C, E, G… skip A and continue to B.",
  },
  {
    id: "return-home-v1",
    title: "Back to the beginning",
    heard: [0, 2, 4, 2],
    next: 0,
    rule: "The phrase rises, then retraces its steps to its first note. Which note finishes it?",
    hint: "C, E, G, E… return to C.",
  },
];
export const classicMelodies = [
  {
    id: "small-arch-v1",
    title: "A little arch",
    target: [0, 2, 4, 2],
    other: [4, 2, 0, 2],
    correct: 0,
  },
  {
    id: "descending-line-v1",
    title: "A descending line",
    target: [6, 5, 4, 3],
    other: [1, 2, 3, 4],
    correct: 1,
  },
  {
    id: "neighbour-notes-v1",
    title: "Neighbour notes",
    target: [2, 3, 2, 1],
    other: [2, 1, 2, 3],
    correct: 0,
  },
  {
    id: "rising-line-v1",
    title: "A rising line",
    target: [1, 2, 3, 4],
    other: [4, 3, 2, 1],
    correct: 1,
  },
];
// Original five-note comparisons with the same contour and endpoints.
export const challengingMelodies = [
  {
    id: "inner-turn-v1",
    title: "Inner turn",
    target: [0, 2, 4, 3, 5],
    other: [0, 2, 5, 3, 5],
    correct: 0,
  },
  {
    id: "returning-line-v1",
    title: "Returning line",
    target: [6, 4, 2, 3, 1],
    other: [6, 4, 1, 3, 1],
    correct: 1,
  },
  {
    id: "repeated-centre-v1",
    title: "Repeated centre",
    target: [1, 3, 3, 5, 2],
    other: [1, 3, 3, 6, 2],
    correct: 0,
  },
  {
    id: "turn-and-return-v1",
    title: "Turn and return",
    target: [5, 2, 4, 1, 3],
    other: [5, 2, 3, 1, 3],
    correct: 1,
  },
];
export const melodyExercises = [...classicMelodies, ...challengingMelodies];
export type MelodyTier = "Classic" | "Challenging";
export function melodyTier(exercise = 0): MelodyTier {
  return exercise < classicMelodies.length ? "Classic" : "Challenging";
}
export function melodyPool(tier: MelodyTier) {
  return melodyExercises.map((_, i) => i).filter((i) => melodyTier(i) === tier);
}
export function nextMusicExercise(
  data: { mode: MusicMode; exercise?: number },
  repeat = false,
) {
  const index = data.exercise ?? 0;
  if (repeat) return index;
  if (data.mode === "match") {
    const pool = melodyPool(melodyTier(index));
    return pool[(pool.indexOf(index) + 1) % pool.length];
  }
  return (index + 1) % exerciseCount(data.mode);
}
export function musicTaskMode(data: { mode: MusicMode; exercise?: number }) {
  return data.mode === "match" && melodyTier(data.exercise) === "Challenging"
    ? "match:challenging"
    : data.mode;
}
export function musicContentVersion(
  data: { mode: MusicMode; exercise?: number },
  puzzleId: string,
) {
  return musicTaskMode(data) === "match:challenging"
    ? "music-melodies-2"
    : puzzleId === "music-studio-v1"
      ? "starter-1"
      : "music-exercises-1";
}
export const rhythmExercises = [
  {
    id: "steady-four-v1",
    title: "Four steady beats",
    beats: [0, 1, 2, 3],
    description: "Four evenly spaced beats.",
  },
  {
    id: "two-pairs-v1",
    title: "Two pairs",
    beats: [0, 1, 3, 4],
    description: "Two beats, a longer space, then two more beats.",
  },
  {
    id: "three-and-one-v1",
    title: "Three and one",
    beats: [0, 1, 2, 4],
    description: "Three beats, a longer space, then one last beat.",
  },
];
export type MusicMode = "piano" | "phrase" | "match" | "rhythm";
export function exerciseCount(mode: MusicMode) {
  return mode === "phrase"
    ? phraseExercises.length
    : mode === "match"
      ? melodyExercises.length
      : mode === "rhythm"
        ? rhythmExercises.length
        : 1;
}
export function musicPuzzle(data: { mode: MusicMode; exercise?: number }) {
  if (data.exercise === undefined) return "music-studio-v1";
  const index = data.exercise;
  return data.mode === "phrase"
    ? phraseExercises[index].id
    : data.mode === "match"
      ? melodyExercises[index].id
      : data.mode === "rhythm"
        ? rhythmExercises[index].id
        : "free-piano-v1";
}
// Feedback is relative to the player's own pace; no score or failure outcome.
// Timestamps remain in component memory and are never saved or exported.
export function rhythmFeedback(
  times: number[],
  beats: number[],
  flexibility: "gentle" | "extra" = "gentle",
) {
  if (times.length !== beats.length || times.length < 2) return false;
  const gaps = times.slice(1).map((t, i) => t - times[i]);
  const expected = beats.slice(1).map((t, i) => t - beats[i]);
  const total = gaps.reduce((a, b) => a + b, 0),
    target = expected.reduce((a, b) => a + b, 0);
  if (!Number.isFinite(total) || total <= 0 || gaps.some((g) => g < 80))
    return false;
  return gaps.every(
    (gap, i) =>
      Math.abs(gap / total - expected[i] / target) <=
      (flexibility === "extra" ? 0.25 : 0.12),
  );
}
