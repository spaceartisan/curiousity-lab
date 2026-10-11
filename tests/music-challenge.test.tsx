import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../src/App";
import {
  melodyExercises,
  classicMelodies,
  challengingMelodies,
  melodyPool,
  nextMusicExercise,
  musicTaskMode,
  musicContentVersion,
  musicPuzzle,
} from "../src/content/music";
import { clearState, saveState, loadState } from "../src/storage/local";
import { emptyState } from "../src/storage/contracts";
import { validateGame } from "../src/storage/validate-game";
import { playNotes } from "../src/games/audio";
import type { MusicData } from "../src/games/Music";
vi.mock("../src/games/audio", async (original) => ({
  ...(await original<typeof import("../src/games/audio")>()),
  playNotes: vi.fn(async () => {}),
  stopAudio: vi.fn(),
}));
beforeEach(async () => {
  await clearState("play");
  vi.restoreAllMocks();
  vi.mocked(playNotes).mockClear();
});
async function open(history = true, exercise = 0) {
  const s = emptyState("play");
  s.preferences.welcomeDone = true;
  s.preferences.history = history;
  const data: MusicData = {
    mode: "match",
    exercise,
    notes: [0, 2, 4],
    title: "My recording",
    solved: false,
    presentation: "staff",
  };
  s.drafts.music = {
    id: "initial-music",
    game: "music",
    puzzleId: musicPuzzle(data),
    startedAt: "2026-10-10T00:00:00Z",
    activeMs: 0,
    hints: 0,
    undos: 0,
    mode: musicTaskMode(data),
    data,
  };
  await saveState(s);
  const view = render(<App appRole="play" />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: /^Music Name the piece/ }));
  fireEvent.click(
    await screen.findByRole("tab", { name: "Earlier exercises" }),
  );
  return { user, view };
}
async function saved() {
  await waitFor(() =>
    expect(screen.getByText("Saved on this device")).toBeInTheDocument(),
  );
  return loadState("play");
}
it("frozen legacy melodies retain IDs and the new five-note pairs share contour and endpoints but differ at exactly one interior note", () => {
  expect(
    classicMelodies.map((p) => [p.id, p.target, p.other, p.correct]),
  ).toEqual([
    ["small-arch-v1", [0, 2, 4, 2], [4, 2, 0, 2], 0],
    ["descending-line-v1", [6, 5, 4, 3], [1, 2, 3, 4], 1],
    ["neighbour-notes-v1", [2, 3, 2, 1], [2, 1, 2, 3], 0],
    ["rising-line-v1", [1, 2, 3, 4], [4, 3, 2, 1], 1],
  ]);
  expect(melodyPool("Classic")).toEqual([0, 1, 2, 3]);
  expect(melodyPool("Challenging")).toEqual([4, 5, 6, 7]);
  expect(nextMusicExercise({ mode: "match", exercise: 3 })).toBe(0);
  expect(nextMusicExercise({ mode: "match", exercise: 7 })).toBe(4);
  const contour = (s: number[]) =>
    s.slice(1).map((n, i) => Math.sign(n - s[i]));
  for (const p of challengingMelodies) {
    expect(p.target).toHaveLength(5);
    expect(p.other).toHaveLength(5);
    expect(contour(p.target)).toEqual(contour(p.other));
    expect(p.target[0]).toBe(p.other[0]);
    expect(p.target.at(-1)).toBe(p.other.at(-1));
    expect(p.target.filter((n, i) => n !== p.other[i])).toHaveLength(1);
    expect(
      [...p.target, ...p.other].every(
        (n) => Number.isInteger(n) && n >= 0 && n <= 7,
      ),
    ).toBe(true);
  }
  for (let i = 0; i < 8; i++) {
    const d = {
      mode: "match" as const,
      exercise: i,
      notes: [],
      title: "",
      solved: false,
    };
    expect(validateGame("music", d)).toBe(true);
    expect(nextMusicExercise(d, true)).toBe(i);
    expect(musicTaskMode(d)).toBe(i < 4 ? "match" : "match:challenging");
    expect(musicContentVersion(d, musicPuzzle(d))).toBe(
      i < 4 ? "music-exercises-1" : "music-melodies-2",
    );
  }
  expect(
    validateGame("music", {
      mode: "match",
      exercise: 8,
      notes: [],
      title: "",
      solved: false,
    }),
  ).toBe(false);
});
it("canceled selection retains the current attempt; confirmed challenge preserves the piano recording and starts distinct content without unsolicited help", async () => {
  const { user } = await open();
  const c = vi.spyOn(window, "confirm").mockReturnValue(false);
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Melody matching challenge" }),
    "Challenging",
  );
  expect(
    screen.getByRole("heading", { name: "A little arch" }),
  ).toBeInTheDocument();
  expect((await saved()).sessions).toHaveLength(0);
  c.mockReturnValue(true);
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Melody matching challenge" }),
    "Challenging",
  );
  expect(
    screen.getByRole("heading", { name: "Inner turn" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText("Matching controls & help").closest("details"),
  ).not.toHaveAttribute("open");
  expect(screen.queryByText(/Compare note/)).not.toBeInTheDocument();
  const s = await saved();
  expect(s.sessions[0].puzzleId).toBe("small-arch-v1");
  expect(s.drafts.music?.id).not.toBe("initial-music");
  expect(s.drafts.music?.puzzleId).toBe("inner-turn-v1");
  expect(s.drafts.music?.mode).toBe("match:challenging");
  expect((s.drafts.music?.data as MusicData).notes).toEqual([0, 2, 4]);
  expect(playNotes).not.toHaveBeenCalled();
});
it("by-ear presentation hides visual notes and explicit replays use the actual target and choice sequences", async () => {
  const { user } = await open(true, 4);
  await user.click(screen.getByRole("button", { name: "By ear" }));
  expect(screen.queryAllByRole("img")).toHaveLength(0);
  await user.click(screen.getByRole("button", { name: "Play / replay" }));
  expect(playNotes).not.toHaveBeenCalled();
  await user.click(screen.getByRole("checkbox", { name: "Sound" }));
  expect(playNotes).not.toHaveBeenCalled();
  for (let i = 0; i < 2; i++)
    await user.click(screen.getByRole("button", { name: "Play / replay" }));
  await user.click(screen.getByRole("button", { name: "Hear pattern 2" }));
  expect(vi.mocked(playNotes).mock.calls.map((c) => c[0])).toEqual([
    melodyExercises[4].target,
    melodyExercises[4].target,
    melodyExercises[4].other,
  ]);
  expect((await saved()).drafts.music?.hints).toBe(0);
});
it("a mismatch gives no answer; requested hint identifies the actual differing note and counts only the request", async () => {
  const { user } = await open(true, 4);
  await user.click(screen.getByRole("button", { name: "Choose pattern 2" }));
  expect(screen.queryByText(/Compare note/)).not.toBeInTheDocument();
  expect((await saved()).drafts.music?.hints).toBe(0);
  await user.click(screen.getByRole("button", { name: "Hint" }));
  expect(
    screen.getByText("Compare note 3. The target has G4 at that position."),
  ).toBeInTheDocument();
  const s = await saved();
  expect(s.drafts.music?.hints).toBe(1);
  expect((s.drafts.music?.data as MusicData).solved).toBe(false);
  expect(s.sessions).toHaveLength(0);
});
it("completed challenging melody records remain immutable through view changes, replay, pool cycling and a new mode", async () => {
  const { user } = await open(true, 7);
  await user.click(screen.getByRole("button", { name: "Choose pattern 2" }));
  const first = (await saved()).sessions[0];
  expect(first).toMatchObject({
    mode: "match:challenging",
    contentVersion: "music-melodies-2",
    outcome: "completed",
    hints: 0,
  });
  expect(screen.getByRole("button", { name: "Hint" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "By ear" }));
  expect((await saved()).sessions[0]).toEqual(first);
  await user.click(
    screen.getByRole("button", { name: "Try this exercise again" }),
  );
  expect(
    screen.getByRole("heading", { name: "Turn and return" }),
  ).toBeInTheDocument();
  expect((await saved()).drafts.music?.id).not.toBe(first.id);
  for (const i of [4, 5, 6, 7, 4]) {
    await user.click(screen.getByRole("button", { name: "Another melody" }));
    expect(
      screen.getByRole("heading", { name: melodyExercises[i].title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Melody matching challenge" }),
    ).toHaveValue("Challenging");
  }
  await user.click(screen.getByRole("button", { name: "Free piano" }));
  const s = await saved();
  expect(s.sessions[0]).toEqual(first);
  expect(s.drafts.music?.mode).toBe("piano");
  expect((s.drafts.music?.data as MusicData).notes).toEqual([0, 2, 4]);
});
it("history-off reload preserves chosen melody and presentation without optional hint or timing collection", async () => {
  const { user, view } = await open(false, 6);
  await user.click(screen.getByRole("button", { name: "Note pattern" }));
  await user.click(screen.getByRole("button", { name: "Hint" }));
  await saved();
  view.unmount();
  render(<App appRole="play" />);
  await user.click(await screen.findByRole("button", { name: /^Music Name the piece/ }));
  fireEvent.click(
    await screen.findByRole("tab", { name: "Earlier exercises" }),
  );
  expect(
    screen.getByRole("heading", { name: "Repeated centre" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Note pattern" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.queryByText(/Compare note/)).not.toBeInTheDocument();
  const s = await saved();
  expect(s.sessions).toHaveLength(0);
  expect(s.drafts.music?.hints).toBe(0);
  expect(s.drafts.music?.activeMs).toBe(0);
});
