import { beforeEach, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../src/App";
import { hiddenSinglesBoards } from "../src/content/sudoku";
import {
  generateSudoku,
  solutionCount,
  solvedBySingles,
  solveLogically,
  findLogicalStep,
  candidates,
  explainStep,
  removePeerNote,
  sudokuPuzzle,
  type Size,
  type SudokuData,
} from "../src/games/sudoku-engine";
import { validateGame } from "../src/storage/validate-game";
import { emptyState, validateState } from "../src/storage/contracts";
import { clearState, saveState, loadState } from "../src/storage/local";
import {
  observePresentation,
  validPresentation,
  presentationKey,
  withoutRecordedHistory,
} from "../src/storage/presentation";
beforeEach(async () => {
  await clearState("play");
});
async function open(
  data = generateSudoku(9, 0, "Hidden singles"),
  history = false,
) {
  const state = emptyState("play");
  state.preferences.welcomeDone = true;
  state.preferences.history = history;
  state.drafts.sudoku = {
    id: "saved-sudoku",
    game: "sudoku",
    puzzleId: sudokuPuzzle(data),
    startedAt: "2026-10-10T00:00:00Z",
    activeMs: 0,
    hints: 0,
    undos: 0,
    mode: `${data.size}x${data.size}:${data.tier}`,
    data,
  };
  await saveState(state);
  const view = render(<App appRole="play" />);
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: /^Numbers Sudoku/ }),
  );
  return { user, view };
}
async function saved() {
  await waitFor(() =>
    expect(screen.getByText("Saved on this device")).toBeInTheDocument(),
  );
  return loadState("play");
}
it("all six legacy generator forms retain their exact seed-23 serialization", () => {
  const expected = [
    "9876f334cdcef8bf36d576ceabc1c87024a2730112c6be0e5190d4608f1862ea",
    "6fefe3cb8d63b34212e7a00e069ca19397eba013fc111e2cfe0d7d5dd1c6cb35",
    "6fb1dac364e7304a6b2a2d00dde356e6d4e184e1880b40ad97e3d8f9f2d26320",
    "39972364b7e60e30b8d97327b14a0aecca87febb945516f67a0ae533a68433ba",
    "3b4dff04d945971638c96ef83367295630ab29624792bf57ae6e6c3d76fe47fc",
    "f1812ef41b5ab0e6c611a5471460c1321f1426137a3e16674b9de82969687d08",
  ];
  let i = 0;
  for (const size of [4, 6, 9] as Size[])
    for (const tier of ["Relaxed", "Classic"] as const) {
      const d = generateSudoku(size, 23, tier);
      expect(createHash("sha256").update(JSON.stringify(d)).digest("hex")).toBe(
        expected[i++],
      );
      expect(sudokuPuzzle(d)).toBe(`sudoku-${size}-23`);
    }
});
it("three original hidden-single boards and 38 seed variations are unique and logically calibrated", () => {
  expect(hiddenSinglesBoards).toHaveLength(3);
  for (const board of hiddenSinglesBoards) {
    const proof = solveLogically([...board.givens], 9);
    expect(proof.solved).toBe(true);
    expect(proof.cells).toEqual(board.solution);
    expect(proof.steps.some((s) => s.technique === "hidden-single")).toBe(true);
    expect(solvedBySingles([...board.givens], 9)).toBe(false);
    expect(solutionCount([...board.givens], 9)).toBe(1);
  }
  for (const seed of [
    ...Array.from({ length: 36 }, (_, i) => i),
    0x7fffffff,
    0xffffffff,
  ]) {
    const d = generateSudoku(9, seed, "Hidden singles");
    expect(d).toEqual(generateSudoku(9, seed, "Hidden singles"));
    expect(solutionCount(d.givens, 9)).toBe(1);
    expect(solvedBySingles(d.givens, 9)).toBe(false);
    expect(solveLogically(d.givens, 9).cells).toEqual(d.solution);
    expect(validateGame("sudoku", d)).toBe(true);
  }
});
it("every explained step is justified by current candidates and a real row, column or box", () => {
  const d = generateSudoku(9, 1, "Hidden singles");
  const cells = [...d.givens];
  const original = [...cells];
  for (const step of solveLogically(cells, 9).steps) {
    const options = candidates(cells, step.index, 9);
    expect(options).toContain(step.value);
    expect(step.value).toBe(d.solution[step.index]);
    if (step.technique === "single-candidate")
      expect(options).toEqual([step.value]);
    else {
      expect(options.length).toBeGreaterThan(1);
      const unit = step.unit!;
      const positions = Array.from({ length: 81 }, (_, i) => i).filter((i) =>
        unit.kind === "row"
          ? Math.floor(i / 9) + 1 === unit.number
          : unit.kind === "column"
            ? (i % 9) + 1 === unit.number
            : Math.floor(Math.floor(i / 9) / 3) * 3 +
                Math.floor((i % 9) / 3) +
                1 ===
              unit.number,
      );
      expect(
        positions.filter((i) => candidates(cells, i, 9).includes(step.value)),
      ).toEqual([step.index]);
      expect(explainStep(step, 9)).toContain(
        `only one possible place in ${unit.kind} ${unit.number}`,
      );
    }
    cells[step.index] = step.value;
  }
  expect(d.givens).toEqual(original);
  expect(cells).toEqual(d.solution);
});
it("contradictory, malformed and impossible grids never claim a solution or logical step", () => {
  const bad = generateSudoku(4, 23).solution;
  bad[1] = bad[0];
  expect(solutionCount(bad, 4)).toBe(0);
  expect(findLogicalStep(bad, 4)).toBeUndefined();
  expect(solveLogically(bad, 4).solved).toBe(false);
  expect(solutionCount([1], 4)).toBe(0);
  expect(solutionCount(Array(16).fill(9), 4)).toBe(0);
  expect(solutionCount(Array(16).fill(0), 4)).toBe(2);
});
it("restore requires a canonical hidden-single board and rejects unsupported small-grid tiers", () => {
  const d = generateSudoku(9, 3, "Hidden singles");
  expect(validateGame("sudoku", d)).toBe(true);
  expect(validateGame("sudoku", { ...d, size: 6 })).toBe(false);
  expect(validateGame("sudoku", { ...d, tier: "unknown" })).toBe(false);
  const changed = structuredClone(d);
  changed.givens[0] = changed.givens[0] ? 0 : changed.solution[0];
  expect(validateGame("sudoku", changed)).toBe(false);
  expect(() => generateSudoku(6, 1, "Hidden singles")).toThrow();
});
it("placing a number prunes only related pencil notes without mutating the source", () => {
  const notes = Array.from({ length: 81 }, () => [1, 2, 3]);
  const next = removePeerNote(notes, 0, 2, 9);
  expect(next[0]).toEqual([]);
  for (const i of [1, 9, 10, 20]) expect(next[i]).toEqual([1, 3]);
  expect(next[40]).toEqual([1, 2, 3]);
  expect(notes.every((n) => n.join() === "1,2,3")).toBe(true);
});
it("Show a step explains a genuine hidden single without filling or creating an undo move", async () => {
  const d = generateSudoku(9, 0, "Hidden singles");
  const naked = solveLogically(d.cells, 9, false);
  d.cells = naked.cells;
  const step = findLogicalStep(d.cells, 9)!;
  expect(step.technique).toBe("hidden-single");
  const { user } = await open(d, true);
  await user.click(screen.getByRole("button", { name: "Show a step" }));
  expect(screen.getByRole("status").textContent).toContain(
    explainStep(step, 9),
  );
  const s = await saved();
  const stored = s.drafts.sudoku!;
  expect((stored.data as SudokuData).cells).toEqual(d.cells);
  expect((stored.data as SudokuData).history).toHaveLength(0);
  expect(stored.hints).toBe(1);
  await user.click(screen.getByRole("button", { name: "Hint" }));
  const filled = await saved();
  expect((filled.drafts.sudoku!.data as SudokuData).cells[step.index]).toBe(
    step.value,
  );
  expect(screen.getByRole("status").textContent).toContain(
    "The square is filled for you",
  );
});
it("a wrong entry receives truthful correction and Undo restores it with its notes", async () => {
  const d = generateSudoku(9, 2, "Hidden singles");
  const index = d.cells.findIndex((n) => !n);
  d.cells[index] = (d.solution[index] % 9) + 1;
  const { user } = await open(d, true);
  await user.click(screen.getByRole("button", { name: "Show a step" }));
  expect(screen.getByRole("status").textContent).toContain(
    "Some entries need another look",
  );
  await user.click(screen.getByRole("button", { name: "Hint" }));
  expect(screen.getByRole("status").textContent).toContain(
    "this entry differed from the solution",
  );
  await user.click(screen.getByRole("button", { name: "Undo" }));
  expect(screen.getByRole("status").textContent).toBe("");
  expect((await saved()).drafts.sudoku!.undos).toBe(1);
  expect(
    ((await loadState("play")).drafts.sudoku!.data as SudokuData).cells,
  ).toEqual(d.cells);
});
it("pencil toggles, peer pruning and undo preserve notes and givens", async () => {
  const d = generateSudoku(4, 23, "Classic"),
    index = d.cells.findIndex((n) => !n);
  const peer = d.cells.findIndex(
    (n, i) => !n && i !== index && Math.floor(i / 4) === Math.floor(index / 4),
  );
  if (peer >= 0) d.notes[peer] = [d.solution[index]];
  const { user } = await open(d, true);
  await user.click(
    screen.getByRole("button", {
      name: new RegExp(
        `Row ${Math.floor(index / 4) + 1}, column ${(index % 4) + 1}, empty`,
      ),
    }),
  );
  await user.click(screen.getByRole("button", { name: "Pencil notes off" }));
  await user.click(
    screen.getByRole("button", {
      name: String(d.solution[index]),
    }),
  );
  await user.click(screen.getByRole("button", { name: "Pencil notes on" }));
  await user.click(
    screen.getByRole("button", {
      name: String(d.solution[index]),
    }),
  );
  const moved = (await saved()).drafts.sudoku!.data as SudokuData;
  expect(moved.cells[index]).toBe(d.solution[index]);
  if (peer >= 0) expect(moved.notes[peer]).toEqual([]);
  await user.click(screen.getByRole("button", { name: "Undo" }));
  const undone = (await saved()).drafts.sudoku!.data as SudokuData;
  expect(undone.cells).toEqual(d.cells);
  expect(undone.notes[index]).toEqual([d.solution[index]]);
  expect(undone.givens).toEqual(d.givens);
});
it("roving keyboard Home/End and row edges keep focus and selected-square controls aligned", async () => {
  await open(generateSudoku(4, 23));
  const first = document.getElementById("cell-0")!;
  first.focus();
  fireEvent.keyDown(first, { key: "ArrowLeft" });
  expect(first).toHaveFocus();
  fireEvent.keyDown(first, { key: "End" });
  expect(document.getElementById("cell-3")).toHaveFocus();
  fireEvent.keyDown(document.getElementById("cell-3")!, { key: "ArrowRight" });
  expect(document.getElementById("cell-3")).toHaveFocus();
  fireEvent.keyDown(document.getElementById("cell-3")!, {
    key: "End",
    ctrlKey: true,
  });
  expect(document.getElementById("cell-15")).toHaveFocus();
  expect(screen.getByLabelText("Row")).toHaveValue("3");
  expect(screen.getByLabelText("Column")).toHaveValue("3");
});
it("seven same-board completed replays retain distinct immutable attempts and new content identity", async () => {
  const d = generateSudoku(9, 3, "Hidden singles");
  d.cells = [...d.solution];
  const index = d.givens.findIndex((n) => !n);
  d.cells[index] = 0;
  const { user } = await open(d, true);
  for (let attempt = 0; attempt < 7; attempt++) {
    // Finish each repeat through the real hint path; no number entry or timer gate.
    const current = (await saved()).drafts.sudoku!.data as SudokuData;
    if (attempt) {
      // Fill all but the final square by keyboard, using the row/column controls.
      for (let i = 0; i < current.cells.length; i++)
        if (!current.cells[i] && i !== index) {
          fireEvent.click(document.getElementById(`cell-${i}`)!);
          fireEvent.keyDown(document.getElementById(`cell-${i}`)!, {
            key: String(current.solution[i]),
          });
        }
    }
    await user.click(screen.getByRole("button", { name: "Hint" }));
    expect(screen.getByText("Puzzle complete.")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Replay this puzzle" }),
    );
  }
  const s = await saved();
  expect(s.sessions).toHaveLength(7);
  expect(new Set(s.sessions.map((x) => x.id)).size).toBe(7);
  expect(s.sessions.map((x) => x.attempt)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  expect(
    s.sessions.every(
      (x) =>
        x.outcome === "completed" &&
        x.contentVersion === "sudoku-hidden-singles-1" &&
        x.puzzleId === sudokuPuzzle(d),
    ),
  ).toBe(true);
  expect((s.drafts.sudoku!.data as SudokuData).givens).toEqual(d.givens);
}, 20000);
it("legacy remount, canceled challenge changes and history-off assistance preserve old data", async () => {
  const d = generateSudoku(6, 23, "Relaxed");
  const { user, view } = await open(d);
  expect(screen.getByRole("option", { name: "Hidden singles" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Show a step" }));
  const s = await saved();
  expect(s.sessions).toHaveLength(0);
  expect(s.drafts.sudoku!.hints).toBe(0);
  expect((s.drafts.sudoku!.data as SudokuData).cells).toEqual(d.cells);
  const confirm = window.confirm;
  window.confirm = () => false;
  await user.selectOptions(screen.getByLabelText("Challenge"), "Classic");
  window.confirm = confirm;
  expect(screen.getByLabelText("Challenge")).toHaveValue("Relaxed");
  view.unmount();
  render(<App appRole="play" />);
  await user.click(
    await screen.findByRole("button", { name: /^Numbers Sudoku/ }),
  );
  expect(
    screen.getByRole("group", { name: "6 by 6 Sudoku" }),
  ).toBeInTheDocument();
  expect((await loadState("play")).drafts.sudoku!.puzzleId).toBe(
    sudokuPuzzle(d),
  );
  expect(() => validateState(s, "play")).not.toThrow();
});

it("large-square imports are optional for legacy puzzles and accept only a boolean", () => {
  const d = generateSudoku(9, 23);
  expect(d).not.toHaveProperty("largeCells");
  expect(validateGame("sudoku", { ...d, largeCells: true })).toBe(true);
  expect(validateGame("sudoku", { ...d, largeCells: false })).toBe(true);
  for (const largeCells of [null, 1, "true", [], {}])
    expect(validateGame("sudoku", { ...d, largeCells })).toBe(false);
});
it("square-size provenance separates legacy, partial and mixed settings without rewriting source", () => {
  const state = emptyState("play");
  state.preferences.history = true;
  const d = {
    id: "fictional-size",
    game: "sudoku" as const,
    puzzleId: "sudoku-9-23",
    mode: "9x9:Classic",
    startedAt: "2026-10-11T00:00:00Z",
    activeMs: 0,
    hints: 0,
    undos: 0,
    data: generateSudoku(9, 23),
  };
  const start = observePresentation(d, state.preferences, true),
    original = structuredClone(start);
  const changed = observePresentation(
    { ...start, data: { ...d.data, largeCells: true } },
    state.preferences,
  );
  expect(start).toEqual(original);
  expect(changed.presentation?.sudoku).toEqual({
    coverage: "from-start",
    cellSizes: ["compact", "large"],
  });
  const { sudoku: _sudoku, ...legacy } = start.presentation!;
  expect(validPresentation(legacy, "sudoku")).toBe(true);
  const partial = observePresentation(
    { ...d, presentation: legacy },
    state.preferences,
  );
  expect(partial.presentation?.sudoku?.coverage).toBe("partial");
  expect(
    new Set(
      [
        legacy,
        start.presentation,
        partial.presentation,
        changed.presentation,
      ].map(presentationKey),
    ).size,
  ).toBe(4);
  expect(presentationKey(changed.presentation)).toBe(
    presentationKey({
      ...changed.presentation!,
      sudoku: {
        ...changed.presentation!.sudoku!,
        cellSizes: ["large", "compact"],
      },
    }),
  );
  for (const sudoku of [
    null,
    [],
    { coverage: "guessed", cellSizes: ["large"] },
    { coverage: "partial", cellSizes: [] },
    { coverage: "partial", cellSizes: ["large", "large"] },
    { coverage: "partial", cellSizes: ["tiny"] },
    { coverage: "partial", cellSizes: ["large"], private: "text" },
  ])
    expect(
      validPresentation({ ...start.presentation!, sudoku }, "sudoku"),
    ).toBe(false);
  expect(validPresentation(start.presentation, "lab")).toBe(false);
});
it("large-square choice changes no puzzle move or hint and survives reload and same-board replay", async () => {
  const d = generateSudoku(9, 23),
    { user, view } = await open(d, true);
  const before = (await saved()).drafts.sudoku!;
  await user.click(
    screen.getByRole("checkbox", { name: "Larger Sudoku squares" }),
  );
  const changed = (await saved()).drafts.sudoku!;
  expect(changed.id).toBe(before.id);
  expect(changed.puzzleId).toBe(before.puzzleId);
  expect(changed.hints).toBe(0);
  expect(changed.undos).toBe(0);
  expect(changed.data).toEqual({ ...d, largeCells: true });
  expect(changed.presentation?.sudoku?.cellSizes).toEqual(["compact", "large"]);
  expect(
    screen.getByRole("region", { name: "Sudoku grid viewport" }),
  ).toHaveClass("large-cells");
  view.unmount();
  render(<App appRole="play" />);
  await user.click(
    await screen.findByRole("button", { name: /^Numbers Sudoku/ }),
  );
  expect(
    screen.getByRole("checkbox", { name: "Larger Sudoku squares" }),
  ).toBeChecked();
  await user.click(screen.getByRole("button", { name: "Replay this puzzle" }));
  const replayed = (await saved()).drafts.sudoku!;
  expect(replayed.id).not.toBe(before.id);
  expect(replayed.puzzleId).toBe(before.puzzleId);
  expect((replayed.data as SudokuData).largeCells).toBe(true);
  expect(replayed.presentation?.sudoku).toEqual({
    coverage: "from-start",
    cellSizes: ["large"],
  });
});
it("grid changes preserve large squares without silently choosing a difficulty", async () => {
  const { user } = await open({ ...generateSudoku(9, 23), largeCells: true });
  const confirmation = vi.spyOn(window, "confirm").mockReturnValue(true);
  await user.selectOptions(screen.getByRole("combobox", { name: "Grid" }), "6");
  const d = (await saved()).drafts.sudoku!.data as SudokuData;
  expect(d.size).toBe(6);
  expect(d.tier).toBe("Classic");
  expect(d.largeCells).toBe(true);
  confirmation.mockRestore();
});
it("view changes after completion preserve the filed session and do not create another attempt", async () => {
  const d = generateSudoku(4, 23),
    index = d.givens.findIndex((n) => !n);
  d.cells = [...d.solution];
  d.cells[index] = 0;
  const { user } = await open(d, true);
  await user.click(screen.getByRole("button", { name: "Hint" }));
  const finished = await saved();
  expect(finished.sessions).toHaveLength(1);
  await user.click(
    screen.getByRole("checkbox", { name: "Larger Sudoku squares" }),
  );
  const changed = await saved();
  expect(changed.sessions).toEqual(finished.sessions);
  expect(changed.drafts.sudoku!.id).toBe(finished.drafts.sudoku!.id);
  expect((changed.drafts.sudoku!.data as SudokuData).largeCells).toBe(true);
});
it("large squares work without history and history removal preserves the necessary view preference", async () => {
  const { user } = await open(generateSudoku(9, 23), false);
  await user.click(
    screen.getByRole("checkbox", { name: "Larger Sudoku squares" }),
  );
  const state = await saved();
  expect(state.sessions).toEqual([]);
  expect(state.drafts.sudoku?.presentation).toBeUndefined();
  expect(
    (withoutRecordedHistory(state).drafts.sudoku!.data as SudokuData)
      .largeCells,
  ).toBe(true);
  validateState(JSON.parse(JSON.stringify(state)), "play");
});
