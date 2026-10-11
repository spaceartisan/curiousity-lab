import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { LocalState } from "../src/storage/contracts";
import { contextKey } from "../src/insights/review";
async function saved(page: Page): Promise<LocalState | undefined> {
  return page.evaluate(async () => {
    const db: IDBDatabase = await new Promise((resolve, reject) => {
      const r = indexedDB.open("curiosity-lab:v1:play:guest", 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const state: LocalState | undefined = await new Promise(
      (resolve, reject) => {
        const r = db.transaction("state").objectStore("state").get("current");
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      },
    );
    db.close();
    return state;
  });
}
test("game input categories survive offline use and retain unknown legacy context", async ({
  page,
  context,
}, info) => {
  await page.goto("/curiousity-lab/play/");
  await page
    .getByRole("button", {
      name: "Keep activity history on this device",
      exact: true,
    })
    .click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.getByRole("button", { name: /Numbers Settle/ }).click();
  const method = info.project.name.includes("phone") ? "touch" : "mouse";
  const cell = page.locator("#cell-0");
  if (method === "touch") await cell.tap();
  else await cell.click();
  await cell.press("ArrowRight");
  await expect
    .poll(async () => (await saved(page))?.drafts.sudoku?.presentation?.input)
    .toEqual({
      version: 1,
      coverage: "from-start",
      methods: ["keyboard", method],
    });
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: /Numbers Settle/ }).click();
  await expect
    .poll(
      async () =>
        (await saved(page))?.drafts.sudoku?.presentation?.input?.methods,
    )
    .toEqual(["keyboard", method]);
  await page
    .getByRole("button", { name: "Finish for now", exact: true })
    .click();
  await expect.poll(async () => (await saved(page))?.sessions.length).toBe(1);
  const filed = (await saved(page))!.sessions[0];
  expect(filed.presentation?.input?.methods).toEqual(["keyboard", method]);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("checkbox", {
      name: "Keep activity history on this device",
      exact: true,
    })
    .uncheck();
  await page
    .getByRole("button", { name: "Back to games", exact: true })
    .click();
  await page.getByRole("button", { name: /Numbers Settle/ }).click();
  await page.locator("#cell-0").press("ArrowRight");
  await expect
    .poll(async () => (await saved(page))?.drafts.sudoku?.presentation)
    .toBeUndefined();
  expect((await saved(page))!.sessions[0]).toEqual(filed);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download JSON backup", exact: true })
    .click();
  const download = await downloadEvent;
  const backup: LocalState = JSON.parse(
    await readFile((await download.path())!, "utf8"),
  );
  expect(backup.sessions[0]).toEqual(filed);
  const { input: _input, ...legacy } = filed.presentation!;
  backup.sessions.push({
    ...filed,
    id: "fictional-input-unrecorded",
    presentation: legacy,
  });
  await context.setOffline(false);
  await page.goto("/curiousity-lab/insights/");
  await page.getByLabel("Open Play JSON backup").setInputFiles({
    name: "fictional-input-review.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  const review = page.getByRole("region", { name: "Imported activity review" });
  await expect(review.getByRole("article")).toHaveCount(2);
  const legacyContext = review
    .getByRole("article")
    .filter({ hasText: "input methods unrecorded" });
  await legacyContext.locator("details.context-details summary").click();
  await expect(
    legacyContext
      .locator("details.context-details")
      .getByText(/input methods unrecorded/),
  ).toBeVisible();
  await review
    .getByRole("combobox", { name: "Puzzle context", exact: true })
    .selectOption({ value: contextKey(filed) });
  await expect(review.getByRole("article")).toHaveCount(1);
  await expect(
    review.getByRole("heading", {
      name: new RegExp("input observations from start: keyboard / " + method),
    }),
  ).toBeVisible();
  await review.screenshot({
    path: info.outputPath("insights-input-context.png"),
  });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
