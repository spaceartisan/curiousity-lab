import { beforeEach, afterEach, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Music, type MusicData } from "../src/games/Music";
import { App } from "../src/App";
import { emptyState } from "../src/storage/contracts";
import { clearState, saveState, loadState } from "../src/storage/local";
import {
  phraseExercises,
  classicPhrases,
  melodyExercises,
  rhythmExercises,
  rhythmFeedback,
} from "../src/content/music";
import { validateGame } from "../src/storage/validate-game";
import { playNotes, tone, stopAudio } from "../src/games/audio";
vi.mock("../src/games/audio", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/games/audio")>()),
  playNotes: vi.fn(async () => {}),
  tone: vi.fn(async () => {}),
  stopAudio: vi.fn(),
}));
beforeEach(async () => {
  await clearState("play");
  vi.clearAllMocks();
  vi.mocked(playNotes).mockResolvedValue(undefined);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
async function openMusic(history = false, data?: MusicData) {
  const s = emptyState("play");
  s.preferences.welcomeDone = true;
  s.preferences.history = history;
  if (data)
    s.drafts.music = {
      id: "old-music",
      game: "music",
      puzzleId: "music-studio-v1",
      startedAt: "2026-10-10T00:00:00Z",
      activeMs: 0,
      hints: 0,
      undos: 0,
      mode: data.mode,
      data,
    };
  await saveState(s);
  const user = userEvent.setup();
  const view = render(<App appRole="play" />);
  await user.click(await screen.findByRole("button", { name: /Music Hear/ }));
  return { user, view };
}
it("music content has distinct bounded exercises and alternating matching positions", () => {
  const ids = [...phraseExercises, ...melodyExercises, ...rhythmExercises].map(
    (x) => x.id,
  );
  expect(new Set(ids).size).toBe(22);
  for (const p of phraseExercises) {
    expect(p.heard.length).toBeGreaterThanOrEqual(3);
    expect(p.heard.length).toBeLessThanOrEqual(5);
    expect(
      [...p.heard, p.next].every(
        (n) => Number.isInteger(n) && n >= 0 && n <= 7,
      ),
    ).toBe(true);
  }
  for (const p of melodyExercises) {
    expect(p.target).not.toEqual(p.other);
    expect([...p.target, ...p.other].every((n) => n >= 0 && n <= 7)).toBe(true);
  }
  expect(new Set(melodyExercises.map((x) => x.correct))).toEqual(
    new Set([0, 1]),
  );
  for (const p of rhythmExercises) {
    expect([4, 6]).toContain(p.beats.length);
    expect(p.beats[0]).toBe(0);
    expect(p.beats.slice(1).every((n, i) => n > p.beats[i])).toBe(true);
  }
});
it("rhythm feedback follows relative spacing at different paces with flexible neutral fallback", () => {
  expect(rhythmFeedback([0, 500, 1500, 2000], [0, 1, 3, 4])).toBe(true);
  expect(rhythmFeedback([0, 1000, 3000, 4000], [0, 1, 3, 4])).toBe(true);
  expect(rhythmFeedback([0, 500, 1000, 1500], [0, 1, 3, 4])).toBe(false);
  expect(rhythmFeedback([0, 500, 1000, 1500], [0, 1, 3, 4], "extra")).toBe(
    true,
  );
  expect(rhythmFeedback([0, 2, 3, 4], [0, 1, 2, 3])).toBe(false);
  expect(rhythmFeedback([0, 500], [0, 1, 2, 3])).toBe(false);
});
it("legacy music saves remain valid and impossible new exercise/progress settings are rejected", () => {
  const d = { mode: "phrase", notes: [0, 2], title: "Saved", solved: false };
  expect(validateGame("music", d)).toBe(true);
  for (const extras of [
    { exercise: 99 },
    { exercise: -1 },
    { exercise: null },
    { presentation: "invalid" },
    { tempo: "fast" },
    { taps: 5 },
    { flexibility: "strict" },
  ])
    expect(validateGame("music", { ...d, ...extras })).toBe(false);
  expect(
    validateGame("music", { ...d, mode: "rhythm", taps: 4, solved: false }),
  ).toBe(false);
});
it("preserves an old piano recording across modes and does not reset on the selected mode", async () => {
  const { user } = await openMusic(false, {
    mode: "piano",
    notes: [0, 2],
    title: "Kept melody",
    solved: false,
  });
  await user.click(screen.getByRole("button", { name: "Free piano" }));
  await user.click(screen.getByRole("button", { name: "Complete the phrase" }));
  await user.click(screen.getByRole("button", { name: "Rhythm echo" }));
  await user.click(screen.getByRole("button", { name: "Free piano" }));
  expect(screen.getByRole("textbox", { name: "Melody name" })).toHaveValue(
    "Kept melody",
  );
  expect(screen.getByText(/2 notes recorded/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Save melody" }));
  await user.click(screen.getByRole("button", { name: "Back to games" }));
  await waitFor(async () => {
    const s = await loadState("play");
    expect(s.creations[0].notes).toEqual([0, 2]);
    expect(s.sessions).toEqual([]);
  });
  expect(tone).not.toHaveBeenCalled();
});
it("rhythm completion persists and Try again starts separate attempts while view changes do not", async () => {
  const { user } = await openMusic(true);
  await user.click(screen.getByRole("button", { name: "Rhythm echo" }));
  for (let attempt = 0; attempt < 2; attempt++) {
    for (let i = 0; i < 4; i++)
      await user.click(screen.getByRole("button", { name: "Tap a beat" }));
    expect(screen.getByRole("button", { name: "Tap a beat" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Slower" }));
    await user.click(screen.getByRole("button", { name: "Extra flexible" }));
    expect(screen.getByRole("button", { name: "Tap a beat" })).toBeDisabled();
    if (!attempt)
      await user.click(screen.getByRole("button", { name: "Try again" }));
  }
  await user.click(screen.getByRole("button", { name: "Back to games" }));
  await waitFor(async () => {
    const s = await loadState("play"),
      r = s.sessions.filter((x) => x.mode === "rhythm");
    expect(r).toHaveLength(2);
    expect(r.map((x) => x.attempt)).toEqual([1, 2]);
    expect(new Set(r.map((x) => x.id)).size).toBe(2);
    expect(
      r.every(
        (x) => x.outcome === "explored" && x.puzzleId === "steady-four-v1",
      ),
    ).toBe(true);
    expect((s.drafts.music?.data as MusicData).taps).toBe(4);
  });
});
it("all Classic phrase exercises can be completed with stable versioned IDs and no duplicate completion", async () => {
  const { user } = await openMusic(true);
  await user.click(screen.getByRole("button", { name: "Complete the phrase" }));
  for (let i = 0; i < classicPhrases.length; i++) {
    const note = ["C", "D", "E", "F", "G", "A", "B", "C high"][
      classicPhrases[i].next
    ];
    await user.click(screen.getByRole("button", { name: "Hint" }));
    await user.click(screen.getByRole("button", { name: `Play ${note}` }));
    await user.click(screen.getByRole("button", { name: `Play ${note}` }));
    await user.click(screen.getByRole("button", { name: "Note pattern" }));
    if (i < classicPhrases.length - 1)
      await user.click(screen.getByRole("button", { name: "Another phrase" }));
  }
  await user.click(screen.getByRole("button", { name: "Back to games" }));
  await waitFor(async () => {
    const s = await loadState("play"),
      phrases = s.sessions.filter((x) => x.mode === "phrase");
    expect(phrases.map((x) => x.puzzleId)).toEqual(
      classicPhrases.map((x) => x.id),
    );
    expect(
      phrases.every(
        (x) =>
          x.outcome === "completed" &&
          x.hints === 1 &&
          x.contentVersion === "music-exercises-1",
      ),
    ).toBe(true);
  });
});
it("by-ear previews require deliberate sound activation; incorrect matching choices do not complete", async () => {
  const { user } = await openMusic();
  await user.click(screen.getByRole("button", { name: "Match the melody" }));
  await user.click(screen.getByRole("button", { name: "By ear" }));
  expect(
    screen.queryByRole("img", { name: /Treble staff/ }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Play / replay" }));
  expect(playNotes).not.toHaveBeenCalled();
  await user.click(screen.getByRole("checkbox", { name: "Sound" }));
  expect(playNotes).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Slower" }));
  await user.click(screen.getByRole("button", { name: "Hear pattern 2" }));
  expect(playNotes).toHaveBeenLastCalledWith(
    melodyExercises[0].other,
    0.25,
    0.95,
    undefined,
  );
  await user.click(screen.getByRole("button", { name: "Choose pattern 2" }));
  expect(
    screen.getByRole("button", { name: "Choose pattern 1" }),
  ).toBeEnabled();
  await user.click(screen.getByRole("button", { name: "Choose pattern 1" }));
  expect(
    screen.getByRole("button", { name: "Choose pattern 1" }),
  ).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "Another melody" }));
  await user.click(screen.getByRole("button", { name: "Choose pattern 1" }));
  expect(
    screen.getByRole("button", { name: "Choose pattern 2" }),
  ).toBeEnabled();
  await user.click(screen.getByRole("button", { name: "Choose pattern 2" }));
  expect(
    screen.getByRole("button", { name: "Choose pattern 2" }),
  ).toBeDisabled();
  await user.click(screen.getByRole("checkbox", { name: "Sound" }));
  expect(stopAudio).toHaveBeenCalled();
});
it("blocked audio gives a useful visual fallback rather than a false successful playback", async () => {
  const { user } = await openMusic();
  await user.click(screen.getByRole("button", { name: "Match the melody" }));
  await user.click(screen.getByRole("checkbox", { name: "Sound" }));
  vi.mocked(playNotes).mockRejectedValueOnce(Error("blocked"));
  await user.click(screen.getByRole("button", { name: "Play / replay" }));
  expect(
    await screen.findByText(/Sound could not start. Try Play again/),
  ).toBeInTheDocument();
});
it("visual playback can stop, clears timers on unmount and respects reduced motion", async () => {
  vi.useFakeTimers();
  const props = {
    draft: {
      id: "visual",
      game: "music" as const,
      puzzleId: "ascending-steps-v1",
      startedAt: "2026-10-10T00:00:00Z",
      activeMs: 0,
      hints: 0,
      undos: 0,
      mode: "phrase",
      data: {
        mode: "phrase",
        exercise: 0,
        notes: [],
        title: "",
        solved: false,
      },
    },
    update: vi.fn(),
    finish: vi.fn(),
    create: vi.fn(),
    replay: vi.fn(),
    sound: false,
    volume: 0.25,
    onSoundChange: vi.fn(),
    onVolumeChange: vi.fn(),
  };
  const view = render(<Music {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Play / replay" }));
  await act(async () => {
    vi.advanceTimersByTime(610);
  });
  expect(document.querySelector(".playing-note")).not.toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Stop sound" }));
  await act(async () => {
    vi.advanceTimersByTime(5000);
  });
  expect(screen.getByText("Playback stopped.")).toBeInTheDocument();
  expect(document.querySelector(".playing-note")).toBeNull();
  view.unmount();
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  const reduced = render(<Music {...props} />);
  fireEvent.click(screen.getByRole("button", { name: "Play / replay" }));
  await act(async () => {
    vi.advanceTimersByTime(700);
  });
  expect(document.querySelector(".playing-note")).toBeNull();
  reduced.unmount();
  expect(vi.getTimerCount()).toBe(0);
  expect(playNotes).not.toHaveBeenCalled();
});
