import { withTiming } from "../src/storage/timing";
import {
  clearRecovery,
  preserveRecovery,
  recoveryCopies,
  clearRecoveryHistory,
} from "../src/storage/recovery";
import { beforeEach, expect, it } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../src/App";
import {
  emptyState,
  validateState,
  type Draft,
} from "../src/storage/contracts";
import {
  observePresentation,
  validPresentation,
  presentationKey,
  presentationLabel,
  withoutRecordedHistory,
} from "../src/storage/presentation";
import {
  clearState,
  saveState,
  loadState,
  sessionsCsv,
} from "../src/storage/local";
import { fictionalReview } from "./fixtures/review";
import { contextKey, summarizeContexts } from "../src/insights/review";
const prefs = () => ({
  ...emptyState("play").preferences,
  history: true,
  welcomeDone: true,
});
const music = (): Draft => ({
  id: "fictional-presentation",
  game: "music",
  puzzleId: "music-studio-v1",
  mode: "piano",
  startedAt: "2026-10-10T00:00:00Z",
  activeMs: 0,
  hints: 0,
  undos: 0,
  data: { mode: "piano", notes: [], title: "Fictional melody", solved: false },
});
beforeEach(async () => {
  await clearState("play");
});
it("collects bounded preference sets and exact volume range without mutating previous observations", () => {
  const initial = observePresentation(music(), prefs(), true),
    original = structuredClone(initial);
  const next = observePresentation(
    {
      ...initial,
      data: { ...(music().data as object), presentation: "ear", tempo: "slow" },
    },
    { ...prefs(), sound: true, volume: 0, theme: "dark", textSize: "large" },
  );
  expect(initial).toEqual(original);
  expect(next.presentation).toEqual({
    version: 1,
    coverage: "from-start",
    themes: ["dark", "system"],
    textSizes: ["large", "normal"],
    input: { version: 1, coverage: "from-start", methods: [] },
    music: {
      soundSettings: [false, true],
      volumeRange: [0, 0.25],
      views: ["ear", "staff"],
      tempos: ["comfortable", "slow"],
      flexibility: [],
    },
  });
  expect(
    observePresentation(next, { ...prefs(), sound: true, volume: 0 }),
  ).toEqual(next);
  expect(presentationLabel(next.presentation)).toContain(
    "sound setting off / on",
  );
});
it("legacy/resumed attempts are partial, history-off removes observations and finalized records stay immutable", () => {
  const d = observePresentation(music(), prefs());
  expect(d.presentation?.coverage).toBe("partial");
  expect(
    observePresentation(d, { ...prefs(), history: false }),
  ).not.toHaveProperty("presentation");
  const final = { ...d, finalized: true };
  expect(observePresentation(final, { ...prefs(), sound: true })).toBe(final);
  expect(presentationLabel()).toBe("Presentation settings unrecorded");
});
it("rhythm observations describe the actual rhythm pattern and record only its applicable flexibility", () => {
  const d = observePresentation(
    {
      ...music(),
      mode: "rhythm",
      data: {
        ...(music().data as object),
        mode: "rhythm",
        presentation: "ear",
        flexibility: "extra",
      },
    },
    prefs(),
    true,
  );
  expect(d.presentation?.music?.views).toEqual(["rhythm-pattern"]);
  expect(d.presentation?.music?.flexibility).toEqual(["extra"]);
  expect(presentationLabel(d.presentation)).toContain("rhythm pattern");
  expect(validPresentation(d.presentation, "music")).toBe(true);
});
it("canonical grouping distinguishes missing/partial/mixed context while ignoring set order", () => {
  const p = observePresentation(music(), prefs(), true).presentation!;
  const mixed = observePresentation(
    { ...music(), presentation: p },
    { ...prefs(), theme: "dark" },
  ).presentation!;
  const reversed = { ...mixed, themes: [...mixed.themes].reverse() };
  expect(presentationKey(mixed)).toBe(presentationKey(reversed));
  const s = {
    ...fictionalReview().sessions[0],
    game: "music" as const,
    presentation: p,
  };
  const variants = [
    s,
    { ...s, id: "unknown", presentation: undefined },
    {
      ...s,
      id: "partial",
      presentation: { ...p, coverage: "partial" as const },
    },
    { ...s, id: "mixed", presentation: mixed },
  ];
  expect(new Set(variants.map(contextKey)).size).toBe(4);
  expect(summarizeContexts(variants)).toHaveLength(4);
});
it("validates every context field, rejects unknown/private properties and keeps legacy backups compatible", () => {
  const p = observePresentation(music(), prefs(), true).presentation!;
  for (const bad of [
    null,
    [],
    { ...p, version: 2 },
    { ...p, coverage: "guess" },
    { ...p, themes: [] },
    { ...p, themes: ["light", "light"] },
    { ...p, textSizes: ["tiny"] },
    { ...p, text: "private" },
    { ...p, music: undefined },
    { ...p, music: { ...p.music, views: ["unknown"] } },
    { ...p, music: { ...p.music, volumeRange: [0.5, 0] } },
    { ...p, music: { ...p.music, volumeRange: [0, 2] } },
    { ...p, music: { ...p.music, soundSettings: ["true"] } },
    { ...p, music: { ...p.music, microphone: "private" } },
  ])
    expect(validPresentation(bad, "music")).toBe(false);
  expect(validPresentation(p, "lab")).toBe(false);
  const state = fictionalReview();
  expect(() => validateState(state, "play")).not.toThrow();
  state.sessions[0] = { ...state.sessions[0], game: "music", presentation: p };
  state.drafts.music = observePresentation(music(), prefs(), true);
  expect(() =>
    validateState(JSON.parse(JSON.stringify(state)), "play"),
  ).not.toThrow();
  state.drafts.music.presentation!.themes = [];
  expect(() => validateState(state, "play")).toThrow("Invalid draft");
  state.drafts = {};
  state.sessions[0].presentation!.themes = [];
  expect(() => validateState(state, "play")).toThrow("Invalid session");
});
it("CSV keeps its existing source fields and appends a quoted exact context JSON with unknown left blank", () => {
  const state = fictionalReview(),
    p = observePresentation(music(), prefs(), true).presentation!;
  state.sessions = [
    { ...state.sessions[0], game: "music", presentation: p },
    state.sessions[1],
  ];
  const lines = sessionsCsv(state).split("\r\n");
  expect(lines[0]).toBe(
    "id,game,puzzleId,mode,attempt,startedAt,endedAt,activeMs,hints,undos,outcome,appVersion,contentVersion,source,presentation,timing,clock",
  );
  expect(lines[1]).toContain(
    '"' + JSON.stringify(p).replaceAll('"', '""') + '"',
  );
  expect(lines[2]).toMatch(/,""$/);
});
async function open(draft?: Draft, history = true) {
  const s = emptyState("play");
  s.preferences = { ...prefs(), history };
  if (draft) s.drafts.music = draft;
  await saveState(s);
  const user = userEvent.setup(),
    view = render(<App appRole="play" />);
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
it("actual music settings accumulate through reload and finalization while filed-session context cannot change", async () => {
  const { user, view } = await open();
  await user.click(screen.getByRole("button", { name: "By ear" }));
  await user.click(screen.getByRole("button", { name: "Slower" }));
  await user.click(screen.getByRole("checkbox", { name: "Sound" }));
  fireEvent.change(screen.getByRole("slider", { name: "Music volume" }), {
    target: { value: "0" },
  });
  const before = (await saved()).drafts.music!;
  expect(before.presentation?.coverage).toBe("from-start");
  expect(before.presentation?.music?.views).toEqual(["ear", "staff"]);
  expect(before.presentation?.music?.soundSettings).toEqual([false, true]);
  view.unmount();
  render(<App appRole="play" />);
  await user.click(await screen.findByRole("button", { name: /^Music Name the piece/ }));
  fireEvent.click(
    await screen.findByRole("tab", { name: "Earlier exercises" }),
  );
  expect((await saved()).drafts.music?.presentation).toEqual(
    before.presentation,
  );
  await user.click(screen.getByRole("button", { name: "Complete the phrase" }));
  const phrase = (await saved()).drafts.music!;
  expect(phrase.presentation?.music?.views).toEqual(["ear"]);
  expect(phrase.presentation?.coverage).toBe("from-start");
  const filed = (await saved()).sessions[0];
  expect(filed.presentation).toEqual(before.presentation);
  await user.click(screen.getByRole("button", { name: "Note pattern" }));
  expect((await saved()).sessions[0]).toEqual(filed);
});
it("enabling history mid-puzzle records partial context and disabling it removes optional draft context", async () => {
  const { user } = await open(undefined, false);
  await user.click(screen.getByRole("button", { name: "By ear" }));
  expect((await saved()).drafts.music).not.toHaveProperty("presentation");
  await user.click(screen.getByRole("button", { name: "Settings" }));
  await user.click(
    screen.getByRole("checkbox", {
      name: "Keep activity history on this device",
    }),
  );
  await user.click(screen.getByRole("button", { name: "Back to games" }));
  await user.click(screen.getByRole("button", { name: /^Music Name the piece/ }));
  fireEvent.click(
    await screen.findByRole("tab", { name: "Earlier exercises" }),
  );
  expect((await saved()).drafts.music?.presentation?.coverage).toBe("partial");
  await user.click(screen.getByRole("button", { name: "Settings" }));
  await user.click(
    screen.getByRole("checkbox", {
      name: "Keep activity history on this device",
    }),
  );
  const state = await saved();
  expect(state.drafts.music?.presentation).toBeUndefined();
  expect(state.sessions).toEqual([]);
});
it("legacy music starts partial and non-music context excludes every sound setting", async () => {
  const { user } = await open(music());
  expect((await saved()).drafts.music?.presentation?.coverage).toBe("partial");
  await user.click(screen.getByRole("button", { name: "Back to games" }));
  await user.click(screen.getByRole("button", { name: /Numbers/ }));
  const p = (await saved()).drafts.sudoku?.presentation;
  expect(p?.coverage).toBe("from-start");
  expect(p).not.toHaveProperty("music");
});

it("clearing history also purges optional context/metrics in drafts and durable undo copies while retaining necessary progress", async () => {
  await clearRecovery("play");
  const state = fictionalReview();
  state.drafts.music = withTiming(
    observePresentation(
      { ...music(), activeMs: 100, hints: 2, undos: 3 },
      prefs(),
      true,
    ),
    prefs(),
    true,
  );
  const original = structuredClone(state),
    cleared = withoutRecordedHistory(state);
  expect(state).toEqual(original);
  expect(cleared.sessions).toEqual([]);
  expect(cleared.drafts.music).toMatchObject({
    id: music().id,
    data: music().data,
    activeMs: 0,
    hints: 0,
    undos: 0,
  });
  expect(cleared.drafts.music).not.toHaveProperty("presentation");
  expect(cleared.drafts.music).not.toHaveProperty("timing");
  await preserveRecovery(state);
  await clearRecoveryHistory("play");
  expect((await recoveryCopies("play"))[0].state).toEqual(cleared);
  await clearRecovery("play");
});
