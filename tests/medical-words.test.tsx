import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../src/App";
import {
  medicalConnections,
  medicalExplanation,
} from "../src/content/medical-words";
import {
  connectionsPool,
  connectionsMode,
  connectionsContentVersion,
  connectionsPuzzle,
  nextConnectionsPack,
} from "../src/games/connections-engine";
import { emptyState } from "../src/storage/contracts";
import { clearState, loadState, saveState } from "../src/storage/local";
beforeEach(async () => {
  await clearState("play");
  vi.restoreAllMocks();
});
async function open(history = true) {
  const state = emptyState("play");
  state.preferences.welcomeDone = true;
  state.preferences.history = history;
  await saveState(state);
  const view = render(<App appRole="play" />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: /Words/ }));
  fireEvent.click(await screen.findByRole("tab", { name: "Connections" }));
  vi.spyOn(window, "confirm").mockReturnValue(true);
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Word Connections challenge" }),
    "Medical",
  );
  return { user, view };
}
async function saved() {
  await waitFor(() =>
    expect(screen.getByText("Saved on this device")).toBeInTheDocument(),
  );
  return loadState("play");
}
it("medical pools have distinct versioned attempts and complete explanations without reclassifying old boards", () => {
  expect(connectionsPool("Medical")).toEqual([12, 13]);
  expect(connectionsPool("Challenging")).toEqual([8, 9, 10, 11]);
  expect(nextConnectionsPack(11)).toBe(8);
  expect(nextConnectionsPack(12)).toBe(13);
  expect(nextConnectionsPack(13)).toBe(12);
  for (const pack of [12, 13]) {
    expect(connectionsMode(pack)).toBe("medical-roots");
    expect(connectionsContentVersion(pack)).toBe("medical-roots-1");
    expect(nextConnectionsPack(pack, true)).toBe(pack);
    expect(connectionsPuzzle(pack)).toContain(medicalConnections[pack - 12].id);
    for (const g of medicalConnections[pack - 12].groups)
      expect(
        medicalExplanation(medicalConnections[pack - 12].id, g.title),
      ).toBeTruthy();
  }
  expect(medicalExplanation("crossed-meanings-v1", "Kidney")).toBeUndefined();
});
it("meaning-based play hides answers, rejects suffix-only matches, offers closed solved-root explanations and keeps completed provenance immutable", async () => {
  const { user } = await open();
  expect(screen.queryByText("Kidney", { exact: true })).not.toBeInTheDocument();
  expect(
    screen.getByText("How to play & get help").closest("details"),
  ).not.toHaveAttribute("open");
  for (const w of ["NEPHRITIS", "DERMATITIS", "OPHTHALMIC", "PHLEBITIS"])
    await user.click(screen.getByRole("button", { name: w }));
  await user.click(screen.getByRole("button", { name: "Connect" }));
  expect(
    screen.getByText(/isn't one of this puzzle's four groups/),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Clear selection" }));
  for (const g of medicalConnections[0].groups) {
    for (const w of g.words)
      await user.click(screen.getByRole("button", { name: w }));
    await user.click(screen.getByRole("button", { name: "Connect" }));
    const summary = screen.getByText(`Explore these roots: ${g.title}`);
    expect(summary.closest("details")).not.toHaveAttribute("open");
    await user.click(summary);
    expect(
      screen.getByText(medicalExplanation(medicalConnections[0].id, g.title)!),
    ).toBeVisible();
  }
  const first = (await saved()).sessions.find(
    (s) => s.mode === "medical-roots",
  )!;
  expect(first.contentVersion).toBe("medical-roots-1");
  expect(first.hints).toBe(0);
  expect(first.outcome).toBe("completed");
  await user.click(screen.getByRole("button", { name: "Replay this puzzle" }));
  expect(
    screen.queryByText("Explore these roots: Kidney"),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Another puzzle" }));
  expect(
    screen.getByRole("heading", { name: "Position in the word" }),
  ).toBeInTheDocument();
  expect((await saved()).sessions.find((s) => s.id === first.id)).toEqual(
    first,
  );
});
it("medical selection survives history-off reload and canceled replacement without optional history", async () => {
  const { user, view } = await open(false);
  await user.click(screen.getByRole("button", { name: "RENAL" }));
  await saved();
  view.unmount();
  render(<App appRole="play" />);
  await user.click(await screen.findByRole("button", { name: /Words/ }));
  fireEvent.click(await screen.findByRole("tab", { name: "Connections" }));
  vi.mocked(window.confirm).mockReturnValue(false);
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Word Connections challenge" }),
    "Classic",
  );
  expect(
    screen.getByRole("combobox", { name: "Word Connections challenge" }),
  ).toHaveValue("Medical");
  expect(screen.getByRole("button", { name: "RENAL" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await user.click(screen.getByRole("button", { name: "Hint" }));
  const s = await saved();
  expect(s.sessions).toHaveLength(0);
  expect(s.drafts.connections?.hints).toBe(0);
});
