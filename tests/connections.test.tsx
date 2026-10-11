import { beforeEach, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../src/App";
import { connections } from "../src/content/words";
import {
  matchingConnection,
  connectionWords,
  connectionsPuzzle,
  type ConnectionsData,
} from "../src/games/connections-engine";
import { validateGame } from "../src/storage/validate-game";
import { emptyState } from "../src/storage/contracts";
import { clearState, saveState, loadState } from "../src/storage/local";
beforeEach(async () => {
  await clearState("play");
});
async function open(history = false, pack = 0, data?: ConnectionsData) {
  const state = emptyState("play");
  state.preferences.welcomeDone = true;
  state.preferences.history = history;
  state.drafts.connections = {
    id: "old-connections",
    game: "connections",
    puzzleId: connectionsPuzzle(pack),
    startedAt: "2026-10-10T00:00:00Z",
    activeMs: 0,
    hints: 0,
    undos: 0,
    mode: "explore",
    data: data ?? { pack, solved: [], selected: [] },
  };
  await saveState(state);
  const view = render(<App appRole="play" />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: /Words/ }));
  return { user, view };
}
async function saved() {
  await waitFor(() =>
    expect(screen.getByText("Saved on this device")).toBeInTheDocument(),
  );
  return loadState("play");
}
it("twelve authored packs have unique IDs, four disjoint four-word groups and exact matching", () => {
  expect(connections).toHaveLength(12);
  expect(new Set(connections.map((p) => p.id)).size).toBe(12);
  connections.forEach((p, pack) => {
    expect(p.groups).toHaveLength(4);
    expect(new Set(p.groups.map((g) => g.title)).size).toBe(4);
    const all = p.groups.flatMap((g) => g.words);
    expect(all).toHaveLength(16);
    expect(new Set(all).size).toBe(16);
    for (const group of p.groups) {
      expect(group.words).toHaveLength(4);
      expect(group.words.every((w) => /^[A-Z]+$/.test(w))).toBe(true);
      const d = { pack, solved: [], selected: [...group.words].reverse() };
      expect(matchingConnection(d)?.title).toBe(group.title);
      expect(
        matchingConnection({
          ...d,
          selected: [
            group.words[0],
            group.words[0],
            group.words[1],
            group.words[2],
          ],
        }),
      ).toBeUndefined();
      expect(
        matchingConnection({ ...d, solved: [group.title] }),
      ).toBeUndefined();
    }
    expect(
      matchingConnection({
        pack,
        solved: [],
        selected: p.groups.map((g) => g.words[0]),
      }),
    ).toBeUndefined();
  });
});
it("legacy puzzle IDs/content remain unchanged while new packs have stable distinct IDs", () => {
  expect(connectionsPuzzle(0)).toBe("connections-0");
  expect(connectionsPuzzle(1)).toBe("connections-1");
  expect(connections[0].groups[0].words).toEqual([
    "TULIP",
    "DAHLIA",
    "IRIS",
    "ROSE",
  ]);
  expect(new Set(connections.map((_, i) => connectionsPuzzle(i))).size).toBe(
    12,
  );
});
it("save validation bounds all actual groups, remaining words, duplicates and display order", () => {
  const base = { pack: 0, solved: ["In the garden"], selected: ["PIANO"] };
  expect(validateGame("connections", base)).toBe(true);
  for (const p of [
    { pack: 12 },
    { pack: -1 },
    { solved: ["Anything"] },
    { solved: ["In the garden", "In the garden"] },
    { selected: ["PIANO", "PIANO"] },
    { selected: ["TULIP"] },
    { selected: ["UNKNOWN"] },
    { order: 32 },
    { order: NaN },
  ])
    expect(validateGame("connections", { ...base, ...p })).toBe(false);
  for (let pack = 0; pack < 8; pack++)
    expect(
      validateGame("connections", {
        pack,
        solved: [],
        selected: [],
        order: 31,
      }),
    ).toBe(true);
});
it("shuffle is deterministic, preserves remaining words/selection and changes their presentation", () => {
  const d = {
    pack: 3,
    solved: [connections[3].groups[0].title],
    selected: [connections[3].groups[1].words[0]],
    order: 1,
  };
  const a = connectionWords(d);
  expect(a).toEqual(connectionWords(d));
  expect(new Set(a).size).toBe(12);
  expect([...a].sort()).toEqual(connectionWords({ ...d, order: 0 }));
  expect(a).not.toEqual(connectionWords({ ...d, order: 0 }));
  expect(d.selected).toEqual(["NEEDLE"]);
});
it("progressive help names a category, gives one word then selects four; undo restores the solved group", async () => {
  const { user } = await open(true);
  await user.click(screen.getByRole("button", { name: "Hint" }));
  expect(screen.getByText("Look for in the garden.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Show one word" }));
  expect(screen.getByText(/One word.*TULIP/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Show four words" }));
  expect(
    screen.getByRole("button", { name: "Show four words" }),
  ).toBeDisabled();
  for (const w of connections[0].groups[0].words)
    expect(screen.getByRole("button", { name: w })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  await user.click(screen.getByRole("button", { name: "Shuffle words" }));
  await user.click(screen.getByRole("button", { name: "Connect" }));
  expect(
    screen.queryByRole("button", { name: "TULIP" }),
  ).not.toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: "Undo last connection" }),
  );
  expect(screen.getByRole("button", { name: "TULIP" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  const state = await saved();
  expect(state.drafts.connections?.hints).toBe(3);
  expect(state.drafts.connections?.undos).toBe(1);
  expect(state.drafts.connections?.id).toBe("old-connections");
  expect(state.sessions).toHaveLength(0);
});
it("a mixed selection has gentle feedback; fifth words and Escape cannot corrupt selection", async () => {
  const { user } = await open();
  for (const g of connections[0].groups)
    await user.click(screen.getByRole("button", { name: g.words[0] }));
  await user.click(screen.getByRole("button", { name: "Connect" }));
  expect(
    screen.getByText(/These words have different connections/),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "DAHLIA" }));
  expect(screen.getByText(/Four words are selected/)).toBeInTheDocument();
  await user.keyboard("{Escape}");
  expect(screen.getByRole("button", { name: "Connect" })).toBeDisabled();
  const state = await saved();
  expect((state.drafts.connections?.data as ConnectionsData).selected).toEqual(
    [],
  );
  expect(state.sessions).toHaveLength(0);
  expect(state.drafts.connections?.hints).toBe(0);
});
it("completion is filed once, replay creates another same-board attempt and new puzzle cycles all eight", async () => {
  const { user } = await open(true, 2);
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const g of connections[2].groups) {
      for (const w of g.words)
        await user.click(screen.getByRole("button", { name: w }));
      await user.click(screen.getByRole("button", { name: "Connect" }));
    }
    expect(
      screen.getByText("You found all four connections."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Undo last connection" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Shuffle words" }),
    ).toBeDisabled();
    if (attempt === 0)
      await user.click(
        screen.getByRole("button", { name: "Replay this puzzle" }),
      );
  }
  const state = await saved();
  expect(state.sessions).toHaveLength(2);
  expect(state.sessions.map((s) => s.attempt)).toEqual([1, 2]);
  expect(new Set(state.sessions.map((s) => s.id)).size).toBe(2);
  expect(
    state.sessions.every((s) => s.contentVersion === "connections-2"),
  ).toBe(true);
  for (let i = 0; i < 8; i++) {
    await user.click(screen.getByRole("button", { name: "Another puzzle" }));
    expect(
      screen.getByRole("heading", { name: connections[(3 + i) % 8].title }),
    ).toBeInTheDocument();
  }
});
it("legacy selection/solved group and shuffled presentation survive remount without collecting history", async () => {
  const d = { pack: 1, solved: ["Trees"], selected: ["FLOUR"], order: 7 };
  const { user, view } = await open(false, 1, d);
  expect(screen.getByRole("button", { name: "FLOUR" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const order = screen.getByRole("group", {
    name: "Connection words",
  }).textContent;
  await saved();
  view.unmount();
  render(<App appRole="play" />);
  await user.click(await screen.findByRole("button", { name: /Words/ }));
  expect(
    screen.getByRole("group", { name: "Connection words" }).textContent,
  ).toBe(order);
  expect(
    screen.queryByRole("button", { name: "MAPLE" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Hint" }));
  const state = await saved();
  expect(state.drafts.connections?.hints).toBe(0);
  expect(state.sessions).toHaveLength(0);
  expect(state.drafts.connections?.puzzleId).toBe("connections-1");
});
