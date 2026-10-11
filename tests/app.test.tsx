import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../src/App";
import { clearState, loadState, saveState } from "../src/storage/local";
import { emptyState } from "../src/storage/contracts";
beforeEach(async () => {
  await clearState("play");
  await clearState("companion");
  await clearState("insights");
  vi.clearAllMocks();
});
describe("player flow", () => {
  it("first run has stable library, optional history, and persists Sudoku progress", async () => {
    const user = userEvent.setup();
    const view = render(<App appRole="play" />);
    await user.click(
      await screen.findByRole("button", {
        name: "Play without activity history",
      }),
    );
    await user.click(screen.getByRole("button", { name: /Numbers/ }));
    const blank = screen.getAllByRole("button", { name: /Row.*empty/ })[0];
    await user.click(blank);
    await user.click(screen.getByRole("button", { name: "1" }));
    await waitFor(async () =>
      expect((await loadState("play")).drafts.sudoku).toBeDefined(),
    );
    await user.click(screen.getByRole("button", { name: "Back to games" }));
    await waitFor(() =>
      expect(screen.getByText("Saved on this device")).toBeInTheDocument(),
    );
    const before = (await loadState("play")).drafts.sudoku;
    view.unmount();
    render(<App appRole="play" />);
    await user.click(await screen.findByRole("button", { name: /Numbers/ }));
    expect((await loadState("play")).drafts.sudoku).toEqual(before);
    expect((await loadState("play")).sessions).toEqual([]);
  });
  it("seven replays are allowed, have stable separate ids, and consent can stop history", async () => {
    const s = emptyState("play");
    s.preferences.history = true;
    s.preferences.welcomeDone = true;
    await saveState(s);
    const user = userEvent.setup();
    render(<App appRole="play" />);
    await user.click(await screen.findByRole("button", { name: /Words/ }));
    for (let i = 0; i < 7; i++) {
      await user.click(screen.getByRole("button", { name: "New activity" }));
    }
    await user.click(screen.getByRole("button", { name: "Settings" }));
    await waitFor(() =>
      expect(screen.getByText("Saved on this device")).toBeInTheDocument(),
    );
    const saved = await loadState("play");
    expect(saved.sessions).toHaveLength(7);
    expect(new Set(saved.sessions.map((s) => s.id)).size).toBe(7);
    await user.click(
      screen.getByRole("checkbox", {
        name: "Keep activity history on this device",
      }),
    );
    await user.click(screen.getByRole("button", { name: "Back to games" }));
    await user.click(screen.getByRole("button", { name: /Words/ }));
    await user.click(screen.getByRole("button", { name: "New activity" }));
    await user.click(screen.getByRole("button", { name: "Back to games" }));
    await waitFor(() =>
      expect(screen.getByText("Saved on this device")).toBeInTheDocument(),
    );
    expect((await loadState("play")).sessions).toHaveLength(7);
  });
  it("laboratory lets stages be skipped and notebook creations persist without activity collection", async () => {
    const user = userEvent.setup();
    render(<App appRole="play" />);
    await user.click(
      await screen.findByRole("button", { name: /My Laboratory/ }),
    );
    await user.click(screen.getByRole("button", { name: "Observations" }));
    await user.click(screen.getByRole("button", { name: "Filaments" }));
    await user.type(
      screen.getByRole("textbox", { name: "Your notebook note" }),
      "Interesting branches",
    );
    await user.click(
      screen.getByRole("button", { name: "Save to Lab Notebook" }),
    );
    await user.click(screen.getByRole("button", { name: "Back to games" }));
    await user.click(screen.getByRole("button", { name: /My Creations/ }));
    expect(screen.getByText("Interesting branches")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Revisit specimen" }));
    expect(
      screen.getByRole("region", { name: /Microscope image/ }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText("Saved on this device")).toBeInTheDocument(),
    );
    expect((await loadState("play")).creations).toHaveLength(1);
    expect((await loadState("play")).sessions).toHaveLength(0);
  });
  it("connections accepts the curated group and gives truthful feedback", async () => {
    const user = userEvent.setup();
    render(<App appRole="play" />);
    await user.click(await screen.findByRole("button", { name: /Words/ }));
    for (const w of ["TULIP", "DAHLIA", "IRIS", "ROSE"])
      await user.click(screen.getByRole("button", { name: w }));
    await user.click(screen.getByRole("button", { name: "Connect" }));
    expect(screen.getByText("Connected: In the garden.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "TULIP" }),
    ).not.toBeInTheDocument();
  });
  it("piano saves symbolic notes even when sound is off", async () => {
    const user = userEvent.setup();
    render(<App appRole="play" />);
    await user.click(await screen.findByRole("button", { name: /Music Hear/ }));
    fireEvent.click(
      await screen.findByRole("tab", { name: "Earlier exercises" }),
    );
    await user.click(screen.getByRole("button", { name: "Play C" }));
    await user.click(screen.getByRole("button", { name: "Play E" }));
    await user.click(screen.getByRole("button", { name: "Save melody" }));
    expect(
      screen.getByText("Your melody is saved in My Creations."),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Back to games" }));
    await waitFor(() =>
      expect(screen.getByText("Saved on this device")).toBeInTheDocument(),
    );
    expect((await loadState("play")).creations[0].notes).toEqual([0, 2]);
  });
});
it("other role entries never read Play records and examples are explicitly fictional", async () => {
  const state = emptyState("play");
  state.creations.push({
    id: "secret",
    kind: "melody",
    title: "Private creation",
    savedAt: new Date().toISOString(),
    notes: [1],
  });
  await saveState(state);
  const { unmount } = render(<App appRole="companion" />);
  expect(
    await screen.findByText("Family sharing is not connected"),
  ).toBeInTheDocument();
  expect(screen.queryByText("Private creation")).not.toBeInTheDocument();
  fireEvent.click(
    screen.getByRole("button", { name: "View a fictional example" }),
  );
  expect(
    screen.getByText("Fictional example · No family data"),
  ).toBeInTheDocument();
  unmount();
  render(<App appRole="insights" />);
  expect(
    await screen.findByText("Family sharing is not connected"),
  ).toBeInTheDocument();
  expect(screen.queryByText("Private creation")).not.toBeInTheDocument();
});
it("history-off Sudoku hints do not accumulate optional metrics", async () => {
  const user = userEvent.setup();
  render(<App appRole="play" />);
  await user.click(await screen.findByRole("button", { name: /Numbers/ }));
  await user.click(screen.getByRole("button", { name: "Hint" }));
  await user.click(screen.getByRole("button", { name: "Back to games" }));
  await waitFor(() =>
    expect(screen.getByText("Saved on this device")).toBeInTheDocument(),
  );
  const saved = await loadState("play");
  expect(saved.drafts.sudoku?.hints).toBe(0);
  expect(saved.drafts.sudoku?.activeMs).toBe(0);
  expect(saved.sessions).toEqual([]);
});
