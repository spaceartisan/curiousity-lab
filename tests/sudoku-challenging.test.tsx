import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../src/App";
import { challengingBoards } from "../src/content/sudoku";
import {
  candidates,
  generateSudoku,
  findAdvancedStep,
  solveAdvanced,
  solveLogically,
  solutionCount,
  explainStep,
  sudokuPuzzle,
  sudokuContentVersion,
  type SudokuData,
  type SudokuStep,
} from "../src/games/sudoku-engine";
import { validateGame } from "../src/storage/validate-game";
import { emptyState } from "../src/storage/contracts";
import { clearState, loadState, saveState } from "../src/storage/local";
beforeEach(async () => {
  await clearState("play");
});
// Separate trace verifier: rebuild units from coordinates and check each premise
// against the current candidate sets, plus the independently unique solution.
function indices(unit: { kind: "row" | "column" | "box"; number: number }) {
  const n = unit.number - 1;
  return Array.from({ length: 81 }, (_, i) => i).filter((i) =>
    unit.kind === "row"
      ? Math.floor(i / 9) === n
      : unit.kind === "column"
        ? i % 9 === n
        : Math.floor(i / 27) * 3 + Math.floor((i % 9) / 3) === n,
  );
}
function verifyStep(
  cells: number[],
  solution: readonly number[],
  step: SudokuStep,
) {
  const options = cells.map((_, i) => candidates(cells, i, 9));
  for (const d of step.deductions || []) {
    const unit = indices(d.unit);
    expect(d.source.every((i) => unit.includes(i))).toBe(true);
    expect(new Set(d.source).size).toBe(d.source.length);
    if (d.technique === "naked-pair") {
      expect(d.source).toHaveLength(2);
      expect(d.values).toHaveLength(2);
      for (const i of d.source) expect(options[i]).toEqual(d.values);
      expect(
        unit
          .filter(
            (i) =>
              options[i].length === 2 &&
              options[i].every((n) => d.values.includes(n)),
          )
          .sort((a, b) => a - b),
      ).toEqual([...d.source].sort((a, b) => a - b));
    } else {
      const target = indices(d.targetUnit!);
      expect(d.source.length).toBeGreaterThanOrEqual(2);
      expect(d.values).toHaveLength(1);
      expect(unit.filter((i) => options[i].includes(d.values[0]))).toEqual(
        d.source,
      );
      expect(d.source.every((i) => target.includes(i))).toBe(true);
    }
    expect(d.removed.length).toBeGreaterThan(0);
    for (const r of d.removed) {
      expect(d.source).not.toContain(r.index);
      expect(indices(d.targetUnit || d.unit)).toContain(r.index);
      if (d.targetUnit) expect(unit).not.toContain(r.index);
      expect(cells[r.index]).toBe(0);
      for (const n of r.values) {
        expect(options[r.index]).toContain(n);
        expect(d.values).toContain(n);
        expect(solution[r.index]).not.toBe(n);
      }
      options[r.index] = options[r.index].filter((n) => !r.values.includes(n));
      expect(options[r.index].length).toBeGreaterThan(0);
    }
  }
  expect(cells[step.index]).toBe(0);
  expect(step.value).toBe(solution[step.index]);
  if (step.unit)
    expect(
      indices(step.unit).filter((i) => options[i].includes(step.value)),
    ).toEqual([step.index]);
  else expect(options[step.index]).toEqual([step.value]);
}
it("three frozen original boards need pairs, are unique, and every deduction has valid premises", () => {
  expect(challengingBoards).toHaveLength(3);
  expect(challengingBoards.map((b) => b.generationSeed)).toEqual([5, 13, 71]);
  for (const board of challengingBoards) {
    expect(solutionCount([...board.givens], 9)).toBe(1);
    expect(solveLogically([...board.givens], 9).solved).toBe(false);
    expect(solveAdvanced([...board.givens], 9, false).solved).toBe(false);
    const result = solveAdvanced([...board.givens], 9);
    expect(result.solved).toBe(true);
    expect(result.cells).toEqual(board.solution);
    expect(
      result.steps.some((s) =>
        s.deductions?.some((d) => d.technique === "naked-pair"),
      ),
    ).toBe(true);
    const cells = [...board.givens] as number[];
    for (const step of result.steps) {
      verifyStep(cells, board.solution, step);
      cells[step.index] = step.value;
    }
  }
});
it("38 deterministic seed variations preserve uniqueness, pair necessity and canonical imports", () => {
  for (const seed of [
    ...Array.from({ length: 36 }, (_, i) => i),
    123456789,
    0xffffffff,
  ]) {
    const d = generateSudoku(9, seed, "Challenging");
    expect(d).toEqual(generateSudoku(9, seed, "Challenging"));
    expect(solutionCount(d.givens, 9)).toBe(1);
    expect(solveAdvanced(d.givens, 9, false).solved).toBe(false);
    const result = solveAdvanced(d.givens, 9);
    expect(result.solved).toBe(true);
    expect(result.cells).toEqual(d.solution);
    expect(sudokuPuzzle(d)).toBe(`sudoku-challenging-1-${seed}`);
    expect(sudokuContentVersion(d)).toBe("sudoku-challenging-1");
    expect(validateGame("sudoku", d)).toBe(true);
  }
});
it("advanced solving never guesses on a blank grid, rejects inconsistent entries and unsupported imports", () => {
  expect(findAdvancedStep(Array(81).fill(0), 9)).toBeUndefined();
  const d = generateSudoku(9, 0, "Challenging");
  const bad = [...d.cells];
  bad[0] = 9;
  bad[1] = 9;
  expect(findAdvancedStep(bad, 9)).toBeUndefined();
  expect(() => generateSudoku(6, 0, "Challenging")).toThrow();
  expect(validateGame("sudoku", { ...d, size: 6 })).toBe(false);
  const changed = structuredClone(d);
  changed.givens[0] = d.givens[0] ? 0 : d.solution[0];
  expect(validateGame("sudoku", changed)).toBe(false);
});
async function open(history = false) {
  const d = generateSudoku(9, 0, "Challenging");
  d.cells = solveLogically(d.givens, 9).cells;
  const state = emptyState("play");
  state.preferences.welcomeDone = true;
  state.preferences.history = history;
  state.drafts.sudoku = {
    id: "challenge-draft",
    game: "sudoku",
    puzzleId: sudokuPuzzle(d),
    startedAt: "2026-10-10T00:00:00Z",
    activeMs: 0,
    hints: 0,
    undos: 0,
    mode: "9x9:Challenging",
    data: d,
  };
  await saveState(state);
  const view = render(<App appRole="play" />);
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: /^Numbers Sudoku/ }),
  );
  return { d, user, view };
}
async function saved() {
  await waitFor(() =>
    expect(screen.getByText("Saved on this device")).toBeInTheDocument(),
  );
  return loadState("play");
}
it("optional elimination explanation changes no cells or notes; hint and undo retain proof and restore", async () => {
  const { d, user } = await open(true);
  const step = findAdvancedStep(d.cells, 9)!;
  expect(step.technique).toBe("candidate-chain");
  expect(
    screen.getByText("Controls & help").closest("details"),
  ).not.toHaveAttribute("open");
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
  const original = structuredClone(d);
  await user.click(screen.getByRole("button", { name: "Show a step" }));
  expect(screen.getByRole("status")).toHaveTextContent(explainStep(step, 9));
  const shown = (await saved()).drafts.sudoku!;
  expect(shown.data).toEqual(original);
  expect(shown.hints).toBe(1);
  await user.click(screen.getByRole("button", { name: "Hint" }));
  expect(document.getElementById(`cell-${step.index}`)).toHaveTextContent(
    String(step.value),
  );
  expect(screen.getByRole("status")).toHaveTextContent(
    "The square is filled for you.",
  );
  await user.click(screen.getByRole("button", { name: "Undo" }));
  const undone = (await saved()).drafts.sudoku!;
  expect((undone.data as SudokuData).cells).toEqual(d.cells);
  expect((undone.data as SudokuData).notes).toEqual(d.notes);
  expect(undone.hints).toBe(2);
  expect(undone.undos).toBe(1);
  expect(undone.id).toBe("challenge-draft");
});
it("history-off advanced progress reloads, replay keeps the challenge, and grid changes remain deliberate", async () => {
  const { d, user, view } = await open();
  await user.click(screen.getByRole("button", { name: "Hint" }));
  const before = (await saved()).drafts.sudoku!;
  expect(before.hints).toBe(0);
  view.unmount();
  render(<App appRole="play" />);
  await user.click(
    await screen.findByRole("button", { name: /^Numbers Sudoku/ }),
  );
  expect(screen.getByRole("combobox", { name: "Challenge" })).toHaveValue(
    "Challenging",
  );
  expect(((await saved()).drafts.sudoku!.data as SudokuData).cells).toEqual(
    (before.data as SudokuData).cells,
  );
  vi.mocked(window.confirm).mockReturnValueOnce(false);
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Challenge" }),
    "Classic",
  );
  expect(screen.getByRole("combobox", { name: "Challenge" })).toHaveValue(
    "Challenging",
  );
  await user.click(screen.getByRole("button", { name: "Replay this puzzle" }));
  const replay = (await saved()).drafts.sudoku!;
  expect(replay.id).not.toBe(before.id);
  expect(replay.puzzleId).toBe(sudokuPuzzle(d));
  expect((replay.data as SudokuData).cells).toEqual(d.givens);
  await user.selectOptions(screen.getByRole("combobox", { name: "Grid" }), "6");
  expect(screen.getByRole("combobox", { name: "Challenge" })).toHaveValue(
    "Classic",
  );
  expect(screen.getByRole("option", { name: "Challenging" })).toBeDisabled();
  expect((await saved()).sessions).toEqual([]);
});
it("an unassisted challenge files its own content and mode once; completed controls and replay preserve it", async () => {
  const d = generateSudoku(9, 1, "Challenging");
  d.cells = [...d.solution];
  const last = d.givens.findIndex((n) => !n);
  d.cells[last] = 0;
  const state = emptyState("play");
  state.preferences.welcomeDone = true;
  state.preferences.history = true;
  state.drafts.sudoku = {
    id: "finishing-challenge",
    game: "sudoku",
    puzzleId: sudokuPuzzle(d),
    startedAt: "2026-10-10T00:00:00Z",
    activeMs: 0,
    hints: 0,
    undos: 0,
    mode: "9x9:Challenging",
    data: d,
  };
  await saveState(state);
  render(<App appRole="play" />);
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: /^Numbers Sudoku/ }),
  );
  const cell = document.getElementById(`cell-${last}`)!;
  await user.click(cell);
  await user.keyboard(String(d.solution[last]));
  expect(screen.getByRole("status")).toHaveTextContent("Puzzle complete.");
  expect(screen.getByRole("button", { name: "Hint" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Undo" })).toBeDisabled();
  const filed = (await saved()).sessions[0];
  expect(filed).toMatchObject({
    id: "finishing-challenge",
    puzzleId: sudokuPuzzle(d),
    mode: "9x9:Challenging",
    contentVersion: "sudoku-challenging-1",
    hints: 0,
    undos: 0,
    outcome: "completed",
    attempt: 1,
  });
  await user.click(screen.getByRole("button", { name: "Replay this puzzle" }));
  const replay = await saved();
  expect(replay.sessions).toEqual([filed]);
  expect(replay.drafts.sudoku?.id).not.toBe(filed.id);
  expect(replay.drafts.sudoku?.mode).toBe(filed.mode);
  expect((replay.drafts.sudoku?.data as SudokuData).givens).toEqual(d.givens);
});
