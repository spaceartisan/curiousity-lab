import { beforeEach, expect, it, vi } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../src/App";
import {
  selectCreations,
  latestNotebookVisit,
} from "../src/creations/collection";
import {
  emptyState,
  validateState,
  type Creation,
} from "../src/storage/contracts";
import { clearState, loadState, saveState } from "../src/storage/local";
import { parseBackup } from "../src/storage/recovery";
import { playNotes, stopAudio, setAudioVolume } from "../src/games/audio";
vi.mock("../src/games/audio", () => ({
  playNotes: vi.fn(() => Promise.resolve()),
  stopAudio: vi.fn(),
  setAudioVolume: vi.fn(),
  tone: vi.fn(),
}));
function page(
  id: string,
  title = "Branching page",
  savedAt = "2026-10-10T00:00:00Z",
): Creation {
  return {
    id,
    kind: "notebook",
    title,
    savedAt,
    specimenId: "phil-26402-r1",
    text: "Fictional branches\nA second line",
    observations: ["Filaments"],
  };
}
const melody: Creation = {
  id: "melody",
  kind: "melody",
  title: "A quiet tune",
  savedAt: "2026-10-10T02:00:00Z",
  notes: [0, 2, 4],
};
beforeEach(async () => {
  await clearState("play");
  vi.clearAllMocks();
  vi.mocked(window.confirm).mockReturnValue(true);
});
async function open(creations: Creation[]) {
  const state = emptyState("play");
  state.preferences.welcomeDone = true;
  state.creations = creations;
  await saveState(state);
  const view = render(<App appRole="play" />);
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: /My Creations/ }));
  return { user, view };
}
async function saved() {
  await waitFor(() =>
    expect(screen.getByText("Saved on this device")).toBeInTheDocument(),
  );
  return loadState("play");
}
it("collection filtering searches names, notes, observations and source titles without mutating entries", () => {
  const original = [
    page("old"),
    melody,
    page("new", "New page", "2026-10-10T03:00:00Z"),
  ];
  const before = JSON.stringify(original);
  expect(selectCreations(original, "all").map((c) => c.id)).toEqual([
    "new",
    "melody",
    "old",
  ]);
  expect(
    selectCreations(original, "notebook", "filaments").map((c) => c.id),
  ).toEqual(["new", "old"]);
  expect(selectCreations(original, "notebook", "ｆｕｎｇａｌ")).toHaveLength(2);
  expect(selectCreations(original, "notebook", "second line")).toHaveLength(2);
  expect(selectCreations(original, "melody", "quiet")[0].id).toBe("melody");
  expect(
    selectCreations(original, "all", "", "earlier").map((c) => c.id),
  ).toEqual(["old", "melody", "new"]);
  expect(JSON.stringify(original)).toBe(before);
});
it("continuity uses explicit notebook reopens, never mere saves or future timestamps", () => {
  const entries = [
    page("save-only"),
    { ...page("visited"), lastViewedAt: "2026-10-10T01:00:00Z" },
    { ...page("future"), lastViewedAt: "2026-10-11T00:00:00Z" },
    { ...melody, lastViewedAt: "2026-10-10T04:00:00Z" },
  ];
  expect(
    latestNotebookVisit(
      entries,
      "phil-26402-r1",
      Date.parse("2026-10-10T05:00:00Z"),
    ),
  ).toBe("2026-10-10T01:00:00Z");
  expect(
    latestNotebookVisit([page("only-save")], "phil-26402-r1"),
  ).toBeUndefined();
  expect(latestNotebookVisit(entries, "missing-source")).toBeUndefined();
});
it("legacy creations stay valid and malformed new timestamps reject safely", () => {
  const state = emptyState("play");
  state.creations = [page("legacy"), melody];
  expect(() => validateState(state, "play")).not.toThrow();
  for (const lastViewedAt of ["not-a-date", 123, null]) {
    const invalid = { ...state, creations: [{ ...page("bad"), lastViewedAt }] };
    expect(() => validateState(invalid, "play")).toThrow("Invalid creation");
  }
  const current = {
    ...state,
    creations: [{ ...page("new"), lastViewedAt: "2026-10-10T01:00:00Z" }],
  };
  expect(() => validateState(current, "play")).not.toThrow();
});
it("laboratory opens the dedicated notebook directly, and home creations resets to all kinds", async () => {
  const { user } = await open([page("page"), melody]);
  await user.click(screen.getByRole("button", { name: "Back to games" }));
  await user.click(screen.getByRole("button", { name: /My Laboratory/ }));
  await user.click(screen.getByRole("button", { name: "Open Lab Notebook" }));
  expect(
    screen.getByRole("heading", { name: "My Lab Notebook" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("article", { name: "A quiet tune" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Back to games" }));
  await user.click(screen.getByRole("button", { name: /My Creations/ }));
  expect(
    screen.getByRole("article", { name: "A quiet tune" }),
  ).toBeInTheDocument();
});
it("search/filter empty states and unknown assets keep old notes readable and intact", async () => {
  const unavailable = {
    ...page("unknown", "Old source"),
    specimenId: "archived-image",
    text: "Preserved old thought",
  };
  const { user } = await open([page("known"), unavailable, melody]);
  await user.click(screen.getByRole("button", { name: "Lab Notebook" }));
  expect(screen.getByText("Preserved old thought")).toBeInTheDocument();
  expect(screen.getAllByRole("img")).toHaveLength(1);
  const unknown = screen.getByRole("article", { name: "Old source" });
  expect(
    within(unknown).queryByRole("button", { name: "Revisit specimen" }),
  ).not.toBeInTheDocument();
  await user.type(
    screen.getByRole("searchbox", { name: "Find a saved creation" }),
    "no matching note",
  );
  expect(
    screen.getByRole("heading", { name: "No matching creations" }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Clear search" }));
  expect(screen.getByText("Preserved old thought")).toBeInTheDocument();
  expect((await saved()).creations).toHaveLength(3);
});
it("revisit records only its last-opened time, preserves original saved data and produces truthful slide continuity", async () => {
  const original = page("legacy");
  const { user, view } = await open([original, melody]);
  await user.click(screen.getByRole("button", { name: "Lab Notebook" }));
  await user.click(screen.getByRole("button", { name: "Revisit specimen" }));
  expect(
    screen.getByText(/You reopened a notebook page for this slide just now/),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("textbox", { name: "Your notebook note" }),
  ).toHaveValue(original.text);
  const state = await saved();
  const entry = state.creations.find((c) => c.id === original.id)!;
  expect(entry.savedAt).toBe(original.savedAt);
  expect(entry.text).toBe(original.text);
  expect(entry.id).toBe(original.id);
  expect(Number.isFinite(Date.parse(entry.lastViewedAt!))).toBe(true);
  expect(state.sessions).toHaveLength(0);
  expect(
    state.creations.find((c) => c.id === melody.id)?.lastViewedAt,
  ).toBeUndefined();
  view.unmount();
  render(<App appRole="play" />);
  await user.click(
    await screen.findByRole("button", { name: /My Laboratory/ }),
  );
  expect(
    screen.getByText(/You reopened a notebook page for this slide/),
  ).toBeInTheDocument();
});
it("pagination and deletion remove only the selected creation and clamp the remaining page", async () => {
  const creations = Array.from({ length: 13 }, (_, i) =>
    page(
      `page-${i}`,
      `Page ${i}`,
      new Date(Date.UTC(2026, 9, 10, 0, i)).toISOString(),
    ),
  );
  const { user } = await open(creations);
  expect(screen.getAllByRole("article")).toHaveLength(12);
  await user.click(screen.getByRole("button", { name: "Next page" }));
  expect(screen.getAllByRole("article")).toHaveLength(1);
  vi.mocked(window.confirm).mockReturnValueOnce(false);
  await user.click(screen.getByRole("button", { name: "Remove" }));
  expect(screen.getByRole("article", { name: "Page 0" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Remove" }));
  expect(screen.getAllByRole("article")).toHaveLength(12);
  expect(
    screen.queryByRole("button", { name: "Next page" }),
  ).not.toBeInTheDocument();
  const state = await saved();
  expect(state.creations).toHaveLength(12);
  expect(state.creations.some((c) => c.id === "page-0")).toBe(false);
});
it("melody controls never autoplay; deliberate hear uses current volume and Stop/off cancel", async () => {
  const { user } = await open([melody]);
  expect(playNotes).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Hear it again" }));
  expect(playNotes).not.toHaveBeenCalled();
  await user.click(screen.getByRole("checkbox", { name: "Sound" }));
  expect(playNotes).not.toHaveBeenCalled();
  fireEvent.change(screen.getByRole("slider", { name: "Music volume" }), {
    target: { value: "0.73" },
  });
  expect(setAudioVolume).toHaveBeenLastCalledWith(0.73);
  await user.click(screen.getByRole("button", { name: "Hear it again" }));
  expect(playNotes).toHaveBeenCalledWith([0, 2, 4], 0.73);
  const before = vi.mocked(stopAudio).mock.calls.length;
  await user.click(screen.getByRole("button", { name: "Stop playback" }));
  expect(vi.mocked(stopAudio).mock.calls.length).toBeGreaterThan(before);
  await user.click(screen.getByRole("checkbox", { name: "Sound" }));
  expect((await saved()).preferences.sound).toBe(false);
});
it("schema-v1 JSON recovery round-trips notebook reopen metadata without adding activity history", async () => {
  const state = emptyState("play");
  state.creations = [{ ...page("old"), lastViewedAt: "2026-10-10T01:00:00Z" }];
  const file = {
    size: JSON.stringify(state).length,
    text: async () => JSON.stringify(state),
  } as File;
  const imported = await parseBackup(file, "play");
  expect(imported.creations).toEqual(state.creations);
  expect(imported.sessions).toEqual([]);
});
