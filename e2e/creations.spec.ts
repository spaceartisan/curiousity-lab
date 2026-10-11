import { test, expect } from "@playwright/test";
import { emptyState } from "../src/storage/contracts";
test("notebook collections filter paginate and revisit legacy entries offline", async ({
  page,
  context,
}, info) => {
  const state = emptyState("play");
  state.preferences.welcomeDone = true;
  state.creations = Array.from({ length: 13 }, (_, i) => ({
    id: `fictional-page-${i}`,
    kind: "notebook" as const,
    title: `Fictional lab page ${i}`,
    savedAt: new Date(Date.UTC(2026, 9, 10, 0, i)).toISOString(),
    specimenId: "phil-26402-r1",
    text: `Fictional observation ${i}\nA second notebook line`,
    observations: ["Filaments"],
    zoom: 1.5,
    pan: [5, 0],
  }));
  state.creations.push(
    {
      id: "unknown-source",
      kind: "notebook",
      title: "Fictional old source",
      savedAt: "2026-10-09T00:00:00Z",
      specimenId: "old-unavailable-image",
      text: "Fictional preserved note",
    },
    {
      id: "fictional-melody",
      kind: "melody",
      title: "Fictional melody",
      savedAt: "2026-10-10T02:00:00Z",
      notes: [0, 2, 4],
    },
  );
  await page.goto("/curiousity-lab/play/");
  await page
    .getByRole("button", { name: "Play without activity history" })
    .click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Restore this app’s JSON backup").setInputFiles({
    name: "fictional-notebook-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(state)),
  });
  await expect(
    page.getByRole("region", { name: "Restore preview" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Restore this backup", exact: true })
    .click();
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to games" }).click();
  await page.reload();
  await context.setOffline(true);
  await page.getByRole("button", { name: /My Laboratory Take/ }).click();
  await page.getByRole("button", { name: "Open Lab Notebook" }).click();
  await expect(
    page.getByRole("heading", { name: "My Lab Notebook", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Lab Notebook", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("article")).toHaveCount(12);
  const recent = page.getByRole("article", {
    name: "Fictional lab page 12",
    exact: true,
  });
  await expect(recent.getByRole("img")).toHaveJSProperty("naturalWidth", 700);
  await page.getByRole("button", { name: "Next page" }).click();
  const unknown = page.getByRole("article", {
    name: "Fictional old source",
    exact: true,
  });
  await expect(
    unknown.getByText("Fictional preserved note", { exact: true }),
  ).toBeVisible();
  await expect(
    unknown.getByRole("button", { name: "Revisit specimen" }),
  ).toHaveCount(0);
  page.once("dialog", (dialog) => dialog.accept());
  await unknown.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByRole("article")).toHaveCount(1);
  await page
    .getByRole("searchbox", { name: "Find a saved creation" })
    .fill("page 12");
  await expect(recent).toBeVisible();
  await recent.getByRole("button", { name: "Revisit specimen" }).click();
  await expect(
    page.getByText(/You reopened a notebook page for this slide just now/),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Your notebook note" }),
  ).toHaveValue("Fictional observation 12\nA second notebook line");
  await expect(
    page.getByText("Digital zoom 1.50×", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open Lab Notebook" }).click();
  await expect(
    recent.getByText("Last reopened just now", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("searchbox", { name: "Find a saved creation" })
    .fill("page 12");
  await page.screenshot({
    path: info.outputPath("notebook-collection.png"),
    fullPage: true,
  });
  await page
    .getByRole("searchbox", { name: "Find a saved creation" })
    .fill("missing phrase");
  await expect(
    page.getByRole("heading", { name: "No matching creations" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Clear search" }).click();
  await page.getByLabel("Order by", { exact: true }).selectOption("earlier");
  await expect(page.getByRole("article").first()).toHaveAttribute(
    "aria-label",
    "Fictional lab page 0",
  );
  await page.getByLabel("Order by", { exact: true }).selectOption("recent");
  await page
    .getByRole("searchbox", { name: "Find a saved creation" })
    .fill("page 12");
  await page.setViewportSize({ width: 320, height: 740 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  for (const [element, word] of [
    [recent.getByRole("heading"), "Fictional"],
    [recent.getByRole("button", { name: "Revisit specimen" }), "specimen"],
  ] as const) {
    expect(
      await element.evaluate((node, longestWord) => {
        const style = getComputedStyle(node);
        const canvas = document.createElement("canvas");
        const drawing = canvas.getContext("2d")!;
        drawing.font = style.font;
        const available =
          node.clientWidth -
          parseFloat(style.paddingLeft) -
          parseFloat(style.paddingRight);
        return available >= drawing.measureText(longestWord).width;
      }, word),
    ).toBe(true);
  }
  await page.screenshot({
    path: info.outputPath("notebook-large-text.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Clear search" }).click();
  await page.getByRole("button", { name: "Melodies", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "My Melodies", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Sound", exact: true }),
  ).not.toBeChecked();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "";
  });
  await page.setViewportSize(
    info.project.name === "phone-chromium"
      ? { width: 393, height: 851 }
      : { width: 1280, height: 720 },
  );
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /My Creations Your/ }).click();
  await expect(
    page.getByRole("heading", { name: "My Creations", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lab Notebook", exact: true }).click();
  await expect(
    page
      .getByRole("article", { name: "Fictional lab page 12", exact: true })
      .getByText(/Last reopened/),
  ).toBeVisible();
  const persisted = await page.evaluate(async () => {
    const db: IDBDatabase = await new Promise((resolve, reject) => {
      const request = indexedDB.open("curiosity-lab:v1:play:guest", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const state: any = await new Promise((resolve, reject) => {
      const request = db
        .transaction("state")
        .objectStore("state")
        .get("current");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return state;
  });
  expect(persisted.creations).toHaveLength(14);
  expect(persisted.sessions).toHaveLength(0);
  const entry = persisted.creations.find(
    (c: any) => c.id === "fictional-page-12",
  );
  expect(entry.savedAt).toBe(state.creations[12].savedAt);
  expect(Number.isFinite(Date.parse(entry.lastViewedAt))).toBe(true);
});
