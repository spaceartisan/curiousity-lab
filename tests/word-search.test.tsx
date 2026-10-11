import { beforeEach, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../src/App";
import { searchPacks, findWordPaths, wordPath } from "../src/content/words";
import { validateGame } from "../src/storage/validate-game";
import { emptyState } from "../src/storage/contracts";
import { clearState, saveState, loadState } from "../src/storage/local";
beforeEach(async () => {
  await clearState("play");
});
async function openSearch(history = false, data?: unknown) {
  const state = emptyState("play");
  state.preferences.welcomeDone = true;
  state.preferences.history = history;
  if (data)
    state.drafts.search = {
      id: "legacy-search",
      game: "search",
      puzzleId: "quiet-garden-v1",
      startedAt: "2026-10-10T00:00:00Z",
      activeMs: 0,
      hints: 0,
      undos: 0,
      mode: "explore",
      data,
    };
  await saveState(state);
  const view = render(<App appRole="play" />);
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: /^Word Search/ }),
  );
  return { user, view };
}
async function find(
  user: ReturnType<typeof userEvent.setup>,
  pack: number,
  word: string,
  reverse = false,
) {
  const path = findWordPaths(searchPacks[pack], word)[0];
  const ends = reverse ? [path.at(-1)!, path[0]] : [path[0], path.at(-1)!];
  for (const index of ends)
    await user.click(
      screen.getByRole("button", {
        name: new RegExp(
          `^Row ${Math.floor(index / 8) + 1}, column ${(index % 8) + 1}:`,
        ),
      }),
    );
}
for (const pack of searchPacks)
  it(`${pack.id}: each curated word has exactly one bounded straight path`, () => {
    expect(pack.rows).toHaveLength(pack.size);
    expect(
      pack.rows.every((r) => r.length === pack.size && /^[A-Z]+$/.test(r)),
    ).toBe(true);
    expect(new Set(pack.words).size).toBe(8);
    for (const word of pack.words)
      expect(findWordPaths(pack, word)).toHaveLength(1);
  });
it("rejects impossible paths and mismatched or duplicated save words; accepts original schema", () => {
  expect(wordPath(-1, 7, 8)).toEqual([]);
  expect(wordPath(0, 64, 8)).toEqual([]);
  expect(wordPath(0, 1.5, 8)).toEqual([]);
  expect(validateGame("search", { found: ["GARDEN"] })).toBe(true);
  for (const data of [
    { pack: 99, found: [] },
    { pack: -1, found: [] },
    { pack: 1, found: ["GARDEN"] },
    { found: ["GARDEN", "GARDEN"] },
    { found: ["NOT-A-WORD"] },
  ])
    expect(validateGame("search", data)).toBe(false);
});
it("resumes an original garden save and highlights its found letters after reload", async () => {
  const { user, view } = await openSearch(false, { found: ["GARDEN"] });
  expect(
    screen.getByRole("heading", { name: "Quiet garden" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Row 1, column 1: G, found" }),
  ).toHaveClass("found-letter");
  await find(user, 0, "CHORUS", true);
  await waitFor(async () =>
    expect((await loadState("play")).drafts.search?.data).toEqual({
      found: ["GARDEN", "CHORUS"],
    }),
  );
  view.unmount();
  render(<App appRole="play" />);
  await user.click(
    await screen.findByRole("button", { name: /^Word Search/ }),
  );
  expect(
    screen.getByRole("button", { name: "Row 2, column 1: C, found" }),
  ).toHaveClass("found-letter");
  expect((await loadState("play")).sessions).toEqual([]);
});
it("completes once, replays the same board as a separate attempt, and cycles versioned boards", async () => {
  const { user } = await openSearch(true);
  for (const word of searchPacks[0].words) await find(user, 0, word);
  await user.click(screen.getByRole("button", { name: "Replay this puzzle" }));
  expect(
    screen.getByRole("heading", { name: "Quiet garden" }),
  ).toBeInTheDocument();
  expect(screen.getByText(/0 of 8 words found/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Another puzzle" }));
  expect(
    screen.getByRole("heading", { name: "Kitchen table" }),
  ).toBeInTheDocument();
  await find(user, 1, "SPOON", true);
  await user.click(screen.getByRole("button", { name: "Another puzzle" }));
  await user.click(screen.getByRole("button", { name: "Back to games" }));
  await waitFor(async () => {
    const saved = await loadState("play");
    expect(saved.sessions).toHaveLength(3);
    expect(
      saved.sessions.map((s) => [
        s.puzzleId,
        s.outcome,
        s.attempt,
        s.contentVersion,
      ]),
    ).toEqual([
      ["quiet-garden-v1", "completed", 1, "starter-1"],
      ["quiet-garden-v1", "unfinished", 2, "starter-1"],
      ["kitchen-table-v1", "unfinished", 1, "word-search-2"],
    ]);
    expect(new Set(saved.sessions.map((s) => s.id)).size).toBe(3);
    expect((saved.drafts.search?.data as { pack: number }).pack).toBe(2);
  });
});
it("gives a real vertical hint, allows keyboard endpoints, and does not enroll repeated found words", async () => {
  const { user } = await openSearch();
  await user.click(screen.getByRole("button", { name: "Another puzzle" }));
  await find(user, 1, "BREAD");
  await user.click(screen.getByRole("button", { name: "Hint" }));
  const path = findWordPaths(searchPacks[1], "SPOON")[0];
  const start = screen.getByRole("button", {
    name: new RegExp(
      `^Row ${Math.floor(path[0] / 8) + 1}, column ${(path[0] % 8) + 1}:`,
    ),
  });
  expect(start).toHaveClass("hint-letter");
  start.focus();
  await user.keyboard("{Enter}");
  for (let i = 1; i < path.length; i++) await user.keyboard("{ArrowDown}");
  await user.keyboard("{Enter}");
  expect(screen.getByText(/2 of 8 words found/)).toBeInTheDocument();
  await find(user, 1, "SPOON");
  expect(screen.getByRole("status").textContent).toContain("already found");
  start.focus();
  await user.keyboard("{Enter}{Escape}");
  expect(start).toHaveAttribute("aria-pressed", "false");
  await user.click(screen.getByRole("button", { name: "Back to games" }));
  await waitFor(async () =>
    expect((await loadState("play")).drafts.search?.hints).toBe(0),
  );
});
it("undo survives legacy reload, preserves earlier discoveries and does not collect history when off", async () => {
  const { user, view } = await openSearch(false, {
    found: ["GARDEN", "CHORUS"],
  });
  await user.click(screen.getByRole("button", { name: "Hint" }));
  await user.click(screen.getByRole("button", { name: /^Row 4, column 1:/ }));
  await user.click(screen.getByRole("button", { name: "Undo last word" }));
  expect(screen.getByRole("status")).toHaveTextContent("Returned chorus");
  expect(
    document.querySelectorAll(".hint-letter, .letter-grid .selected"),
  ).toHaveLength(0);
  expect(
    screen.getByRole("button", { name: "Row 1, column 1: G, found" }),
  ).toHaveClass("found-letter");
  expect(
    screen.getByRole("button", { name: "Row 2, column 1: C" }),
  ).not.toHaveClass("found-letter");
  await waitFor(async () => {
    const saved = await loadState("play");
    expect(saved.drafts.search?.data).toEqual({ found: ["GARDEN"] });
    expect(saved.drafts.search?.undos).toBe(0);
    expect(saved.drafts.search?.id).toBe("legacy-search");
    expect(saved.sessions).toEqual([]);
  });
  view.unmount();
  render(<App appRole="play" />);
  await user.click(
    await screen.findByRole("button", { name: /^Word Search/ }),
  );
  expect(screen.getByText(/1 of 8 words found/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Undo last word" }));
  expect(screen.getByRole("button", { name: "Undo last word" })).toBeDisabled();
  await find(user, 0, "CHORUS");
  expect(screen.getByText(/1 of 8 words found/)).toBeInTheDocument();
});
it("undo preserves a crossing word's shared highlight and records one undo only with history", async () => {
  const { user } = await openSearch(true);
  await user.click(screen.getByRole("button", { name: "Another puzzle" }));
  await find(user, 1, "SPOON");
  await find(user, 1, "BOWL");
  await user.click(screen.getByRole("button", { name: "Undo last word" }));
  expect(
    screen.getByRole("button", { name: "Row 6, column 2: O, found" }),
  ).toHaveClass("found-letter");
  const bowlOnly = findWordPaths(searchPacks[1], "BOWL")[0].filter(
    (i) => !findWordPaths(searchPacks[1], "SPOON")[0].includes(i),
  );
  for (const index of bowlOnly)
    expect(
      screen.getByRole("button", {
        name: new RegExp(
          `^Row ${Math.floor(index / 8) + 1}, column ${(index % 8) + 1}:`,
        ),
      }),
    ).not.toHaveClass("found-letter");
  await waitFor(async () => {
    const saved = await loadState("play");
    expect(saved.drafts.search?.undos).toBe(1);
    expect(saved.drafts.search?.data).toEqual({ pack: 1, found: ["SPOON"] });
    expect(
      saved.sessions.filter((s) => s.puzzleId === "kitchen-table-v1"),
    ).toEqual([]);
  });
});
it("completion disables undo and cannot rewrite filed history; replay resets progress and undo counts", async () => {
  const { user } = await openSearch(true);
  expect(screen.getByRole("button", { name: "Undo last word" })).toBeDisabled();
  await find(user, 0, "GARDEN");
  await user.click(screen.getByRole("button", { name: "Undo last word" }));
  for (const word of searchPacks[0].words) await find(user, 0, word);
  await waitFor(async () =>
    expect((await loadState("play")).sessions).toHaveLength(1),
  );
  const filed = (await loadState("play")).sessions[0];
  expect(filed.undos).toBe(1);
  const undo = screen.getByRole("button", { name: "Undo last word" });
  expect(undo).toBeDisabled();
  await user.click(undo);
  expect((await loadState("play")).sessions[0]).toEqual(filed);
  await user.click(screen.getByRole("button", { name: "Replay this puzzle" }));
  expect(screen.getByText(/0 of 8 words found/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Undo last word" })).toBeDisabled();
  await waitFor(async () => {
    const saved = await loadState("play");
    expect(saved.sessions).toEqual([filed]);
    expect(saved.drafts.search?.id).not.toBe(filed.id);
    expect(saved.drafts.search?.undos).toBe(0);
    expect(saved.drafts.search?.puzzleId).toBe(filed.puzzleId);
  });
});
