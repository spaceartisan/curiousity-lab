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
test("local clock shifts survive offline resume/export, stay distinct from unknown history, and remain unverified", async ({
  page,
  context,
}, info) => {
  await page.addInitScript(() => {
    const original = Date.now.bind(Date);
    let offset = 0;
    Date.now = () => original() + offset;
    Object.assign(window, {
      syntheticClockShift: () => {
        offset = 120000;
      },
    });
  });
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
  await expect
    .poll(async () => (await saved(page))?.preferences.history)
    .toBe(true);
  await expect
    .poll(async () => (await saved(page))?.preferences.welcomeDone)
    .toBe(true);
  await page.reload();
  await page.getByRole("button", { name: /Music Hear/ }).click();
  await page.getByRole("tab", { name: "Earlier exercises" }).click();
  await expect
    .poll(async () => (await saved(page))?.drafts.music?.clock?.coverage)
    .toBe("from-start");
  await page.evaluate(() => {
    (
      window as unknown as { syntheticClockShift: () => void }
    ).syntheticClockShift();
  });
  await page.keyboard.press("Tab");
  await expect
    .poll(async () => (await saved(page))?.drafts.music?.clock?.wallClockShift)
    .toBe(true);
  await expect
    .poll(async () => (await saved(page))?.drafts.music?.clock?.observationGap)
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: /Music Hear/ }).click();
  await page.getByRole("tab", { name: "Earlier exercises" }).click();
  await page
    .getByRole("button", { name: "Finish for now", exact: true })
    .click();
  await expect.poll(async () => (await saved(page))?.sessions.length).toBe(1);
  const finished = (await saved(page))!.sessions[0];
  expect(finished.clock).toMatchObject({
    version: 1,
    algorithm: "wall-monotonic-v1",
    coverage: "partial",
    wallClockShift: true,
    observationGap: true,
  });
  expect(finished.activeMs).toBeLessThan(120000);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download JSON backup", exact: true })
    .click();
  const backup: LocalState = JSON.parse(
    await readFile((await (await downloading).path())!, "utf8"),
  );
  expect(backup.sessions[0]).toEqual(finished);
  backup.sessions.push(
    { ...finished, id: "synthetic-legacy-clock", clock: undefined },
    {
      ...finished,
      id: "synthetic-steady-clock",
      clock: {
        ...finished.clock!,
        coverage: "from-start",
        wallClockShift: false,
        observationGap: false,
      },
    },
  );
  await context.setOffline(false);
  await page.goto("/curiousity-lab/insights/");
  await page.getByLabel("Open Play JSON backup").setInputFiles({
    name: "synthetic-clock-history.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  const review = page.getByRole("region", { name: "Imported activity review" });
  await expect(review.getByRole("article")).toHaveCount(3);
  await expect(
    review
      .getByRole("article")
      .filter({ hasText: "Clock context unrecorded; UTC accuracy unverified" }),
  ).toHaveCount(1);
  await review
    .getByRole("combobox", { name: "Puzzle context", exact: true })
    .selectOption({ value: contextKey(finished) });
  await expect(review.getByRole("article")).toHaveCount(1);
  await expect(
    review.getByText(/Time consistency warning: 1 records have/),
  ).toBeVisible();
  await review
    .getByRole("article")
    .screenshot({ path: info.outputPath("insights-clock-context.png") });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("insights-clock-large-text.png"),
    fullPage: true,
  });
});
