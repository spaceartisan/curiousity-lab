import { beforeEach, expect, it } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../src/App";
import { specimens } from "../src/content/specimens";
import { validLabViews } from "../src/content/lab-views";
import {
  blankLabPage,
  selectLabSlide,
  savedLabViews,
} from "../src/content/laboratory";
import { emptyState, validateState } from "../src/storage/contracts";
import { validateGame } from "../src/storage/validate-game";
import { clearState, loadState, saveState } from "../src/storage/local";
import { selectCreations } from "../src/creations/collection";
import type { LabData } from "../src/content/laboratory";
const preset = { id: "first", name: "Branch tips", zoom: 2, pan: [10, -5] };
beforeEach(async () => {
  await clearState("play");
});
async function open(history = false) {
  const s = emptyState("play");
  s.preferences.welcomeDone = true;
  s.preferences.history = history;
  await saveState(s);
  const user = userEvent.setup(),
    view = render(<App appRole="play" />);
  await user.click(
    await screen.findByRole("button", { name: /My Laboratory/ }),
  );
  fireEvent.click(
    await screen.findByRole("tab", { name: "Microscope & notebook" }),
  );
  await user.click(screen.getByRole("button", { name: "Explore Microscope" }));
  await user.click(screen.getByText(/^Saved microscope views/));
  return { user, view };
}
async function saved() {
  await waitFor(() =>
    expect(screen.getByText("Saved on this device")).toBeInTheDocument(),
  );
  return loadState("play");
}
async function add(
  user: ReturnType<typeof userEvent.setup>,
  name = "Branch tips",
) {
  await user.clear(screen.getByRole("textbox", { name: "View name" }));
  await user.type(screen.getByRole("textbox", { name: "View name" }), name);
  await user.click(screen.getByRole("button", { name: "Save current view" }));
}
it("optional view contracts preserve old saves and reject malformed, oversized, duplicate, non-finite and wrong-kind records in active pages, slide pages and notebooks", () => {
  const data = { ...blankLabPage(0), stage: "microscope" as const };
  expect(validateGame("lab", data)).toBe(true);
  expect(validLabViews([preset])).toBe(true);
  const bad = [
    null,
    {},
    Array(7).fill(preset),
    [preset, preset],
    ...[
      { id: "" },
      { name: " " },
      { name: "a".repeat(81) },
      { zoom: NaN },
      { zoom: 0 },
      { pan: [36, 0] },
      { pan: [0, Infinity] },
      { pan: [0] },
      { recording: "private" },
    ].map((p) => [{ ...preset, ...p }]),
  ];
  for (const views of bad) {
    expect(validLabViews(views)).toBe(false);
    expect(validateGame("lab", { ...data, views })).toBe(false);
    expect(
      validateGame("lab", { ...data, pages: [{ ...blankLabPage(1), views }] }),
    ).toBe(false);
    const s = emptyState("play");
    s.creations = [
      {
        id: "note",
        kind: "notebook",
        title: "",
        savedAt: "2026-10-10T00:00:00Z",
        views: views as never,
      },
    ];
    expect(() => validateState(s, "play")).toThrow();
  }
  const s = emptyState("play");
  s.creations = [
    {
      id: "note",
      kind: "notebook",
      title: "",
      savedAt: "2026-10-10T00:00:00Z",
      views: [preset],
    },
  ];
  expect(() => validateState(s, "play")).not.toThrow();
  s.creations[0].kind = "melody";
  expect(() => validateState(s, "play")).toThrow();
});
it("presets remain bound to their slide and returned presets do not alias saved pan arrays", () => {
  const original: LabData = {
    ...blankLabPage(0),
    views: [preset],
    stage: "microscope",
    workflowRevision: 1,
  };
  const second = selectLabSlide(original, 1, "explorer", "microscope");
  expect(second.views).toBeUndefined();
  const first = selectLabSlide(
    { ...second, views: [{ ...preset, id: "other", name: "Cells" }] },
    0,
    "explorer",
    "microscope",
  );
  expect(first.views).toEqual([preset]);
  const copy = savedLabViews(first, 0);
  copy.views![0].pan[0] = 30;
  expect(first.views![0].pan[0]).toBe(10);
  expect(savedLabViews(first, 1).views![0].name).toBe("Cells");
  expect(savedLabViews(undefined, 0)).toEqual({});
});
it("actual zoom/pan presets reopen across history-off reload, slide switching and removal undo without optional history", async () => {
  const { user, view } = await open();
  await user.click(screen.getByRole("button", { name: "Zoom in" }));
  await user.click(screen.getByRole("button", { name: "Move right" }));
  await add(user);
  await user.click(screen.getByRole("button", { name: "Reset view" }));
  await user.click(
    screen.getByRole("button", { name: "Open saved view 1: Branch tips" }),
  );
  let d = (await saved()).drafts.lab?.data as LabData;
  expect(d.zoom).toBe(1.25);
  expect(d.pan).toEqual([5, 0]);
  const id = d.views![0].id;
  await user.click(screen.getByRole("button", { name: "Next specimen" }));
  expect(
    screen.queryByRole("button", { name: "Open saved view 1: Branch tips" }),
  ).not.toBeInTheDocument();
  for (let i = 1; i < specimens.length; i++)
    await user.click(screen.getByRole("button", { name: "Next specimen" }));
  await user.click(screen.getByText(/^Saved microscope views/));
  expect(
    screen.getByRole("button", { name: "Open saved view 1: Branch tips" }),
  ).toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: "Remove saved view 1: Branch tips" }),
  );
  await user.click(screen.getByRole("button", { name: "Undo view removal" }));
  expect(((await saved()).drafts.lab!.data as LabData).views![0].id).toBe(id);
  view.unmount();
  render(<App appRole="play" />);
  await user.click(
    await screen.findByRole("button", { name: /My Laboratory/ }),
  );
  fireEvent.click(
    await screen.findByRole("tab", { name: "Microscope & notebook" }),
  );
  await user.click(screen.getByText(/^Saved microscope views/));
  expect(
    screen.getByRole("button", { name: "Open saved view 1: Branch tips" }),
  ).toBeInTheDocument();
  const s = await saved();
  expect(s.sessions).toHaveLength(0);
  expect(s.drafts.lab?.hints).toBe(0);
  expect(s.drafts.lab?.activeMs).toBe(0);
});
it("six-preset cap, notebook search/reopen, immutable saved snapshots and same-slide new exploration preserve the authored views", async () => {
  const { user } = await open(true);
  for (let i = 0; i < 6; i++)
    await add(user, i === 0 ? "Branch tips" : `View ${i + 1}`);
  await user.type(
    screen.getByRole("textbox", { name: "View name" }),
    "Seventh",
  );
  expect(
    screen.getByRole("button", { name: "Save current view" }),
  ).toBeDisabled();
  await user.click(
    screen.getByRole("button", { name: "Save to Lab Notebook" }),
  );
  const first = await saved(),
    entry = first.creations[0],
    session = first.sessions.find((s) => s.outcome === "explored")!;
  expect(entry.views).toHaveLength(6);
  expect(selectCreations(first.creations, "notebook", "branch tips")).toEqual([
    entry,
  ]);
  await user.click(
    screen.getByRole("button", { name: "Remove saved view 1: Branch tips" }),
  );
  expect((await saved()).creations[0]).toEqual(entry);
  expect((await saved()).sessions.find((s) => s.id === session.id)).toEqual(
    session,
  );
  await user.click(
    screen.getByRole("button", { name: "Explore this slide again" }),
  );
  expect(((await saved()).drafts.lab!.data as LabData).views).toHaveLength(5);
  await user.click(screen.getByRole("button", { name: "Open Lab Notebook" }));
  await user.click(screen.getByRole("button", { name: "Revisit specimen" }));
  await user.click(screen.getByText(/^Saved microscope views/));
  expect(
    screen.getByRole("button", { name: "Open saved view 1: Branch tips" }),
  ).toBeInTheDocument();
  expect(((await saved()).drafts.lab!.data as LabData).views).toEqual(
    entry.views,
  );
  expect((await saved()).creations[0].savedAt).toBe(entry.savedAt);
});
