export type Size = 4 | 6 | 9;
export interface SudokuData {
  size: Size;
  tier: "Relaxed" | "Classic";
  seed: number;
  givens: number[];
  solution: number[];
  cells: number[];
  notes: number[][];
  history: { cells: number[]; notes: number[][] }[];
}
export function dimensions(size: Size) {
  return { rows: size === 9 ? 3 : 2, cols: size === 4 ? 2 : 3 };
}
export function candidates(
  cells: number[],
  index: number,
  size: Size,
): number[] {
  if (cells[index]) return [];
  const { rows, cols } = dimensions(size);
  const row = Math.floor(index / size),
    col = index % size;
  const used = new Set<number>();
  for (let k = 0; k < size; k++) {
    used.add(cells[row * size + k]);
    used.add(cells[k * size + col]);
  }
  for (
    let r = Math.floor(row / rows) * rows;
    r < Math.floor(row / rows) * rows + rows;
    r++
  )
    for (
      let c = Math.floor(col / cols) * cols;
      c < Math.floor(col / cols) * cols + cols;
      c++
    )
      used.add(cells[r * size + c]);
  return Array.from({ length: size }, (_, i) => i + 1).filter(
    (n) => !used.has(n),
  );
}
export function solutionCount(input: number[], size: Size, limit = 2): number {
  const cells = [...input];
  let count = 0;
  function visit() {
    let at = -1,
      options: number[] = [];
    for (let i = 0; i < cells.length; i++)
      if (!cells[i]) {
        const c = candidates(cells, i, size);
        if (!c.length) return;
        if (at < 0 || c.length < options.length) {
          at = i;
          options = c;
        }
        if (c.length === 1) break;
      }
    if (at < 0) {
      count++;
      return;
    }
    for (const n of options) {
      cells[at] = n;
      visit();
      if (count >= limit) break;
    }
    cells[at] = 0;
  }
  visit();
  return count;
}
export function solvedBySingles(input: number[], size: Size): boolean {
  const cells = [...input];
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < cells.length; i++)
      if (!cells[i]) {
        const c = candidates(cells, i, size);
        if (c.length === 1) {
          cells[i] = c[0];
          changed = true;
        }
      }
  }
  return cells.every(Boolean);
}
export function generateSudoku(
  size: Size,
  seed: number,
  tier: "Relaxed" | "Classic" = "Classic",
): SudokuData {
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const shuffled = (a: number[]) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const { rows, cols } = dimensions(size);
  const symbols = shuffled(Array.from({ length: size }, (_, i) => i + 1));
  const rr = shuffled(Array.from({ length: size / rows }, (_, i) => i)).flatMap(
    (b) => shuffled(Array.from({ length: rows }, (_, i) => b * rows + i)),
  );
  const cc = shuffled(Array.from({ length: size / cols }, (_, i) => i)).flatMap(
    (b) => shuffled(Array.from({ length: cols }, (_, i) => b * cols + i)),
  );
  const solution = rr.flatMap((r) =>
    cc.map(
      (c) => symbols[(cols * (r % rows) + Math.floor(r / rows) + c) % size],
    ),
  );
  const givens = [...solution];
  let removed = 0;
  const target = Math.floor(size * size * (tier === "Relaxed" ? 0.35 : 0.55));
  for (const index of shuffled(
    Array.from({ length: size * size }, (_, i) => i),
  )) {
    const keep = givens[index];
    givens[index] = 0;
    if (solutionCount(givens, size) !== 1 || !solvedBySingles(givens, size))
      givens[index] = keep;
    else removed++;
    if (removed >= target) break;
  }
  return {
    size,
    tier,
    seed,
    givens,
    solution,
    cells: [...givens],
    notes: givens.map(() => []),
    history: [],
  };
}
export function isComplete(data: SudokuData) {
  return data.cells.every((n, i) => n === data.solution[i]);
}
export function validSudoku(value: unknown): value is SudokuData {
  const d = value as SudokuData;
  return (
    !!d &&
    [4, 6, 9].includes(d.size) &&
    Array.isArray(d.cells) &&
    d.cells.length === d.size * d.size &&
    Array.isArray(d.givens) &&
    Array.isArray(d.solution) &&
    Array.isArray(d.notes) &&
    Array.isArray(d.history)
  );
}
