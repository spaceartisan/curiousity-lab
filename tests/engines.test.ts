import { describe, it, expect } from "vitest";
import {
  generateSudoku,
  solutionCount,
  solvedBySingles,
  candidates,
  isComplete,
  type Size,
} from "../src/games/sudoku-engine";
import { connections, searchPack, wordPath } from "../src/content/words";
import { ActivityClock } from "../src/games/activity-clock";
import { emptyState, validateState } from "../src/storage/contracts";
import {
  saveState,
  loadState,
  clearState,
  csvSafe,
} from "../src/storage/local";
describe("reproducible Sudoku", () => {
  for (const size of [4, 6, 9] as Size[])
    for (const tier of ["Relaxed", "Classic"] as const)
      it(`${size} ${tier}: valid, unique, singles-solvable puzzles over 12 seeds`, () => {
        for (let seed = 1; seed <= 12; seed++) {
          const d = generateSudoku(size, seed, tier);
          expect(d).toEqual(generateSudoku(size, seed, tier));
          expect(solutionCount(d.givens, size)).toBe(1);
          expect(solvedBySingles(d.givens, size)).toBe(true);
          expect(d.givens.some((n) => !n)).toBe(true);
          expect(new Set(d.solution.slice(0, size)).size).toBe(size);
          expect(isComplete({ ...d, cells: d.solution })).toBe(true);
          expect(isComplete(d)).toBe(false);
          for (let i = 0; i < d.cells.length; i++)
            if (!d.cells[i])
              expect(candidates(d.cells, i, size)).toContain(d.solution[i]);
        }
      });
});
it("word packs have disjoint, complete groups and solvable search words", () => {
  for (const p of connections) {
    expect(p.groups).toHaveLength(4);
    expect(new Set(p.groups.flatMap((g) => g.words)).size).toBe(16);
  }
  searchPack.words.forEach((w, i) =>
    expect(searchPack.rows[i].startsWith(w)).toBe(true),
  );
  expect(wordPath(0, 7, 8)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  expect(wordPath(9, 27, 8)).toEqual([9, 18, 27]);
  expect(wordPath(0, 10, 8)).toEqual([]);
});
it("active clock excludes background, pause and inactivity without counting resumed gaps", () => {
  const c = new ActivityClock(0);
  expect(c.sample(10000)).toBe(10000);
  expect(c.visibility(12000, false)).toBe(2000);
  expect(c.sample(90000)).toBe(0);
  expect(c.visibility(100000, true)).toBe(0);
  c.interact(100000);
  expect(c.sample(105000)).toBe(5000);
  expect(c.pause(106000, true)).toBe(1000);
  expect(c.sample(115000)).toBe(0);
  expect(c.pause(120000, false)).toBe(0);
  c.interact(120000);
  expect(c.sample(200000)).toBe(60000);
  c.interact(200000);
  expect(c.sample(201000)).toBe(1000);
});
it("role-isolated saves survive reload and queued writes keep latest state", async () => {
  await clearState("play");
  await clearState("companion");
  const state = emptyState("play");
  const first = {
    ...state,
    creations: [
      {
        id: "a",
        kind: "melody" as const,
        title: "A",
        notes: [0, 2],
        savedAt: new Date().toISOString(),
      },
    ],
  };
  const latest = {
    ...first,
    preferences: { ...first.preferences, sound: true },
  };
  await Promise.all([saveState(first), saveState(latest)]);
  expect(await loadState("play")).toEqual(latest);
  expect((await loadState("companion")).creations).toEqual([]);
  expect(() => validateState(latest, "companion")).toThrow();
});
it("CSV neutralizes spreadsheet formula cells", () => {
  expect(csvSafe('=HYPERLINK("bad")')).toBe('"\'=HYPERLINK(""bad"")"');
});
it("rejects malformed puzzle imports before altering local records", () => {
  const s = emptyState("play");
  s.drafts.sudoku = {
    id: "draft",
    game: "sudoku",
    puzzleId: "seed",
    startedAt: new Date().toISOString(),
    activeMs: 0,
    hints: 0,
    undos: 0,
    mode: "9x9:Classic",
    data: generateSudoku(9, 23),
  };
  expect(() => validateState(s, "play")).not.toThrow();
  const bad = structuredClone(s);
  (bad.drafts.sudoku!.data as { cells: number[] }).cells = [];
  expect(() => validateState(bad, "play")).toThrow();
});
