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
test("foreground pause survives offline finish and export while legacy timing stays unknown in review", async ({
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
  await page.getByRole("button", { name: /Music Hear/ }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your place is kept." }),
  ).toBeVisible();
  await expect
    .poll(async () => (await saved(page))?.drafts.music?.timing?.pausedMs)
    .toBeGreaterThanOrEqual(1000);
  await page
    .getByRole("button", { name: "Resume", exact: true })
    .last()
    .click();
  await context.setOffline(true);
  await page
    .getByRole("button", { name: "Finish for now", exact: true })
    .click();
  await expect.poll(async () => (await saved(page))?.sessions.length).toBe(1);
  const finished = (await saved(page))!.sessions[0];
  expect(finished.activeMs).toBeGreaterThan(0);
  expect(finished.timing).toMatchObject({
    version: 1,
    algorithm: "visible-interaction-60s-v2",
    coverage: "from-start",
  });
  expect(finished.timing!.pausedMs).toBeGreaterThanOrEqual(1000);
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download JSON backup", exact: true })
    .click();
  const backup: LocalState = JSON.parse(
    await readFile((await (await downloadEvent).path())!, "utf8"),
  );
  expect(backup.sessions[0]).toEqual(finished);
  backup.sessions.push({
    ...finished,
    id: "fictional-legacy-timing",
    timing: undefined,
  });
  await context.setOffline(false);
  await page.goto("/curiousity-lab/insights/");
  await page
    .getByLabel("Open Play JSON backup")
    .setInputFiles({
      name: "fictional-timing-review.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(backup)),
    });
  const review = page.getByRole("region", { name: "Imported activity review" });
  await expect(review.getByRole("article")).toHaveCount(2);
  await expect(
    review.getByText("Paused time is unavailable.", { exact: true }),
  ).toBeVisible();
  await expect(review.getByText(/Observed foreground pause:/)).toBeVisible();
  await review
    .getByRole("combobox", { name: "Puzzle context", exact: true })
    .selectOption({ value: contextKey(finished) });
  await expect(review.getByRole("article")).toHaveCount(1);
  await expect(
    review.getByRole("cell", {
      name: new RegExp(`${finished.timing!.pausedMs} ms foreground pause`),
    }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("insights-timing-context.png"),
    fullPage: true,
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
  await page.screenshot({
    path: info.outputPath("insights-timing-large-text.png"),
    fullPage: true,
  });
});
