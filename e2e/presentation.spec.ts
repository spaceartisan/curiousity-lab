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
test("consented presentation settings survive offline replay, exports and review without rewriting completed attempts", async ({
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
  await page.getByRole("button", { name: /^Music Name the piece/ }).click();
  await page.getByRole("tab", { name: "Earlier exercises" }).click();
  await page
    .getByRole("button", { name: "Complete the phrase", exact: true })
    .click();
  await page.getByRole("button", { name: "By ear", exact: true }).click();
  await page.getByRole("button", { name: "Slower", exact: true }).click();
  await page.getByRole("checkbox", { name: "Sound", exact: true }).check();
  await page
    .getByRole("slider", { name: "Music volume", exact: true })
    .fill("0");
  await page.getByRole("checkbox", { name: "Sound", exact: true }).uncheck();
  await page.getByRole("button", { name: "Hint", exact: true }).click();
  await page.getByRole("button", { name: "Play F", exact: true }).click();
  await expect
    .poll(
      async () =>
        (await saved(page))?.sessions.filter(
          (s) => s.mode === "phrase" && s.outcome === "completed",
        ).length,
    )
    .toBe(1);
  const completed = (await saved(page))!.sessions.find(
    (s) => s.mode === "phrase" && s.outcome === "completed",
  )!;
  expect(completed.presentation).toMatchObject({
    coverage: "from-start",
    music: {
      soundSettings: [false, true],
      volumeRange: [0, 0.25],
      views: ["ear", "staff"],
      tempos: ["comfortable", "slow"],
    },
  });
  await page.getByRole("button", { name: "Note pattern", exact: true }).click();
  await page
    .getByRole("button", { name: "Another phrase", exact: true })
    .click();
  await expect
    .poll(
      async () => (await saved(page))!.drafts.music?.presentation?.music?.views,
    )
    .toEqual(["pattern"]);
  expect(
    (await saved(page))!.sessions.find((s) => s.id === completed.id),
  ).toEqual(completed);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: /^Music Name the piece/ }).click();
  await page.getByRole("tab", { name: "Earlier exercises" }).click();
  await expect(
    page.getByRole("button", { name: "Note pattern", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "Keep activity history on this device" })
    .uncheck();
  await expect
    .poll(async () => (await saved(page))!.drafts.music?.presentation)
    .toBeUndefined();
  await page
    .getByRole("checkbox", { name: "Keep activity history on this device" })
    .check();
  await page
    .getByRole("button", { name: "Back to games", exact: true })
    .click();
  await page.getByRole("button", { name: /^Music Name the piece/ }).click();
  await page.getByRole("tab", { name: "Earlier exercises" }).click();
  await expect
    .poll(async () => (await saved(page))!.drafts.music?.presentation?.coverage)
    .toBe("partial");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download JSON backup", exact: true })
    .click();
  const download = await downloadEvent;
  const backup: LocalState = JSON.parse(
    await readFile((await download.path())!, "utf8"),
  );
  expect(backup.sessions.find((s) => s.id === completed.id)).toEqual(completed);
  expect(backup.drafts.music?.presentation?.coverage).toBe("partial");
  // Add a clearly fictional legacy-format comparison only to the review fixture.
  backup.sessions.push({
    ...completed,
    id: "fictional-legacy-presentation",
    presentation: undefined,
  });
  await context.setOffline(false);
  await page.goto("/curiousity-lab/insights/");
  await page.getByLabel("Open Play JSON backup").setInputFiles({
    name: "fictional-presentation-review.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  const review = page.getByRole("region", { name: "Imported activity review" });
  await review
    .getByRole("combobox", { name: "Review activity", exact: true })
    .selectOption({ value: "music" });
  await expect(review.getByRole("article")).toHaveCount(3);
  const legacyContext = review
    .getByRole("article")
    .filter({ hasText: "Presentation settings unrecorded" });
  await legacyContext.locator("details.context-details summary").click();
  await expect(
    legacyContext
      .locator("details.context-details")
      .getByText("Presentation settings unrecorded", { exact: true }),
  ).toBeVisible();
  await review
    .getByRole("combobox", { name: "Puzzle context", exact: true })
    .selectOption({ value: contextKey(completed) });
  await expect(review.getByRole("article")).toHaveCount(1);
  const observedDetails = review
    .getByRole("article")
    .locator("details.context-details");
  await observedDetails.locator("summary").click();
  await expect(
    observedDetails.getByText(/sound setting off \/ on/),
  ).toBeVisible();
  await expect(
    observedDetails.getByText(/by ear \/ staff notation/),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("insights-presentation-context.png"),
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
    path: info.outputPath("insights-presentation-large-text.png"),
    fullPage: true,
  });
});
