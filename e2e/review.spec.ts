import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fictionalReview } from "../tests/fixtures/review";
import { contextKey } from "../src/insights/review";
test("Insights reviews fictional exports offline with separated contexts and source-preserving downloads", async ({
  page,
  context,
}, info) => {
  const fixture = fictionalReview();
  const upload = () =>
    page.getByLabel("Open Play JSON backup").setInputFiles({
      name: "fictional-play-review.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(fixture)),
    });
  await page.goto("/curiousity-lab/insights/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await upload();
  const region = page.getByRole("region", { name: "Imported activity review" });
  await expect(region.getByRole("status")).toContainText(
    `${fixture.sessions.length} of ${fixture.sessions.length}`,
  );
  await expect(region.getByRole("article")).toHaveCount(12);
  await expect(
    page
      .getByRole("region", { name: "Raw recorded sessions" })
      .getByRole("row"),
  ).toHaveCount(13);
  await region.getByRole("button", { name: "Next records" }).click();
  await expect(region.getByText("Record page 2 of 2")).toBeVisible();
  await region.getByRole("button", { name: "Next summaries" }).click();
  await region
    .getByRole("combobox", { name: "Puzzle context", exact: true })
    .selectOption({ value: contextKey(fixture.sessions[0]) });
  await expect(region.getByRole("status")).toContainText(
    `3 of ${fixture.sessions.length}`,
  );
  await expect(region.getByRole("article")).toHaveCount(1);
  await expect(
    region.getByText(/6 hints \/ 2 completed sessions/),
  ).toBeVisible();
  await expect(region.getByText(/Completed: 2 of 3/)).toBeVisible();
  await expect(region.getByText(/No trend is estimated/)).toBeVisible();
  await page.screenshot({
    path: info.outputPath("insights-context-review.png"),
    fullPage: true,
  });
  for (const [button, filename] of [
    ["Export filtered CSV", "curiosity-lab-filtered-sessions.csv"],
    ["Export reviewed CSV", "curiosity-lab-reviewed-sessions.csv"],
    ["Export review summary", "curiosity-lab-review-summary.json"],
  ] as const) {
    const downloadEvent = page.waitForEvent("download");
    await region.getByRole("button", { name: button, exact: true }).click();
    const file = await downloadEvent;
    expect(file.suggestedFilename()).toBe(filename);
    const text = await readFile((await file.path())!, "utf8");
    if (button === "Export filtered CSV") {
      expect(text).toContain("fictional-repeat-2");
      expect(text).not.toContain("fictional-first");
      expect(text).toContain('"180000"');
    } else if (button === "Export reviewed CSV")
      expect(text).toContain("fictional-lab");
    else {
      const summary = JSON.parse(text);
      expect(summary.analysisVersion).toBe("local-context-review-1");
      expect(summary.selectedSessions).toBe(3);
      expect(summary.contexts[0].completedHints).toMatchObject({
        n: 2,
        total: 6,
        perSession: 3,
      });
    }
  }
  await region
    .getByRole("combobox", { name: "Repeat exposure", exact: true })
    .selectOption({ value: "first" });
  await expect(region.getByText(/No recorded sessions match/)).toBeVisible();
  await region.getByRole("button", { name: "Reset review filters" }).click();
  await region
    .getByRole("combobox", { name: "Review activity", exact: true })
    .selectOption({ value: "lab" });
  await expect(
    region.getByText(/no accuracy or performance score/),
  ).toBeVisible();
  await region.getByRole("button", { name: "Reset review filters" }).click();
  await region
    .getByLabel("From date (UTC)", { exact: true })
    .fill("2026-10-11");
  await region
    .getByLabel("Through date (UTC)", { exact: true })
    .fill("2026-10-11");
  await expect(region.getByRole("status")).toContainText(
    `1 of ${fixture.sessions.length}`,
  );
  await expect(
    page.getByRole("region", { name: "Raw recorded sessions" }),
  ).toContainText("fictional-utc-boundary");
  await region.getByRole("button", { name: "Reset review filters" }).click();
  await region
    .getByRole("combobox", { name: "Puzzle context", exact: true })
    .selectOption({ value: contextKey(fixture.sessions[0]) });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const table = page.getByRole("region", { name: "Raw recorded sessions" });
  await table.focus();
  await table.press("ArrowRight");
  await expect
    .poll(() => table.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(0);
  await page.screenshot({
    path: info.outputPath("insights-large-text.png"),
    fullPage: true,
  });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "";
  });
  await page.setViewportSize(
    info.project.name === "phone-chromium"
      ? { width: 393, height: 851 }
      : { width: 1280, height: 720 },
  );
  await page.getByLabel("Open Play JSON backup").setInputFiles({
    name: "invalid-review.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"schemaVersion":1,"installationRole":"insights"}'),
  });
  await expect(region.getByRole("status")).toContainText(
    `3 of ${fixture.sessions.length}`,
  );
  await upload();
  await expect(region.getByRole("status")).toContainText(
    `${fixture.sessions.length} of ${fixture.sessions.length}`,
  );
  await region.getByRole("button", { name: "Close imported review" }).click();
  await expect(region).toHaveCount(0);
  await upload();
  await expect(region).toBeVisible();
  await page.reload();
  await expect(region).toHaveCount(0);
  const saved = await page.evaluate(async () => {
    const db: IDBDatabase = await new Promise((resolve, reject) => {
      const r = indexedDB.open("curiosity-lab:v1:insights:guest", 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const result: any = await new Promise((resolve, reject) => {
      const r = db.transaction("state").objectStore("state").get("current");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    db.close();
    return result;
  });
  expect(saved.sessions).toEqual([]);
  expect(saved.creations).toEqual([]);
  await context.setOffline(false);
  await page.goto("/curiousity-lab/companion/");
  await expect(page.getByLabel("Open Play JSON backup")).toHaveCount(0);
});
