import { beforeEach, expect, it } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../src/App";
import {
  emptyState,
  validateState,
  type Draft,
} from "../src/storage/contracts";
import {
  observeInput,
  observePresentation,
  presentationKey,
  presentationLabel,
  validPresentation,
  withoutRecordedHistory,
} from "../src/storage/presentation";
import {
  clearState,
  saveState,
  loadState,
  sessionsCsv,
} from "../src/storage/local";
import { contextKey } from "../src/insights/review";
import { fictionalReview } from "./fixtures/review";
const prefs = {
  ...emptyState("play").preferences,
  history: true,
  welcomeDone: true,
};
const draft = (): Draft => ({
  id: "fictional-input",
  game: "music",
  puzzleId: "music-studio-v1",
  mode: "piano",
  startedAt: "2026-10-11T00:00:00Z",
  activeMs: 0,
  hints: 0,
  undos: 0,
  data: { mode: "piano", notes: [], title: "Fictional melody", solved: false },
});
beforeEach(async () => {
  await clearState("play");
});
it("bounds observed categories, preserves start coverage and never mutates source observations", () => {
  const start = observePresentation(draft(), prefs, true),
    original = structuredClone(start);
  let next = start;
  for (const method of [
    "touch",
    "mouse",
    "touch",
    "pen",
    "keyboard",
    "unknown",
  ])
    next = observeInput(next, prefs, method);
  expect(start).toEqual(original);
  expect(next.presentation?.input).toEqual({
    version: 1,
    coverage: "from-start",
    methods: ["keyboard", "mouse", "pen", "touch"],
  });
  expect(observeInput(next, prefs, "touch")).toBe(next);
  expect(observeInput(next, prefs, "unknown")).toBe(next);
  expect(
    observePresentation(next, { ...prefs, theme: "dark" }).presentation?.input,
  ).toEqual(next.presentation?.input);
});
it("keeps legacy unknown distinct from partial, empty and mixed observations", () => {
  const p = observePresentation(draft(), prefs, true).presentation!;
  const { input: _input, ...legacy } = p;
  expect(validPresentation(legacy, "music")).toBe(true);
  expect(presentationLabel(legacy)).toContain("input methods unrecorded");
  const partial = observeInput(
    { ...draft(), presentation: legacy },
    prefs,
    "touch",
  ).presentation!;
  expect(partial.input?.coverage).toBe("partial");
  const mixed = observeInput(
    observeInput({ ...draft(), presentation: p }, prefs, "touch"),
    prefs,
    "keyboard",
  ).presentation!;
  expect(presentationKey(mixed)).toBe(
    presentationKey({
      ...mixed,
      input: { ...mixed.input!, methods: [...mixed.input!.methods].reverse() },
    }),
  );
  const session = fictionalReview().sessions[0];
  expect(
    new Set(
      [legacy, p, partial, mixed].map((presentation) =>
        contextKey({ ...session, game: "music", presentation }),
      ),
    ).size,
  ).toBe(4);
});
it("rejects fingerprints, unknown categories, duplicates and unbounded/private payloads", () => {
  const p = observePresentation(draft(), prefs, true).presentation!;
  for (const input of [
    null,
    [],
    { ...p.input, version: 2 },
    { ...p.input, coverage: "guessed" },
    { ...p.input, methods: ["stylus"] },
    { ...p.input, methods: ["touch", "touch"] },
    { ...p.input, methods: "mouse" },
    { ...p.input, device: "fingerprint" },
    { ...p.input, key: "private" },
  ])
    expect(validPresentation({ ...p, input }, "music")).toBe(false);
});
it("requires history consent, preserves finalized attempts, and clears categories with history", () => {
  const d = observeInput(draft(), prefs, "touch"),
    final = { ...d, finalized: true };
  expect(observeInput(final, prefs, "keyboard")).toBe(final);
  expect(
    observeInput(draft(), { ...prefs, history: false }, "touch"),
  ).not.toHaveProperty("presentation");
  const state = emptyState("play");
  state.drafts.music = d;
  expect(withoutRecordedHistory(state).drafts.music).not.toHaveProperty(
    "presentation",
  );
});
it("round-trips categories through validated JSON and exact quoted CSV", () => {
  const state = fictionalReview(),
    d = observeInput(observePresentation(draft(), prefs, true), prefs, "pen");
  state.drafts.music = d;
  state.sessions[0] = {
    ...state.sessions[0],
    game: "music",
    presentation: d.presentation,
  };
  const copy = JSON.parse(JSON.stringify(state));
  validateState(copy, "play");
  expect(copy).toEqual(state);
  expect(sessionsCsv(copy)).toContain(
    JSON.stringify(d.presentation).replaceAll('"', '""'),
  );
});
it("actual game controls record keyboard without logging settings, pause controls or filed attempts", async () => {
  const state = emptyState("play");
  state.preferences = prefs;
  await saveState(state);
  const user = userEvent.setup(),
    view = render(<App appRole="play" />);
  await user.click(await screen.findByRole("button", { name: /Music Hear/ }));
  fireEvent.click(
    await screen.findByRole("tab", { name: "Earlier exercises" }),
  );
  const button = screen.getByRole("button", { name: "Play C" });
  fireEvent.keyDown(button, { key: "Control" });
  fireEvent.keyDown(button, { key: "l", ctrlKey: true });
  await waitFor(async () =>
    expect(
      (await loadState("play")).drafts.music?.presentation?.input?.methods,
    ).toEqual([]),
  );
  fireEvent.keyDown(button, { key: "Tab" });
  await waitFor(async () =>
    expect(
      (await loadState("play")).drafts.music?.presentation?.input?.methods,
    ).toEqual(["keyboard"]),
  );
  await user.click(screen.getByRole("button", { name: "Pause" }));
  fireEvent.keyDown(screen.getAllByRole("button", { name: "Resume" })[1], {
    key: "Enter",
  });
  await user.click(screen.getAllByRole("button", { name: "Resume" })[1]);
  await user.click(screen.getByRole("button", { name: "Finish for now" }));
  await waitFor(async () =>
    expect((await loadState("play")).sessions).toHaveLength(1),
  );
  const filed = (await loadState("play")).sessions[0];
  expect(filed.presentation?.input?.methods).toEqual(["keyboard"]);
  await user.click(screen.getByRole("button", { name: /Music Hear/ }));
  fireEvent.click(
    await screen.findByRole("tab", { name: "Earlier exercises" }),
  );
  fireEvent.keyDown(screen.getByRole("button", { name: "Play C" }), {
    key: "Tab",
  });
  expect((await loadState("play")).sessions[0]).toEqual(filed);
  view.unmount();
});
