import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../src/App";
import {
  classicPhrases,
  challengingPhrases,
  phraseExercises,
  phrasePool,
  nextMusicExercise,
  musicPuzzle,
  musicTaskMode,
  musicContentVersion,
} from "../src/content/music";
import { clearState, saveState, loadState } from "../src/storage/local";
import { emptyState } from "../src/storage/contracts";
import { validateGame } from "../src/storage/validate-game";
import { playNotes } from "../src/games/audio";
import type { MusicData } from "../src/games/Music";
vi.mock("../src/games/audio", async (original) => ({
  ...(await original<typeof import("../src/games/audio")>()),
  playNotes: vi.fn(async () => {}),
  tone: vi.fn(async () => {}),
  stopAudio: vi.fn(),
}));
beforeEach(async () => {
  await clearState("play");
  vi.restoreAllMocks();
  vi.mocked(playNotes).mockClear();
});
const key = (n: number) =>
  `Play ${["C", "D", "E", "F", "G", "A", "B", "C high"][n]}`;
async function open(history = true, exercise = 0) {
  const s = emptyState("play");
  s.preferences.welcomeDone = true;
  s.preferences.history = history;
  const data: MusicData = {
    mode: "phrase",
    exercise,
    notes: [0, 2],
    title: "Kept recording",
    solved: false,
    presentation: "staff",
  };
  s.drafts.music = {
    id: "initial-phrase",
    game: "music",
    puzzleId: musicPuzzle(data),
    mode: musicTaskMode(data),
    startedAt: "2026-10-10T00:00:00Z",
    activeMs: 0,
    hints: 0,
    undos: 0,
    data,
  };
  await saveState(s);
  const view = render(<App appRole="play" />),
    user = userEvent.setup();
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
it("legacy content and versions stay fixed while independent rule checks verify every bounded five-note continuation and collection boundary", () => {
  expect(classicPhrases.map((p) => [p.id, p.heard, p.next])).toEqual([
    ["ascending-steps-v1", [0, 1, 2], 3],
    ["descending-steps-v1", [6, 5, 4], 3],
    ["rising-skips-v1", [0, 2, 4], 6],
    ["return-home-v1", [0, 2, 4, 2], 0],
  ]);
  const all = challengingPhrases.map((p) => [...p.heard, p.next]),
    gaps = (s: number[]) => s.slice(1).map((n, i) => n - s[i]);
  expect(gaps(all[0])).toEqual([2, -1, 2, -1, 2]);
  expect(gaps(all[2])).toEqual([1, 2, 3, -2, -1]);
  for (const i of [1, 3]) {
    expect(gaps(all[i].filter((_, n) => n % 2 === 0))).toEqual([1, 1]);
    expect(gaps(all[i].filter((_, n) => n % 2 === 1))).toEqual(
      i === 1 ? [-1, -1] : [1, 1],
    );
  }
  expect(phrasePool("Classic")).toEqual([0, 1, 2, 3]);
  expect(phrasePool("Challenging")).toEqual([4, 5, 6, 7]);
  expect(nextMusicExercise({ mode: "phrase", exercise: 3 })).toBe(0);
  expect(nextMusicExercise({ mode: "phrase", exercise: 7 })).toBe(4);
  for (let i = 0; i < 8; i++) {
    const d = {
      mode: "phrase" as const,
      exercise: i,
      notes: [],
      title: "",
      solved: false,
    };
    expect(validateGame("music", d)).toBe(true);
    expect(nextMusicExercise(d, true)).toBe(i);
    expect(musicTaskMode(d)).toBe(i < 4 ? "phrase" : "phrase:challenging");
    expect(musicContentVersion(d, musicPuzzle(d))).toBe(
      i < 4 ? "music-exercises-1" : "music-phrases-2",
    );
  }
  for (const p of challengingPhrases) {
    expect(p.heard).toHaveLength(5);
    expect(
      [...p.heard, p.next].every(
        (n) => Number.isInteger(n) && n >= 0 && n <= 7,
      ),
    ).toBe(true);
  }
  expect(
    validateGame("music", {
      mode: "phrase",
      exercise: 8,
      notes: [],
      title: "",
      solved: false,
    }),
  ).toBe(false);
});
it("canceled challenge choice keeps the old attempt; confirmed choice preserves recording and displays the rule without unsolicited solution or playback", async () => {
  const { user } = await open();
  const c = vi.spyOn(window, "confirm").mockReturnValue(false),
    choice = screen.getByRole("combobox", { name: "Phrase challenge" });
  await user.selectOptions(choice, "Challenging");
  expect(
    screen.getByRole("heading", { name: "Up one step" }),
  ).toBeInTheDocument();
  expect((await saved()).sessions).toHaveLength(0);
  c.mockReturnValue(true);
  await user.selectOptions(choice, "Challenging");
  expect(screen.getByText(phraseExercises[4].rule)).toBeInTheDocument();
  expect(screen.queryByText(phraseExercises[4].hint)).not.toBeInTheDocument();
  expect(
    screen.getByText("Phrase controls & help").closest("details"),
  ).not.toHaveAttribute("open");
  const s = await saved();
  expect(s.drafts.music?.id).not.toBe("initial-phrase");
  expect(s.drafts.music?.puzzleId).toBe("alternating-steps-v1");
  expect(s.drafts.music?.mode).toBe("phrase:challenging");
  expect((s.drafts.music?.data as MusicData).notes).toEqual([0, 2]);
  expect(s.sessions[0].puzzleId).toBe("ascending-steps-v1");
  expect(s.drafts.music?.hints).toBe(0);
  expect(playNotes).not.toHaveBeenCalled();
});
it("by-ear replays use the actual phrase, only a requested hint reveals the answer, and all four completions remain immutable across replay and new mode", async () => {
  const { user } = await open(true, 4);
  await user.click(screen.getByRole("button", { name: "By ear" }));
  expect(screen.queryAllByRole("img")).toHaveLength(0);
  await user.click(screen.getByRole("checkbox", { name: "Sound" }));
  expect(playNotes).not.toHaveBeenCalled();
  for (let i = 0; i < 2; i++)
    await user.click(screen.getByRole("button", { name: "Play / replay" }));
  expect(vi.mocked(playNotes).mock.calls.map((c) => c[0])).toEqual([
    phraseExercises[4].heard,
    phraseExercises[4].heard,
  ]);
  await user.click(screen.getByRole("button", { name: key(0) }));
  expect(
    screen.getByText("That note doesn't continue the stated pattern."),
  ).toBeInTheDocument();
  expect(screen.queryByText(phraseExercises[4].hint)).not.toBeInTheDocument();
  expect((await saved()).drafts.music?.hints).toBe(0);
  await user.click(screen.getByRole("button", { name: "Hint" }));
  expect(screen.getByText(phraseExercises[4].hint)).toBeInTheDocument();
  for (let i = 4; i < 8; i++) {
    if (i > 4)
      await user.click(screen.getByRole("button", { name: "Another phrase" }));
    await user.click(
      screen.getByRole("button", {
        name: key(phraseExercises[i].next),
      }),
    );
    expect(screen.getByRole("button", { name: "Hint" })).toBeDisabled();
  }
  const s = await saved();
  expect(s.sessions.map((r) => r.puzzleId)).toEqual(
    challengingPhrases.map((p) => p.id),
  );
  expect(s.sessions.map((r) => r.hints)).toEqual([1, 0, 0, 0]);
  expect(
    s.sessions.every(
      (r) =>
        r.mode === "phrase:challenging" &&
        r.contentVersion === "music-phrases-2" &&
        r.outcome === "completed",
    ),
  ).toBe(true);
  await user.click(
    screen.getByRole("button", { name: "Try this exercise again" }),
  );
  expect(
    screen.getByRole("heading", { name: "Parallel lines" }),
  ).toBeInTheDocument();
  expect((await saved()).sessions).toEqual(s.sessions);
  await user.click(screen.getByRole("button", { name: "Another phrase" }));
  expect(
    screen.getByRole("heading", { name: "Alternating steps" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("combobox", { name: "Phrase challenge" }),
  ).toHaveValue("Challenging");
  await user.click(screen.getByRole("button", { name: "Free piano" }));
  const after = await saved();
  expect(after.sessions.slice(0, 4)).toEqual(s.sessions);
  expect(after.drafts.music?.mode).toBe("piano");
  expect((after.drafts.music?.data as MusicData).notes).toEqual([0, 2]);
});
it("history-off resume keeps challenging content and presentation but drops transient hints and collects no optional summary", async () => {
  const { user, view } = await open(false, 5);
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
    screen.getByRole("heading", { name: "Opposing lines" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Note pattern" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.queryByText(phraseExercises[5].hint)).not.toBeInTheDocument();
  const s = await saved();
  expect(s.sessions).toHaveLength(0);
  expect(s.drafts.music?.hints).toBe(0);
  expect(s.drafts.music?.activeMs).toBe(0);
  expect(s.drafts.music).not.toHaveProperty("presentation");
});
