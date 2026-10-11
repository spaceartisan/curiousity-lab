import { beforeEach, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { specimens } from "../src/content/specimens";
import {
  labWorkflows,
  blankLabPage,
  labContentVersion,
  labPuzzle,
  selectLabSlide,
  type LabData,
} from "../src/content/laboratory";
import { validateGame } from "../src/storage/validate-game";
import { emptyState, validateState } from "../src/storage/contracts";
import { clearState, saveState, loadState } from "../src/storage/local";
import { App } from "../src/App";
beforeEach(async () => {
  await clearState("play");
});
it("eight source-bound activities preserve both original slots/hashes and freeze six new identities, credits and unmodified published image bytes", () => {
  expect(specimens.map((s) => s.sourceImageId)).toEqual([
    "26402",
    "10041",
    "3077",
    "16289",
    "1250",
    "300",
    "14588",
    "26587",
  ]);
  const manifest = JSON.parse(
    readFileSync("public/media/provenance.json", "utf8"),
  );
  expect(manifest).toHaveLength(8);
  expect(manifest.slice(0, 2).map((m: { sha256: string }) => m.sha256)).toEqual(
    [
      "00782b3e152fc95c3bab51982d4af67bfd7e2606453c5c2eba92e7f7037ff1a9",
      "803697983f5c3829c6dfc86d2512dfaa518f6b22f50e87ab683a3747bde05e6f",
    ],
  );
  specimens.forEach((s, index) => {
    const m = manifest[index];
    expect(s.id).toBe(`phil-${s.sourceImageId}-r1`);
    expect(m.assetId).toBe(s.id);
    expect(m.sourceUrl).toBe(s.sourceUrl);
    expect(s.credit).toContain("CDC");
    expect(s.credit).toContain(`PHIL ${s.sourceImageId}`);
    expect(s.canUseForIdentificationQuestion).toBe(false);
    expect(m.allowedQuestionIds).toEqual([]);
    expect(m.scientificReviewStatus).toMatch(
      /independent specialist review pending/,
    );
    expect(
      createHash("sha256")
        .update(readFileSync(`public/media/${m.file}`))
        .digest("hex"),
    ).toBe(m.sha256);
    expect(labWorkflows[index].specimenId).toBe(s.id);
    expect(s.description.length).toBeGreaterThan(50);
  });
  expect(labContentVersion({ ...blankLabPage(0), stage: "microscope" })).toBe(
    "starter-1",
  );
  expect(
    labContentVersion({
      ...blankLabPage(1),
      stage: "microscope",
      workflowRevision: 1,
    }),
  ).toBe("lab-workflow-1");
});
it("all eight slide pages remain isolated and validated; new task versions do not change existing IDs or permit nonexistent/duplicate pages", () => {
  let d: LabData = {
    ...blankLabPage(0),
    stage: "microscope",
    workflowRevision: 1,
    experience: "explorer",
  };
  for (let i = 0; i < specimens.length; i++) {
    d = selectLabSlide(d, i, "explorer", "microscope");
    d = {
      ...d,
      text: `Synthetic field ${i}`,
      views: [{ id: `view-${i}`, name: `Field ${i}`, zoom: 1.25, pan: [5, 0] }],
    };
    expect(validateGame("lab", d)).toBe(true);
    expect(labContentVersion(d)).toBe(
      i < 2 ? "lab-workflow-1" : "lab-micrographs-2",
    );
    expect(labPuzzle(d)).toBe(`lab-explorer-v1:${specimens[i].id}`);
  }
  for (let i = 0; i < specimens.length; i++) {
    d = selectLabSlide(d, i, "explorer", "microscope");
    expect(d.text).toBe(`Synthetic field ${i}`);
    expect(d.views![0].id).toBe(`view-${i}`);
    expect(validateGame("lab", d)).toBe(true);
  }
  expect(d.pages).toHaveLength(8);
  expect(validateGame("lab", { ...d, specimen: 8 })).toBe(false);
  expect(
    validateGame("lab", { ...d, pages: [...d.pages!, blankLabPage(0)] }),
  ).toBe(false);
});
it("chosen comparison preserves current notes/source; new notebook source/version and saved view reopen without altering filed entries", async () => {
  const state = emptyState("play");
  state.preferences.welcomeDone = true;
  state.preferences.history = true;
  await saveState(state);
  const user = userEvent.setup();
  render(<App appRole="play" />);
  await user.click(
    await screen.findByRole("button", { name: /My Laboratory/ }),
  );
  fireEvent.click(
    await screen.findByRole("tab", { name: "Microscope & notebook" }),
  );
  expect(
    screen.getAllByRole("button", { name: /Explore specimen/ }),
  ).toHaveLength(8);
  await user.click(
    screen.getByRole("button", {
      name: /Bacteria in chains.*Explore specimen/,
    }),
  );
  await user.type(
    screen.getByRole("textbox", { name: "Your notebook note" }),
    "Synthetic chain study",
  );
  await user.click(screen.getByRole("button", { name: "Zoom in" }));
  await user.click(screen.getByRole("button", { name: "Compare views" }));
  await user.selectOptions(
    screen.getByRole("combobox", { name: "Comparison image" }),
    "7",
  );
  const imgs = screen.getAllByRole("img");
  expect(imgs[0].getAttribute("src")).toMatch(/\/media\/phil-3077\.jpg$/);
  expect(imgs[1].getAttribute("src")).toMatch(/\/media\/phil-26587\.jpg$/);
  await user.click(screen.getByRole("button", { name: "Back to microscope" }));
  expect(
    screen.getByRole("textbox", { name: "Your notebook note" }),
  ).toHaveValue("Synthetic chain study");
  await user.click(
    screen.getByRole("button", { name: "Save to Lab Notebook" }),
  );
  await waitFor(async () =>
    expect((await loadState("play")).creations).toHaveLength(1),
  );
  const filed = await loadState("play"),
    entry = filed.creations[0];
  expect(entry.specimenId).toBe("phil-3077-r1");
  expect(
    filed.sessions.find((s) => s.outcome === "explored")?.contentVersion,
  ).toBe("lab-micrographs-2");
  validateState(filed, "play");
  await user.click(screen.getByRole("button", { name: "Next specimen" }));
  expect(
    screen.getByRole("textbox", { name: "Your notebook note" }),
  ).toHaveValue("");
  await user.click(screen.getByRole("button", { name: "Open Lab Notebook" }));
  await user.click(screen.getByRole("button", { name: "Revisit specimen" }));
  expect(
    screen.getByRole("textbox", { name: "Your notebook note" }),
  ).toHaveValue(entry.text);
  expect(
    screen.getByText("Digital zoom 1.25×", { exact: true }),
  ).toBeInTheDocument();
  await waitFor(async () =>
    expect((await loadState("play")).creations[0].savedAt).toBe(entry.savedAt),
  );
});
