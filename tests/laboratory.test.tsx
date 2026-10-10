import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../src/App";
import { emptyState, validateState } from "../src/storage/contracts";
import { clearState, saveState, loadState } from "../src/storage/local";
import { validateGame } from "../src/storage/validate-game";
import {
  blankLabPage,
  selectLabSlide,
  labMode,
  labPuzzle,
  labWorkflows,
  type LabData,
} from "../src/content/laboratory";
import { specimens } from "../src/content/specimens";
beforeEach(async () => {
  await clearState("play");
});
async function start(history = false) {
  const state = emptyState("play");
  state.preferences.welcomeDone = true;
  state.preferences.history = history;
  await saveState(state);
  const view = render(<App appRole="play" />);
  const user = userEvent.setup();
  await user.click(
    await screen.findByRole("button", { name: /My Laboratory/ }),
  );
  return { user, view };
}
async function saved() {
  await waitFor(() =>
    expect(screen.getByText("Saved on this device")).toBeInTheDocument(),
  );
  return loadState("play");
}
describe("laboratory workflow", () => {
  it("authored cases map to real source assets with explicit optional scope and stable IDs", () => {
    expect(new Set(labWorkflows.map((w) => w.id)).size).toBe(
      labWorkflows.length,
    );
    labWorkflows.forEach((w, specimen) => {
      expect(w.specimenId).toBe(specimens[specimen].id);
      expect(w.orderedOptionalSteps).toEqual([
        "case",
        "microscope",
        "observations",
        "compare",
      ]);
      const d: LabData = {
        ...blankLabPage(specimen),
        stage: "case",
        experience: "workbench",
        workflowRevision: 1,
      };
      expect(labPuzzle(d)).toContain(w.id);
      expect(labMode(d)).toBe("lab_workbench:microbiology");
      expect(labPuzzle({ ...d, experience: "explorer" })).not.toBe(
        labPuzzle(d),
      );
    });
  });
  it("legacy draft IDs and notes remain valid; new bounded fields reject malformed restores", () => {
    const legacy: LabData = {
      ...blankLabPage(1),
      stage: "observations",
      text: "Old note",
      observations: ["Rounded cells"],
    };
    expect(validateGame("lab", legacy)).toBe(true);
    expect(labPuzzle(legacy)).toBe(specimens[1].id);
    expect(labMode(legacy)).toBe("explore");
    for (const p of [
      { experience: "diagnosis" },
      { workflowRevision: 2 },
      { pages: [blankLabPage(0), blankLabPage(0)] },
      { pages: [{ ...blankLabPage(1), zoom: Infinity }] },
      { pages: [{ ...blankLabPage(1), text: "x".repeat(1001) }] },
      { pan: [NaN, 0] },
      { specimen: 2 },
      { stage: "incubation" },
    ])
      expect(validateGame("lab", { ...legacy, ...p })).toBe(false);
  });
  it("switching slides preserves separate notes, observations and views", () => {
    let d: LabData = {
      ...blankLabPage(0),
      stage: "microscope",
      zoom: 2,
      pan: [10, -5],
      observations: ["Filaments"],
      text: "Branches",
    };
    d = selectLabSlide(d, 1, "explorer", "microscope");
    expect(d.text).toBe("");
    expect(d.observations).toEqual([]);
    d = { ...d, text: "Rounded", observations: ["Rounded cells"], zoom: 1.5 };
    d = selectLabSlide(d, 0, "workbench", "case");
    expect(d.text).toBe("Branches");
    expect(d.pan).toEqual([10, -5]);
    expect(d.zoom).toBe(2);
    d = selectLabSlide(d, 1, "explorer", "microscope");
    expect(d.text).toBe("Rounded");
    expect(d.zoom).toBe(1.5);
    expect(d.pages).toHaveLength(2);
    expect(validateGame("lab", d)).toBe(true);
  });
  it("every stage can be skipped and an empty notebook can be filed once from the specimen card", async () => {
    const { user } = await start();
    await user.click(
      screen.getByRole("button", { name: "Start a Lab Session" }),
    );
    expect(
      screen.getByRole("region", { name: "Fictional specimen card" }),
    ).toHaveTextContent("not an image of this fictional specimen");
    await user.click(
      screen.getByRole("button", { name: "Save to Lab Notebook" }),
    );
    expect(
      screen.getByRole("button", { name: "Save to Lab Notebook" }),
    ).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Compare views" }));
    await user.click(screen.getByRole("button", { name: "Observations" }));
    const state = await saved();
    expect(state.creations).toHaveLength(1);
    expect(state.creations[0].text).toBe("");
    expect(state.creations[0].labExperience).toBe("workbench");
    expect(state.sessions).toHaveLength(0);
    validateState(state, "play");
  });
  it("comparison shows both credited images, leaves source notes intact and no answers are required", async () => {
    const { user } = await start();
    await user.click(
      screen.getByRole("button", { name: "Explore Microscope" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Your notebook note" }),
      "Fictional note",
    );
    await user.click(screen.getByRole("button", { name: "Compare views" }));
    expect(
      screen.getByRole("region", { name: "Optional image comparison" }),
    ).toHaveTextContent("not fields from the same specimen");
    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(
      screen.getAllByRole("link", {
        name: "CDC source and public-domain record",
      }),
    ).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Skip comparison" }));
    expect(
      screen.getByRole("textbox", { name: "Your notebook note" }),
    ).toHaveValue("Fictional note");
    await user.click(screen.getByRole("button", { name: "Not sure" }));
    await user.click(
      screen.getByRole("button", { name: "Save to Lab Notebook" }),
    );
    expect((await saved()).creations[0].observations).toEqual(["Not sure"]);
  });
  it("seven same-slide explorations get separate attempts, while completed view changes do not", async () => {
    const { user } = await start(true);
    await user.click(
      screen.getByRole("button", { name: "Explore Microscope" }),
    );
    for (let i = 0; i < 7; i++) {
      await user.click(
        screen.getByRole("button", { name: "Save to Lab Notebook" }),
      );
      await user.click(screen.getByRole("button", { name: "Zoom in" }));
      await user.click(screen.getByRole("button", { name: "Compare views" }));
      await user.click(
        screen.getByRole("button", { name: "Back to microscope" }),
      );
      if (i < 6)
        await user.click(
          screen.getByRole("button", { name: "Explore this slide again" }),
        );
    }
    const state = await saved();
    const attempts = state.sessions.filter((s) => s.outcome === "explored");
    expect(attempts).toHaveLength(7);
    expect(new Set(attempts.map((s) => s.id)).size).toBe(7);
    expect(attempts.map((s) => s.attempt)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(
      attempts.every(
        (s) =>
          s.puzzleId.includes(specimens[0].id) &&
          s.mode === "microscope_explorer:microbiology" &&
          s.contentVersion === "lab-workflow-1",
      ),
    ).toBe(true);
    expect(state.creations).toHaveLength(7);
  });
  it("notes for both slides survive remount and notebook revisit uses the actual second asset ID", async () => {
    const { user, view } = await start(true);
    await user.click(
      screen.getByRole("button", { name: "Explore Microscope" }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "Your notebook note" }),
      "First slide",
    );
    await user.click(screen.getByRole("button", { name: "Next specimen" }));
    await user.type(
      screen.getByRole("textbox", { name: "Your notebook note" }),
      "Second slide",
    );
    await user.click(
      screen.getByRole("button", { name: "Save to Lab Notebook" }),
    );
    await saved();
    view.unmount();
    render(<App appRole="play" />);
    await user.click(
      await screen.findByRole("button", { name: /My Laboratory/ }),
    );
    expect(
      screen.getByRole("textbox", { name: "Your notebook note" }),
    ).toHaveValue("Second slide");
    await user.click(screen.getByRole("button", { name: "Next specimen" }));
    expect(
      screen.getByRole("textbox", { name: "Your notebook note" }),
    ).toHaveValue("First slide");
    await user.click(screen.getByRole("button", { name: "Back to games" }));
    await user.click(screen.getByRole("button", { name: /My Creations/ }));
    await user.click(screen.getByRole("button", { name: "Revisit specimen" }));
    expect(
      screen.getByRole("textbox", { name: "Your notebook note" }),
    ).toHaveValue("Second slide");
    const state = await saved();
    expect(state.drafts.lab?.puzzleId).toContain(specimens[1].id);
    expect(state.drafts.lab?.puzzleId).not.toContain(specimens[0].id);
    expect(state.drafts.lab?.finalized).not.toBe(true);
  });
  it("legacy second-slide notebook revisits keep legacy identity and keyboard view bounds", async () => {
    const state = emptyState("play");
    state.preferences.welcomeDone = true;
    state.creations = [
      {
        id: "old-page",
        kind: "notebook",
        title: "Old page",
        savedAt: new Date().toISOString(),
        specimenId: specimens[1].id,
        text: "Legacy",
        zoom: 3,
        pan: [35, 35],
      },
    ];
    await saveState(state);
    render(<App appRole="play" />);
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole("button", { name: /My Creations/ }),
    );
    await user.click(screen.getByRole("button", { name: "Revisit specimen" }));
    const viewer = screen.getByRole("region", { name: /Microscope image/ });
    fireEvent.keyDown(viewer, { key: "+" });
    fireEvent.keyDown(viewer, { key: "ArrowRight" });
    const resumed = await saved();
    expect(resumed.drafts.lab?.puzzleId).toBe(specimens[1].id);
    expect((resumed.drafts.lab?.data as LabData).pan).toEqual([35, 35]);
    expect((resumed.drafts.lab?.data as LabData).zoom).toBe(3);
    expect(
      screen.getByRole("textbox", { name: "Your notebook note" }),
    ).toHaveValue("Legacy");
  });
});
