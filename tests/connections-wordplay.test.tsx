import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../src/App";
import { connections } from "../src/content/words";
import {
  connectionsPool,
  connectionsMode,
  connectionsContentVersion,
  nextConnectionsPack,
  connectionsPuzzle,
  type ConnectionsData,
} from "../src/games/connections-engine";
import { emptyState } from "../src/storage/contracts";
import { clearState, loadState, saveState } from "../src/storage/local";
import { validateGame } from "../src/storage/validate-game";
beforeEach(async () => {
  await clearState("play");
  vi.restoreAllMocks();
});
async function open(history = true, pack = 0) {
  const state = emptyState("play");
  state.preferences.welcomeDone = true;
  state.preferences.history = history;
  state.drafts.connections = {
    id: "original-attempt",
    game: "connections",
    puzzleId: connectionsPuzzle(pack),
    mode: connectionsMode(pack),
    startedAt: "2026-10-10T00:00:00Z",
    activeMs: 0,
    hints: 0,
    undos: 0,
    data: { pack, solved: [], selected: [] },
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
it("chosen pools retain legacy modes and versions and cycle independently", () => {
  expect(connectionsPool("Classic")).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  expect(connectionsPool("Challenging")).toEqual([8, 9, 10, 11]);
  expect(nextConnectionsPack(7)).toBe(0);
  expect(nextConnectionsPack(11)).toBe(8);
  for (let i = 0; i < 12; i++) {
    expect(nextConnectionsPack(i, true)).toBe(i);
    expect(connectionsMode(i)).toBe(i < 8 ? "explore" : "wordplay");
    expect(connectionsContentVersion(i)).toBe(
      i < 2 ? "starter-1" : i < 8 ? "connections-2" : "connections-wordplay-1",
    );
    expect(
      validateGame("connections", {
        pack: i,
        solved: [],
        selected: [],
        order: 31,
      }),
    ).toBe(true);
    expect(
      validateGame("connections", {
        pack: i,
        solved: [connections[i].groups[0].title],
        selected: [connections[i].groups[0].words[0]],
      }),
    ).toBe(false);
  }
});
it("canceled challenge selection retains progress and confirmed choice starts a distinct correctly identified attempt without hints", async () => {
  const { user } = await open();
  await user.click(screen.getByRole("button", { name: "TULIP" }));
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Word Connections challenge" }),
    "Challenging",
  );
  expect(screen.getByRole("button", { name: "TULIP" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect((await saved()).sessions).toHaveLength(0);
  confirm.mockReturnValue(true);
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Word Connections challenge" }),
    "Challenging",
  );
  expect(
    screen.getByRole("heading", { name: "Crossed meanings" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/How to play & get help/).closest("details"),
  ).not.toHaveAttribute("open");
  for (const g of connections[8].groups)
    expect(
      screen.queryByText(g.title, { exact: true }),
    ).not.toBeInTheDocument();
  const s = await saved();
  expect(s.sessions).toHaveLength(1);
  expect(s.sessions[0].puzzleId).toBe("connections-0");
  expect(s.sessions[0].outcome).toBe("unfinished");
  expect(s.drafts.connections?.id).not.toBe("original-attempt");
  expect(s.drafts.connections?.puzzleId).toBe(connectionsPuzzle(8));
  expect(s.drafts.connections?.mode).toBe("wordplay");
  expect(s.drafts.connections?.hints).toBe(0);
  expect((s.drafts.connections?.data as ConnectionsData).selected).toEqual([]);
});
it("a plausible alternate grouping gets honest feedback without giving away categories", async () => {
  const { user } = await open(true, 8);
  for (const w of ["BASE", "DEAD", "PUNCH", "LIFE"])
    await user.click(screen.getByRole("button", { name: w }));
  await user.click(screen.getByRole("button", { name: "Connect" }));
  expect(
    screen.getByText(
      "That isn't one of this puzzle's four groups. Try another grouping.",
    ),
  ).toBeInTheDocument();
  expect(
    screen.queryByText("Words before LINE", { exact: true }),
  ).not.toBeInTheDocument();
  const s = await saved();
  expect((s.drafts.connections?.data as ConnectionsData).solved).toEqual([]);
  expect(s.drafts.connections?.hints).toBe(0);
});
it("requested wordplay help and undo count actual requests and restore the group", async () => {
  const { user } = await open(true, 8);
  for (const name of ["Hint", "Show one word", "Show four words"])
    await user.click(screen.getByRole("button", { name }));
  expect(
    screen.getByText(/Four words for words after paper are selected/),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Connect" }));
  await user.click(
    screen.getByRole("button", { name: "Undo last connection" }),
  );
  for (const w of connections[8].groups[0].words)
    expect(screen.getByRole("button", { name: w })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  const s = await saved();
  expect(s.drafts.connections?.hints).toBe(3);
  expect(s.drafts.connections?.undos).toBe(1);
  expect(s.sessions).toHaveLength(0);
});
it("completed wordplay is immutable through replay and another puzzle stays in the chosen tier", async () => {
  const { user } = await open(true, 11);
  for (const g of connections[11].groups) {
    for (const w of g.words)
      await user.click(screen.getByRole("button", { name: w }));
    await user.click(screen.getByRole("button", { name: "Connect" }));
  }
  const first = (await saved()).sessions[0];
  expect(first.contentVersion).toBe("connections-wordplay-1");
  expect(first.mode).toBe("wordplay");
  expect(first.hints).toBe(0);
  expect(first.outcome).toBe("completed");
  await user.click(screen.getByRole("button", { name: "Replay this puzzle" }));
  expect(
    screen.getByRole("heading", { name: connections[11].title }),
  ).toBeInTheDocument();
  const second = await saved();
  expect(second.sessions[0]).toEqual(first);
  expect(second.drafts.connections?.id).not.toBe(first.id);
  for (const i of [8, 9, 10, 11, 8]) {
    await user.click(screen.getByRole("button", { name: "Another puzzle" }));
    expect(
      screen.getByRole("heading", { name: connections[i].title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Word Connections challenge" }),
    ).toHaveValue("Challenging");
  }
  expect((await saved()).sessions[0]).toEqual(first);
});
it("history off retains chosen board and shuffled selection across reload without optional observations", async () => {
  const { user, view } = await open(false, 10);
  await user.click(screen.getByRole("button", { name: "ATE" }));
  await user.click(screen.getByRole("button", { name: "Shuffle words" }));
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
  expect(screen.getByRole("button", { name: "ATE" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await user.click(screen.getByRole("button", { name: "Hint" }));
  const s = await saved();
  expect(s.sessions).toHaveLength(0);
  expect(s.drafts.connections?.hints).toBe(0);
  expect(s.drafts.connections?.activeMs).toBe(0);
});
