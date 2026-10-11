import {
  hiddenSinglesBoards,
  HIDDEN_SINGLES_VERSION,
  challengingBoards,
  CHALLENGING_VERSION,
} from "../content/sudoku.ts";
export type Size = 4 | 6 | 9;
export type SudokuTier =
  "Relaxed" | "Classic" | "Hidden singles" | "Challenging";
export interface SudokuData {
  largeCells?: boolean;
  size: Size;
  tier: SudokuTier;
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
  if (!consistentGrid(input, size)) return 0;
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
export function consistentGrid(cells: number[], size: Size): boolean {
  if (
    cells.length !== size * size ||
    cells.some((n) => !Number.isInteger(n) || n < 0 || n > size)
  )
    return false;
  return units(size).every((unit) => {
    const filled = unit.indices.map((i) => cells[i]).filter(Boolean);
    return new Set(filled).size === filled.length;
  });
}
export interface SudokuStep {
  index: number;
  value: number;
  technique: "single-candidate" | "hidden-single" | "candidate-chain";
  unit?: { kind: "row" | "column" | "box"; number: number };
  deductions?: SudokuDeduction[];
}
export interface SudokuDeduction {
  technique: "locked-candidates" | "naked-pair";
  unit: { kind: "row" | "column" | "box"; number: number };
  targetUnit?: { kind: "row" | "column" | "box"; number: number };
  source: number[];
  values: number[];
  removed: { index: number; values: number[] }[];
}
function units(size: Size) {
  const { rows, cols } = dimensions(size);
  const result: {
    kind: "row" | "column" | "box";
    number: number;
    indices: number[];
  }[] = [];
  for (let n = 0; n < size; n++) {
    result.push({
      kind: "row",
      number: n + 1,
      indices: Array.from({ length: size }, (_, k) => n * size + k),
    });
    result.push({
      kind: "column",
      number: n + 1,
      indices: Array.from({ length: size }, (_, k) => k * size + n),
    });
    const br = Math.floor(n / (size / cols)) * rows,
      bc = (n % (size / cols)) * cols;
    result.push({
      kind: "box",
      number: n + 1,
      indices: Array.from(
        { length: size },
        (_, k) => (br + Math.floor(k / cols)) * size + bc + (k % cols),
      ),
    });
  }
  return result;
}
export function findLogicalStep(
  cells: number[],
  size: Size,
  hidden = true,
): SudokuStep | undefined {
  if (!consistentGrid(cells, size)) return;
  const options = cells.map((_, i) => candidates(cells, i, size));
  if (options.some((c, i) => !cells[i] && !c.length)) return;
  const index = options.findIndex((c) => c.length === 1);
  if (index >= 0)
    return { index, value: options[index][0], technique: "single-candidate" };
  if (!hidden) return;
  for (const unit of units(size)) {
    for (let value = 1; value <= size; value++) {
      const places = unit.indices.filter((i) => options[i].includes(value));
      if (places.length === 1)
        return {
          index: places[0],
          value,
          technique: "hidden-single",
          unit: { kind: unit.kind, number: unit.number },
        };
    }
  }
}
export function solveLogically(input: number[], size: Size, hidden = true) {
  const cells = [...input],
    steps: SudokuStep[] = [];
  while (steps.length < size * size) {
    const step = findLogicalStep(cells, size, hidden);
    if (!step) break;
    cells[step.index] = step.value;
    steps.push(step);
  }
  return {
    cells,
    steps,
    solved: consistentGrid(cells, size) && cells.every(Boolean),
  };
}
// Rebuild candidate deductions from the actual entries for every request.
// Pencil notes are player-owned and never treated as a proof premise.
export function findAdvancedStep(
  cells: number[],
  size: Size,
  pairs = true,
): SudokuStep | undefined {
  const direct = findLogicalStep(cells, size);
  if (direct) return direct;
  if (!consistentGrid(cells, size)) return;
  const groups = units(size);
  const options = cells.map((_, i) => candidates(cells, i, size));
  const deductions: SudokuDeduction[] = [];
  const unitLabel = (u: (typeof groups)[number]) => ({
    kind: u.kind,
    number: u.number,
  });
  while (true) {
    if (options.some((c, i) => !cells[i] && !c.length)) return;
    let forced: SudokuStep | undefined;
    const single = options.findIndex((c) => c.length === 1);
    if (single >= 0)
      forced = {
        index: single,
        value: options[single][0],
        technique: "candidate-chain",
      };
    if (!forced)
      for (const unit of groups) {
        for (let value = 1; value <= size; value++) {
          const places = unit.indices.filter((i) => options[i].includes(value));
          if (places.length === 1) {
            forced = {
              index: places[0],
              value,
              technique: "candidate-chain",
              unit: unitLabel(unit),
            };
            break;
          }
        }
        if (forced) break;
      }
    if (forced) return { ...forced, deductions };
    let deduction: SudokuDeduction | undefined;
    // Pointing (box -> line) and claiming (line -> box) use the same
    // containment proof: every place for a value in one unit lies in another.
    for (const unit of groups) {
      for (let value = 1; value <= size; value++) {
        const source = unit.indices.filter((i) => options[i].includes(value));
        if (source.length < 2) continue;
        for (const target of groups) {
          if ((unit.kind === "box") === (target.kind === "box")) continue;
          if (!source.every((i) => target.indices.includes(i))) continue;
          const removed = target.indices
            .filter(
              (i) => !unit.indices.includes(i) && options[i].includes(value),
            )
            .map((index) => ({ index, values: [value] }));
          if (removed.length) {
            deduction = {
              technique: "locked-candidates",
              unit: unitLabel(unit),
              targetUnit: unitLabel(target),
              source,
              values: [value],
              removed,
            };
            break;
          }
        }
        if (deduction) break;
      }
      if (deduction) break;
    }
    if (!deduction && pairs)
      for (const unit of groups) {
        for (const index of unit.indices) {
          const values = options[index];
          if (values.length !== 2) continue;
          const source = unit.indices.filter(
            (i) =>
              options[i].length === 2 &&
              options[i].every((n) => values.includes(n)),
          );
          if (source.length !== 2) continue;
          const removed = unit.indices
            .filter((i) => !source.includes(i))
            .map((index) => ({
              index,
              values: options[index].filter((n) => values.includes(n)),
            }))
            .filter((r) => r.values.length);
          if (removed.length) {
            deduction = {
              technique: "naked-pair",
              unit: unitLabel(unit),
              source,
              values: [...values],
              removed,
            };
            break;
          }
        }
        if (deduction) break;
      }
    if (!deduction) return;
    for (const removal of deduction.removed)
      options[removal.index] = options[removal.index].filter(
        (n) => !removal.values.includes(n),
      );
    deductions.push(deduction);
    // Every deduction removes at least one of at most size^3 candidates.
  }
}
export function solveAdvanced(input: number[], size: Size, pairs = true) {
  const cells = [...input],
    steps: SudokuStep[] = [];
  while (steps.length < size * size) {
    const step = findAdvancedStep(cells, size, pairs);
    if (!step) break;
    cells[step.index] = step.value;
    steps.push(step);
  }
  return {
    cells,
    steps,
    solved: consistentGrid(cells, size) && cells.every(Boolean),
  };
}
export function solvedBySingles(input: number[], size: Size): boolean {
  if (!consistentGrid(input, size)) return false;
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
  tier: SudokuTier = "Classic",
): SudokuData {
  if (tier === "Hidden singles" || tier === "Challenging") {
    if (size !== 9) throw Error(`${tier} is a 9 by 9 challenge.`);
    return generateAuthored(seed, tier);
  }
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
function generateAuthored(
  seed: number,
  tier: "Hidden singles" | "Challenging",
): SudokuData {
  let state = seed >>> 0;
  const shuffle = (input: number[]) => {
    const copy = [...input];
    for (let i = copy.length - 1; i > 0; i--) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      const j = Math.floor((state / 4294967296) * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const boards =
    tier === "Challenging" ? challengingBoards : hiddenSinglesBoards;
  const board = boards[(seed >>> 0) % boards.length];
  const symbols = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const rows = shuffle([0, 1, 2]).flatMap((b) =>
    shuffle([b * 3, b * 3 + 1, b * 3 + 2]),
  );
  const cols = shuffle([0, 1, 2]).flatMap((b) =>
    shuffle([b * 3, b * 3 + 1, b * 3 + 2]),
  );
  const transform = (input: readonly number[]) =>
    rows.flatMap((r) =>
      cols.map((c) => {
        const n = input[r * 9 + c];
        return n ? symbols[n - 1] : 0;
      }),
    );
  const givens = transform(board.givens);
  return {
    size: 9,
    tier,
    seed,
    givens,
    solution: transform(board.solution),
    cells: [...givens],
    notes: givens.map(() => []),
    history: [],
  };
}
export function sudokuPuzzle(data: SudokuData): string {
  return data.tier === "Challenging"
    ? `${CHALLENGING_VERSION}-${data.seed}`
    : data.tier === "Hidden singles"
      ? `${HIDDEN_SINGLES_VERSION}-${data.seed}`
      : `sudoku-${data.size}-${data.seed}`;
}
export function sudokuContentVersion(data: SudokuData): string {
  return data.tier === "Challenging"
    ? CHALLENGING_VERSION
    : data.tier === "Hidden singles"
      ? HIDDEN_SINGLES_VERSION
      : "starter-1";
}
export function explainStep(step: SudokuStep, size: Size): string {
  const square = `Row ${Math.floor(step.index / size) + 1}, column ${(step.index % size) + 1}`;
  if (step.technique === "candidate-chain") {
    const at = (index: number) =>
      `r${Math.floor(index / size) + 1}c${(index % size) + 1}`;
    const reasons = step.deductions!.map((d) =>
      d.technique === "naked-pair"
        ? `Naked pair: ${d.source.map(at).join(" and ")} hold only ${d.values.join(" and ")} in ${d.unit.kind} ${d.unit.number}; remove those candidates from ${d.removed.map((r) => at(r.index)).join(", ")}.`
        : `Locked candidates: ${d.values[0]} in ${d.unit.kind} ${d.unit.number} is confined to ${d.targetUnit!.kind} ${d.targetUnit!.number}; remove it from ${d.removed.map((r) => at(r.index)).join(", ")}.`,
    );
    return `${reasons.join(" ")} ${square}: ${step.value} is now ${step.unit ? `the only place for this number in ${step.unit.kind} ${step.unit.number}` : "the only remaining candidate"}.`;
  }
  return step.technique === "hidden-single"
    ? `${square}: ${step.value} has only one possible place in ${step.unit!.kind} ${step.unit!.number}. This is a hidden single.`
    : `${square}: ${step.value} is the only number allowed by its row, column and box.`;
}
export function removePeerNote(
  notes: number[][],
  index: number,
  value: number,
  size: Size,
) {
  const peers = new Set(
    units(size)
      .filter((u) => u.indices.includes(index))
      .flatMap((u) => u.indices),
  );
  return notes.map((entry, i) =>
    i === index
      ? []
      : peers.has(i)
        ? entry.filter((n) => n !== value)
        : [...entry],
  );
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
