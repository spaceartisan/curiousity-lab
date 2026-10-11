import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../src/App";
import {
  classicRhythms,
  challengingRhythms,
  rhythmExercises,
  rhythmPool,
  rhythmFeedback,
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
async function open(history = true, exercise = 0, taps = 0) {
  const s = emptyState("play");
  s.preferences.welcomeDone = true;
  s.preferences.history = history;
  const data: MusicData = {
    mode: "rhythm",
    exercise,
    taps,
    notes: [0, 2],
    title: "Kept recording",
    solved: false,
  };
  s.drafts.music = {
    id: "initial-rhythm",
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
  await user.click(await screen.findByRole("button", { name: /Music Hear/ }));
  return { user, view };
}
async function saved() {
  await waitFor(() =>
    expect(screen.getByText("Saved on this device")).toBeInTheDocument(),
  );
  return loadState("play");
}
it("legacy rhythms remain exact and six-beat patterns preserve pace-normalized tolerance with valid per-exercise completion bounds", () => {
  expect(classicRhythms.map((p) => [p.id, p.beats])).toEqual([
    ["steady-four-v1", [0, 1, 2, 3]],
    ["two-pairs-v1", [0, 1, 3, 4]],
    ["three-and-one-v1", [0, 1, 2, 4]],
  ]);
  expect(rhythmPool("Classic")).toEqual([0, 1, 2]);
  expect(rhythmPool("Challenging")).toEqual([3, 4, 5]);
  expect(nextMusicExercise({ mode: "rhythm", exercise: 2 })).toBe(0);
  expect(nextMusicExercise({ mode: "rhythm", exercise: 5 })).toBe(3);
  for (const p of challengingRhythms) {
    expect(p.beats).toHaveLength(6);
    expect(p.beats[0]).toBe(0);
    expect(p.beats.slice(1).every((n, i) => n > p.beats[i])).toBe(true);
    for (const pace of [200, 500, 1000])
      expect(
        rhythmFeedback(
          p.beats.map((b) => b * pace + 123),
          p.beats,
        ),
      ).toBe(true);
    expect(rhythmFeedback([0, 500, 1000, 1500, 2000, 2500], p.beats)).toBe(
      false,
    );
    expect(
      rhythmFeedback([0, 500, 1000, 1500, 2000, 2500], p.beats, "extra"),
    ).toBe(p.id === "separated-pairs-v1");
  }
  for (let i = 0; i < 6; i++) {
    const count = i < 3 ? 4 : 6,
      d = {
        mode: "rhythm" as const,
        exercise: i,
        notes: [],
        title: "",
        solved: false,
        taps: count - 1,
      };
    expect(validateGame("music", d)).toBe(true);
    expect(validateGame("music", { ...d, taps: count })).toBe(false);
    expect(validateGame("music", { ...d, taps: count, solved: true })).toBe(
      true,
    );
    expect(validateGame("music", { ...d, taps: count + 1, solved: true })).toBe(
      false,
    );
    expect(nextMusicExercise(d, true)).toBe(i);
    expect(musicTaskMode(d)).toBe(i < 3 ? "rhythm" : "rhythm:challenging");
    expect(musicContentVersion(d, musicPuzzle(d))).toBe(
      i < 3 ? "music-exercises-1" : "music-rhythms-2",
    );
  }
  expect(
    validateGame("music", {
      mode: "rhythm",
      exercise: 6,
      notes: [],
      title: "",
      solved: false,
      taps: 0,
    }),
  ).toBe(false);
});
it("canceled choices preserve tap progress; confirmed six-beat choice resets only the attempt and explicit playback uses all six actual offsets", async () => {
  const { user } = await open(true, 0, 1),
    c = vi.spyOn(window, "confirm").mockReturnValue(false),
    choice = screen.getByRole("combobox", { name: "Rhythm challenge" });
  await user.selectOptions(choice, "Challenging");
  expect(screen.getByText(/1 of 4 beats tapped/)).toBeInTheDocument();
  expect((await saved()).sessions).toHaveLength(0);
  c.mockReturnValue(true);
  await user.selectOptions(choice, "Challenging");
  expect(screen.getByText(/0 of 6 beats tapped/)).toBeInTheDocument();
  expect(
    screen.getByText("Rhythm controls & help").closest("details"),
  ).not.toHaveAttribute("open");
  expect(screen.queryByText(/Spaces between beats/)).not.toBeInTheDocument();
  expect(playNotes).not.toHaveBeenCalled();
  await user.click(screen.getByRole("checkbox", { name: "Sound" }));
  await user.click(screen.getByRole("button", { name: "Play / replay" }));
  expect(vi.mocked(playNotes).mock.calls[0][0]).toEqual([0, 0, 0, 0, 0, 0]);
  expect(vi.mocked(playNotes).mock.calls[0][3]).toEqual(
    rhythmExercises[3].beats,
  );
  const s = await saved();
  expect(s.drafts.music?.puzzleId).toBe("two-trios-v1");
  expect(s.drafts.music?.mode).toBe("rhythm:challenging");
  expect((s.drafts.music?.data as MusicData).notes).toEqual([0, 2]);
  expect(s.drafts.music?.id).not.toBe("initial-rhythm");
});
it("six actual taps complete once with requested spacing help, immutable exploration records and chosen-pool replay", async () => {
  const { user } = await open(true, 3);
  await user.click(screen.getByRole("button", { name: "Hint" }));
  expect(
    screen.getByText(
      "Spaces between beats: 1 · 1 · 4 · 1 · 1. Keep these relative spaces at your own pace.",
    ),
  ).toBeInTheDocument();
  for (let i = 0; i < 6; i++) {
    await user.click(screen.getByRole("button", { name: "Tap a beat" }));
    if (i < 5)
      expect(screen.getByRole("button", { name: "Tap a beat" })).toBeEnabled();
  }
  const first = (await saved()).sessions[0];
  expect(first).toMatchObject({
    outcome: "explored",
    mode: "rhythm:challenging",
    contentVersion: "music-rhythms-2",
    hints: 1,
  });
  expect(screen.getByRole("button", { name: "Tap a beat" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Hint" })).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Extra flexible" }));
  expect((await saved()).sessions[0]).toEqual(first);
  await user.click(screen.getByRole("button", { name: "Try again" }));
  expect(screen.getByText(/0 of 6 beats tapped/)).toBeInTheDocument();
  expect((await saved()).drafts.music?.id).not.toBe(first.id);
  for (const i of [4, 5, 3]) {
    await user.click(screen.getByRole("button", { name: "Another rhythm" }));
    expect(
      screen.getByRole("heading", { name: rhythmExercises[i].title }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Rhythm challenge" }),
    ).toHaveValue("Challenging");
  }
  expect((await saved()).sessions[0]).toEqual(first);
});
it("history-off reload retains six-beat progress without raw timestamps and resumed completion reports unavailable timing honestly", async () => {
  const { user, view } = await open(false, 4);
  for (let i = 0; i < 2; i++)
    await user.click(screen.getByRole("button", { name: "Tap a beat" }));
  await user.click(screen.getByRole("button", { name: "Hint" }));
  await saved();
  view.unmount();
  render(<App appRole="play" />);
  await user.click(await screen.findByRole("button", { name: /Music Hear/ }));
  expect(screen.getByText(/2 of 6 beats tapped/)).toBeInTheDocument();
  for (let i = 0; i < 4; i++)
    await user.click(screen.getByRole("button", { name: "Tap a beat" }));
  expect(
    screen.getByText(
      "Sequence complete. Timing feedback is unavailable for a resumed sequence.",
    ),
  ).toBeInTheDocument();
  const s = await saved();
  expect(s.sessions).toHaveLength(0);
  expect(s.drafts.music?.hints).toBe(0);
  expect(s.drafts.music?.activeMs).toBe(0);
  expect(Object.keys(s.drafts.music!.data as object).sort()).toEqual([
    "exercise",
    "mode",
    "notes",
    "solved",
    "taps",
    "title",
  ]);
  expect(s.drafts.music).not.toHaveProperty("presentation");
});
