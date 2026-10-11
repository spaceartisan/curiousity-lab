import type { ScheduledNote } from "../games/piano";

export type Family = "classical" | "ragtime" | "hymn";
export interface Excerpt {
  id: string;
  title: string;
  composer: string;
  year: string;
  work: string;
  note: string;
  family: Family;
  known: "familiar" | "deeper";
  abc: string;
  /** [beat, lengthInBeats, midi, velocity, staff] — staff 0 is the upper staff. */
  events: [number, number, number, number, number][];
  /** [beat, 1 = down | 0 = up] */
  pedal: [number, number][];
  tempo: number;
  beats: number;
  source: { name: string; url: string; license: string };
}

export const FAMILIES: { id: Family | "all"; label: string }[] = [
  { id: "all", label: "Everything" },
  { id: "classical", label: "Classical" },
  { id: "ragtime", label: "Joplin & ragtime" },
  { id: "hymn", label: "Hymns & carols" },
];

let cache: Promise<Excerpt[]> | undefined;
export function loadRepertoire() {
  cache ??= import("../content/repertoire.json").then(
    (m) => m.default as unknown as Excerpt[],
  );
  return cache;
}

export function notesOf(excerpt: Excerpt, staff?: number): ScheduledNote[] {
  return excerpt.events
    .filter((e) => staff === undefined || e[4] === staff)
    .map(([at, beats, midi, velocity, s]) => ({
      at,
      beats,
      midi,
      velocity,
      staff: s,
    }));
}

/** The top line of the upper staff: one note per onset, the highest sounding pitch. */
export function melodyOf(excerpt: Excerpt): ScheduledNote[] {
  const byOnset = new Map<number, ScheduledNote>();
  for (const n of notesOf(excerpt, 0)) {
    const best = byOnset.get(n.at);
    if (!best || n.midi > best.midi) byOnset.set(n.at, n);
  }
  return [...byOnset.values()].sort((a, b) => a.at - b.at);
}

export function shuffled<T>(items: T[], random = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Three other pieces, preferring the same family so the choice takes real listening. */
export function choicesFor(
  answer: Excerpt,
  pool: Excerpt[],
  random = Math.random,
): Excerpt[] {
  const others = pool.filter(
    (p) => p.id !== answer.id && p.title !== answer.title,
  );
  const same = shuffled(
    others.filter((p) => p.family === answer.family),
    random,
  );
  const rest = shuffled(
    others.filter((p) => p.family !== answer.family),
    random,
  );
  const picked: Excerpt[] = [];
  for (const p of [...same, ...rest]) {
    if (picked.length === 3) break;
    if (!picked.some((q) => q.title === p.title)) picked.push(p);
  }
  return shuffled([answer, ...picked], random);
}

export const NOTE_NAMES = [
  "C",
  "C♯",
  "D",
  "E♭",
  "E",
  "F",
  "F♯",
  "G",
  "A♭",
  "A",
  "B♭",
  "B",
];
export const noteName = (midi: number) =>
  `${NOTE_NAMES[midi % 12]}${Math.floor(midi / 12) - 1}`;
export const isBlack = (midi: number) => [1, 3, 6, 8, 10].includes(midi % 12);
