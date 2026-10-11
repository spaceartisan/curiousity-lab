import type { Timing } from "../src/storage/timing";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ActivityClock } from "../src/games/activity-clock";
import { App } from "../src/App";
import {
  emptyState,
  validateState,
  type Draft,
} from "../src/storage/contracts";
import {
  clearState,
  loadState,
  saveState,
  sessionsCsv,
} from "../src/storage/local";
import {
  TIME_ALGORITHM,
  withTiming,
  validTiming,
  applyClock,
} from "../src/storage/timing";
import { withoutRecordedHistory } from "../src/storage/presentation";
import { fictionalReview } from "./fixtures/review";
import { contextKey, summarizeContexts } from "../src/insights/review";
const a = { game: "music" as const, id: "fictional-a" },
  b = { ...a, id: "fictional-b" };
const metadata: Timing = {
  version: 1 as const,
  algorithm: TIME_ALGORITHM,
  coverage: "from-start" as const,
  pausedMs: 0,
};
const draft = (): Draft => ({
  ...a,
  puzzleId: "music-studio-v1",
  mode: "piano",
  startedAt: "2026-10-11T00:00:00Z",
  activeMs: 0,
  hints: 0,
  undos: 0,
  data: { mode: "piano", notes: [], title: "Fictional", solved: false },
});
beforeEach(async () => {
  await clearState("play");
});
afterEach(() => vi.restoreAllMocks());
it("drains the final fraction once and tags the original attempt before switching", () => {
  const c = new ActivityClock(0);
  expect(c.bind(100, a)).toBeNull();
  expect(c.bind(223.5, b)).toEqual({ ...a, activeMs: 123.5, pausedMs: 0 });
  expect(c.drain(250)).toEqual({ ...b, activeMs: 26.5, pausedMs: 0 });
  expect(c.drain(250)).toBeNull();
  expect(c.bind(300, null)?.id).toBe(b.id);
  expect(c.drain(999)).toBeNull();
});
it("an input after idle closes the old interval before extending the cutoff", () => {
  const c = new ActivityClock(0);
  c.bind(0, a);
  expect(c.onInput(120000)?.activeMs).toBe(60000);
  expect(c.drain(120100)?.activeMs).toBe(100);
  expect(c.drain(180200)?.activeMs).toBe(59900);
  expect(c.drain(190000)).toBeNull();
});
it("explicit pauses count only foreground time, resume starts a fresh idle window", () => {
  const c = new ActivityClock(0);
  c.bind(0, a);
  expect(c.bind(500, a, true)?.activeMs).toBe(500);
  expect(c.onVisibility(1500, false)?.pausedMs).toBe(1000);
  expect(c.onVisibility(100000, true)).toBeNull();
  expect(c.bind(100250, a, false)?.pausedMs).toBe(250);
  expect(c.drain(100300)?.activeMs).toBe(50);
});
it("hidden open and backward monotonic samples never accrue hidden or negative duration", () => {
  const c = new ActivityClock(0, false);
  c.bind(0, a);
  expect(c.drain(1000)).toBeNull();
  expect(c.onVisibility(2000, true)).toBeNull();
  expect(c.drain(2100)?.activeMs).toBe(100);
  expect(c.drain(2050)).toBeNull();
  expect(c.drain(2200)?.activeMs).toBe(100);
});
it("slices cannot leak into another or finalized attempt or a history-off draft", () => {
  const s = emptyState("play");
  s.preferences.history = true;
  s.drafts.music = draft();
  const slice = { ...a, activeMs: 123.5, pausedMs: 250 };
  expect(applyClock(s, { ...slice, id: b.id })).toBe(s);
  const next = applyClock(s, slice);
  expect(next.drafts.music?.timing).toEqual({
    ...metadata,
    coverage: "partial",
    pausedMs: 250,
  });
  expect(next.drafts.music?.activeMs).toBe(123.5);
  expect(s.drafts.music?.activeMs).toBe(0);
  const final = { ...s, drafts: { music: { ...draft(), finalized: true } } };
  expect(applyClock(final, slice)).toBe(final);
  const off = { ...s, preferences: { ...s.preferences, history: false } };
  expect(applyClock(off, slice)).toBe(off);
  expect(withTiming(draft(), s.preferences, true).timing?.coverage).toBe(
    "from-start",
  );
});
it("validates bounded timing metadata in sessions and drafts with legacy compatibility", () => {
  for (const bad of [
    null,
    [],
    { ...metadata, version: 2 },
    { ...metadata, algorithm: "guess" },
    { ...metadata, coverage: "unknown" },
    { ...metadata, pausedMs: -1 },
    { ...metadata, pausedMs: Infinity },
    { ...metadata, pausedMs: "0" },
    { ...metadata, input: "private" },
  ])
    expect(validTiming(bad)).toBe(false);
  const s = fictionalReview();
  expect(() => validateState(s, "play")).not.toThrow();
  s.sessions[0].timing = metadata;
  s.drafts.music = { ...draft(), timing: metadata };
  expect(() => validateState(s, "play")).not.toThrow();
  s.drafts.music!.timing = { ...metadata, pausedMs: -1 };
  expect(() => validateState(s, "play")).toThrow("Invalid draft");
  s.drafts = {};
  s.sessions[0].timing = { ...metadata, pausedMs: -1 };
  expect(() => validateState(s, "play")).toThrow("Invalid session");
});
it("review separates unknown and partial timing, aggregates observed pause values without grouping by outcome", () => {
  const original = fictionalReview().sessions[0],
    known = { ...original, timing: { ...metadata, pausedMs: 30000 } };
  const records = [
    known,
    { ...known, id: "other", timing: { ...metadata, pausedMs: 60000 } },
    {
      ...known,
      id: "partial",
      timing: { ...metadata, coverage: "partial" as const },
    },
    { ...original, id: "legacy" },
  ];
  expect(contextKey(records[0])).toBe(contextKey(records[1]));
  const groups = summarizeContexts(records);
  expect(groups).toHaveLength(3);
  expect(groups.find((s) => s.n === 2)).toMatchObject({
    pauseRecords: 2,
    pausedMinutesRange: [0.5, 1],
  });
  expect(
    groups.find((s) => s.label.includes("Pause timing unrecorded")),
  ).toMatchObject({ pauseRecords: 0, pausedMinutesRange: null });
  expect(
    summarizeContexts([
      { ...known, timing: { ...metadata, pausedMs: 190000 } },
    ])[0].timeIssues,
  ).toBe(1);
});
it("CSV preserves exact timing with unknown blank and clearing history removes optional timing", () => {
  const s = fictionalReview();
  s.sessions = [{ ...s.sessions[0], timing: metadata }, s.sessions[1]];
  s.drafts.music = { ...draft(), timing: metadata, activeMs: 100 };
  const lines = sessionsCsv(s).split("\r\n");
  expect(lines[0]).toMatch(/presentation,timing,clock$/);
  expect(lines[1]).toContain(JSON.stringify(metadata).replaceAll('"', '""'));
  expect(lines[2]).toMatch(/,""$/);
  expect(withoutRecordedHistory(s).drafts.music).not.toHaveProperty("timing");
  expect(
    withTiming(s.drafts.music!, { ...s.preferences, history: false }),
  ).not.toHaveProperty("timing");
});
async function open(legacy = false) {
  let now = 0;
  vi.spyOn(performance, "now").mockImplementation(() => now);
  const s = emptyState("play");
  s.preferences.history = true;
  s.preferences.welcomeDone = true;
  if (legacy) s.drafts.music = { ...draft(), activeMs: 500 };
  await saveState(s);
  render(<App appRole="play" />);
  fireEvent.click(await screen.findByRole("button", { name: /^Music Name the piece/ }));
  fireEvent.click(
    await screen.findByRole("tab", { name: "Earlier exercises" }),
  );
  return (t: number) => {
    now = t;
  };
}
it("the real pause and finish controls preserve exact fractions and finalized records stay unchanged", async () => {
  const time = await open();
  time(123.5);
  fireEvent.click(screen.getByRole("button", { name: "Pause" }));
  time(400.5);
  fireEvent.click(screen.getAllByRole("button", { name: "Resume" })[1]);
  time(555.5);
  fireEvent.click(screen.getByRole("button", { name: "Finish for now" }));
  await waitFor(async () =>
    expect((await loadState("play")).sessions[0]).toMatchObject({
      activeMs: 279,
      timing: { ...metadata, pausedMs: 277 },
    }),
  );
  const final = (await loadState("play")).sessions[0];
  time(90000);
  fireEvent.keyDown(document, { key: "Tab" });
  await waitFor(async () =>
    expect((await loadState("play")).sessions[0]).toEqual(final),
  );
});
it("the real input handler excludes idle gaps and legacy drafts retain partial coverage", async () => {
  const time = await open(true);
  time(120000);
  fireEvent.keyDown(document, { key: "Tab" });
  time(120100);
  fireEvent.click(screen.getByRole("button", { name: "Finish for now" }));
  await waitFor(async () =>
    expect((await loadState("play")).sessions[0]).toMatchObject({
      activeMs: 60600,
      timing: { ...metadata, coverage: "partial" },
    }),
  );
});
it("pagehide flush queues after input timing and saves the remaining fraction exactly once", async () => {
  const time = await open();
  time(150.5);
  fireEvent.keyDown(document, { key: "Tab" });
  time(200.5);
  fireEvent(window, new Event("pagehide"));
  await waitFor(async () =>
    expect((await loadState("play")).drafts.music?.activeMs).toBe(200.5),
  );
  fireEvent(window, new Event("pagehide"));
  await waitFor(async () =>
    expect((await loadState("play")).drafts.music?.activeMs).toBe(200.5),
  );
});
