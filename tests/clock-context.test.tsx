import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { App } from "../src/App";
import {
  ClockObserver,
  CLOCK_ALGORITHM,
  validClockObservation,
  resumeClockObservations,
  type ClockObservation,
} from "../src/storage/clock-context";
import { ActivityClock } from "../src/games/activity-clock";
import { withTiming, applyClock } from "../src/storage/timing";
import { withoutRecordedHistory } from "../src/storage/presentation";
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
  parseBackup,
  preserveRecovery,
  clearRecoveryHistory,
  clearRecovery,
  recoveryCopies,
} from "../src/storage/recovery";
import { fictionalReview } from "./fixtures/review";
import {
  contextKey,
  hasTimeIssue,
  summarizeContexts,
} from "../src/insights/review";
import { sessionTimeline, timelineExport } from "../src/insights/timeline";
import {
  clearAllPreparations,
  saveChoices,
  prepareSessions,
  readPreparation,
} from "../src/sharing/local";
const metadata: ClockObservation = {
  version: 1,
  algorithm: CLOCK_ALGORITHM,
  coverage: "from-start",
  timeZone: "America/New_York",
  timeZoneChanged: false,
  wallClockShift: false,
  observationGap: false,
};
const draft = (): Draft => ({
  id: "synthetic-clock-draft",
  game: "music",
  puzzleId: "music-studio-v1",
  mode: "piano",
  startedAt: "2026-10-11T12:00:00Z",
  activeMs: 0,
  hints: 0,
  undos: 0,
  data: { mode: "piano", notes: [], title: "Synthetic", solved: false },
});
beforeEach(async () => {
  await clearState("play");
  await clearRecovery("play");
  await clearAllPreparations();
});
afterEach(() => vi.restoreAllMocks());
it("checks forward/backward wall shifts, suspension gaps and zone changes without keeping raw readings", () => {
  const observer = new ClockObserver(0, 10000, "UTC");
  expect(observer.sample(1000, 11000, "UTC")).toMatchObject({
    changed: false,
    wallClockShift: false,
    observationGap: false,
  });
  expect(observer.sample(2000, 11100, "UTC").wallClockShift).toBe(false);
  expect(observer.sample(3000, 16000, "UTC").wallClockShift).toBe(true);
  expect(observer.sample(4000, 12000, "UTC").wallClockShift).toBe(true);
  expect(observer.sample(95000, 103000, "UTC")).toMatchObject({
    observationGap: true,
    wallClockShift: false,
  });
  expect(observer.sample(96000, 104000, "America/New_York")).toEqual({
    timeZone: "America/New_York",
    changed: true,
    wallClockShift: false,
    observationGap: false,
  });
  expect(observer.sample(97000, 250000, null)).toMatchObject({
    timeZone: null,
    wallClockShift: true,
    observationGap: true,
  });
});
it("a clock change during an idle interval still reaches the correct attempt without inflating active time", () => {
  let wall = 0;
  vi.spyOn(Date, "now").mockImplementation(() => wall);
  const c = new ActivityClock(0, true, new ClockObserver(0, 0));
  c.bind(0, { game: "music", id: draft().id });
  wall = 60000;
  c.drain(60000);
  wall = 61000;
  expect(c.drain(61000)).toBeNull();
  wall = 121000;
  const slice = c.drain(62000)!;
  expect(slice).toMatchObject({
    id: draft().id,
    activeMs: 0,
    pausedMs: 0,
    clock: { wallClockShift: true },
  });
  const s = emptyState("play");
  s.preferences.history = true;
  s.drafts.music = { ...draft(), clock: metadata };
  expect(applyClock(s, slice).drafts.music).toMatchObject({
    activeMs: 0,
    clock: { wallClockShift: true },
  });
  expect(applyClock(s, { ...slice, id: "other" })).toBe(s);
  expect(
    applyClock(
      { ...s, preferences: { ...s.preferences, history: false } },
      slice,
    ).drafts.music,
  ).toEqual(s.drafts.music);
});
it("validates strict optional clock fields while accepting old saves and rejects malformed backups", async () => {
  const s = fictionalReview();
  expect(() => validateState(s, "play")).not.toThrow();
  for (const bad of [
    null,
    [],
    { ...metadata, version: 2 },
    { ...metadata, algorithm: "verified" },
    { ...metadata, timeZone: undefined },
    { ...metadata, timeZone: "<script>" },
    { ...metadata, timeZone: "x".repeat(81) },
    { ...metadata, wallClockShift: "false" },
    { ...metadata, coverage: "verified" },
    { ...metadata, readings: [100] },
  ]) {
    expect(validClockObservation(bad)).toBe(false);
    const file = new File([], "synthetic-invalid-clock.json");
    Object.defineProperty(file, "text", {
      value: async () =>
        JSON.stringify({ ...s, sessions: [{ ...s.sessions[0], clock: bad }] }),
    });
    await expect(parseBackup(file, "play")).rejects.toThrow();
  }
  s.sessions[0].clock = metadata;
  s.drafts.music = { ...draft(), clock: metadata };
  expect(() => validateState(s, "play")).not.toThrow();
  expect(validClockObservation({ ...metadata, timeZone: null })).toBe(true);
  expect(() =>
    validateState(
      {
        ...s,
        drafts: {
          music: { ...draft(), clock: { ...metadata, observationGap: 1 } },
        },
      },
      "play",
    ),
  ).toThrow("Invalid draft");
});
it("keeps missing, partial, shifted and changed-zone contexts separate and exports original observations", () => {
  const old = fictionalReview().sessions[0];
  const records = [
    old,
    { ...old, id: "known", clock: metadata },
    {
      ...old,
      id: "partial",
      clock: { ...metadata, coverage: "partial" as const },
    },
    { ...old, id: "shift", clock: { ...metadata, wallClockShift: true } },
    { ...old, id: "zone", clock: { ...metadata, timeZoneChanged: true } },
  ];
  expect(new Set(records.map(contextKey)).size).toBe(5);
  expect(summarizeContexts(records)).toHaveLength(5);
  expect(hasTimeIssue(records[3])).toBe(true);
  const out = timelineExport(
    sessionTimeline(records, contextKey(records[1]), "active"),
    contextKey(records[1]),
  );
  expect(out.points[0].clock).toEqual(metadata);
  out.points[0].clock!.wallClockShift = true;
  expect(records[1].clock!.wallClockShift).toBe(false);
  const s = fictionalReview();
  s.sessions = records;
  expect(sessionsCsv(s)).toContain(
    JSON.stringify(metadata).replaceAll('"', '""'),
  );
});
it("reload and restore mark unfinished observations partial; finalized records and consent-off progress stay intact", async () => {
  const s = emptyState("play");
  s.preferences.history = true;
  s.drafts.music = { ...draft(), clock: metadata };
  s.sessions = [{ ...fictionalReview().sessions[0], clock: metadata }];
  const resumed = resumeClockObservations(s);
  expect(resumed.drafts.music?.clock?.coverage).toBe("partial");
  expect(resumed.sessions).toBe(s.sessions);
  expect(s.drafts.music?.clock?.coverage).toBe("from-start");
  const filed = { ...s.drafts.music!, finalized: true };
  expect(
    resumeClockObservations({ ...s, drafts: { music: filed } }).drafts.music,
  ).toBe(filed);
  await preserveRecovery(s);
  await clearRecoveryHistory("play");
  expect(
    (await recoveryCopies("play"))[0].state.drafts.music,
  ).not.toHaveProperty("clock");
  expect(withoutRecordedHistory(s).drafts.music).not.toHaveProperty("clock");
  expect(
    withTiming(s.drafts.music!, { ...s.preferences, history: false }),
  ).not.toHaveProperty("clock");
});
it("prepares exact clock context only for Insights, leaving Companion coarse summaries unchanged", async () => {
  const scope = {
    projectId: "synthetic-project",
    uid: "synthetic-play",
    familyId: "synthetic-family",
    subjectId: "synthetic-subject",
    role: "play" as const,
  };
  await saveChoices(scope, {
    trusted: true,
    insights: true,
    companion: true,
    future: false,
  });
  const s = { ...fictionalReview().sessions[0], clock: metadata };
  await prepareSessions(scope, [s], "explicit-history");
  const r = (await readPreparation(scope)).records;
  expect(r.find((x) => x.channel === "insights")?.payload).toMatchObject({
    clock: metadata,
  });
  expect(r.find((x) => x.channel === "companion")?.payload).not.toHaveProperty(
    "clock",
  );
});
it("actual app saves clock shifts, reloads partial drafts, and never rewrites a filed session", async () => {
  let mono = 0,
    wall = Date.parse("2026-10-11T12:00:00Z");
  vi.spyOn(performance, "now").mockImplementation(() => mono);
  vi.spyOn(Date, "now").mockImplementation(() => wall);
  const s = emptyState("play");
  s.preferences.history = true;
  s.preferences.welcomeDone = true;
  await saveState(s);
  const mounted = render(<App appRole="play" />);
  fireEvent.click(await screen.findByRole("button", { name: /^Music Name the piece/ }));
  fireEvent.click(
    await screen.findByRole("tab", { name: "Earlier exercises" }),
  );
  mono = 1000;
  wall += 6000;
  fireEvent.keyDown(document, { key: "Tab" });
  await waitFor(async () =>
    expect((await loadState("play")).drafts.music?.clock).toMatchObject({
      coverage: "from-start",
      wallClockShift: true,
    }),
  );
  mounted.unmount();
  render(<App appRole="play" />);
  fireEvent.click(await screen.findByRole("button", { name: /^Music Name the piece/ }));
  fireEvent.click(
    await screen.findByRole("tab", { name: "Earlier exercises" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Finish for now" }));
  await waitFor(async () =>
    expect((await loadState("play")).sessions[0].clock).toMatchObject({
      coverage: "partial",
      wallClockShift: true,
    }),
  );
  const finalized = (await loadState("play")).sessions[0];
  mono += 1000;
  wall -= 100000;
  fireEvent.keyDown(document, { key: "Tab" });
  await waitFor(async () =>
    expect((await loadState("play")).sessions[0]).toEqual(finalized),
  );
  cleanup();
});
