import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useState } from "react";
import { emptyState, type LocalState } from "../src/storage/contracts";
import { clearState, loadState, saveState } from "../src/storage/local";
import {
  preserveRecovery,
  recoveryCopies,
  clearRecovery,
  clearRecoveryHistory,
  replaceWithRecovery,
  parseBackup,
} from "../src/storage/recovery";
import { RecoveryPanel } from "../src/storage/RecoveryPanel";
const previous = () => ({
  ...emptyState("play"),
  creations: [
    {
      id: "original",
      kind: "notebook" as const,
      title: "Original notebook",
      savedAt: "2026-10-10T00:00:00.000Z",
      text: "Original text",
    },
  ],
});
function fixtureFile(state: unknown) {
  const file = new File([JSON.stringify(state)], "synthetic-backup.json", {
    type: "application/json",
  });
  Object.defineProperty(file, "text", {
    value: async () => JSON.stringify(state),
  });
  return file;
}
beforeEach(async () => {
  await clearState("play");
  for (const role of ["play", "companion", "insights"] as const)
    await clearRecovery(role);
});
describe("safe local recovery", () => {
  it("keeps a durable undo copy before replacing the current save", async () => {
    const old = previous(),
      next = emptyState("play");
    await saveState(old);
    await replaceWithRecovery(next);
    expect(await loadState("play")).toEqual(next);
    expect((await recoveryCopies("play"))[0].state).toEqual(old);
    await replaceWithRecovery((await recoveryCopies("play"))[0].state);
    expect(await loadState("play")).toEqual(old);
  });
  it("retains three newest copies and isolates roles", async () => {
    for (let i = 0; i < 4; i++)
      await preserveRecovery({
        ...emptyState("play"),
        preferences: { ...emptyState("play").preferences, volume: i / 4 },
      });
    expect(
      (await recoveryCopies("play")).map(
        (copy) => copy.state.preferences.volume,
      ),
    ).toEqual([0.75, 0.5, 0.25]);
    expect(await recoveryCopies("insights")).toEqual([]);
  });
  it("rejects a wrong-role or invalid replacement before saving an undo copy", async () => {
    const old = previous();
    await saveState(old);
    await expect(
      replaceWithRecovery(emptyState("companion"), old),
    ).rejects.toThrow("Wrong app");
    await expect(
      parseBackup(fixtureFile(emptyState("companion")), "play"),
    ).rejects.toThrow();
    await expect(
      parseBackup(fixtureFile({ schemaVersion: 2 }), "play"),
    ).rejects.toThrow();
    expect(await loadState("play")).toEqual(old);
    expect(await recoveryCopies("play")).toEqual([]);
  });
  it("erases history from undo copies and removes copies on full deletion", async () => {
    const state = previous();
    state.creations[0].text = "Retain my creation";
    state.sessions.push({
      id: "synthetic-session",
      schemaVersion: 1,
      appVersion: "0.5.0",
      contentVersion: "1",
      game: "sudoku",
      puzzleId: "synthetic-puzzle",
      startedAt: "2026-10-10T00:00:00.000Z",
      endedAt: "2026-10-10T00:01:00.000Z",
      activeMs: 60000,
      hints: 0,
      undos: 0,
      outcome: "completed",
      mode: "4x4:Relaxed",
      attempt: 1,
      source: "local-guest",
    });
    await preserveRecovery(state);
    expect((await recoveryCopies("play"))[0].state.sessions).toHaveLength(1);
    await clearRecoveryHistory("play");
    expect((await recoveryCopies("play"))[0].state.sessions).toEqual([]);
    expect((await recoveryCopies("play"))[0].state.creations).toEqual(
      state.creations,
    );
    await clearRecovery("play");
    expect(await recoveryCopies("play")).toEqual([]);
  });
  it("blocks replacement if the device cannot save the undo copy", async () => {
    const old = previous();
    await saveState(old);
    const write = vi
      .spyOn(IDBObjectStore.prototype, "add")
      .mockImplementation(() => {
        throw new DOMException("Quota exceeded", "QuotaExceededError");
      });
    try {
      await expect(
        replaceWithRecovery(emptyState("play"), old),
      ).rejects.toThrow();
    } finally {
      write.mockRestore();
    }
    expect(await loadState("play")).toEqual(old);
  });
  it("shows a preview and supports cancel without altering saves", async () => {
    const old = previous();
    await saveState(old);
    const onRestore = vi.fn();
    render(<RecoveryPanel role="play" state={old} onRestore={onRestore} />);
    fireEvent.change(screen.getByLabelText("Restore this app’s JSON backup"), {
      target: { files: [fixtureFile(emptyState("play"))] },
    });
    await screen.findByRole("region", { name: "Restore preview" });
    expect(await loadState("play")).toEqual(old);
    fireEvent.click(screen.getByRole("button", { name: "Cancel restore" }));
    expect(
      screen.queryByRole("region", { name: "Restore preview" }),
    ).toBeNull();
    expect(onRestore).not.toHaveBeenCalled();
    expect(await recoveryCopies("play")).toEqual([]);
  });
  it("restores after review and exposes an undo preview without uploading", async () => {
    const old = previous();
    await saveState(old);
    function Harness() {
      const [state, setState] = useState<LocalState>(old);
      return <RecoveryPanel role="play" state={state} onRestore={setState} />;
    }
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Restore this app’s JSON backup"), {
      target: { files: [fixtureFile(emptyState("play"))] },
    });
    await screen.findByRole("region", { name: "Restore preview" });
    fireEvent.click(
      screen.getByRole("button", { name: "Restore this backup" }),
    );
    await screen.findByText(/Backup restored on this device/);
    await waitFor(async () =>
      expect((await recoveryCopies("play"))[0].state).toEqual(old),
    );
    fireEvent.click(
      await screen.findByRole("button", { name: "Review previous save 1" }),
    );
    expect(screen.getByText("Previous local save")).toBeInTheDocument();
  });
});
