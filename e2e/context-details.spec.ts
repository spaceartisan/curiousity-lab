import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fictionalReview } from "../tests/fixtures/review";
import { contextKey } from "../src/insights/review";
import { sessionsCsv } from "../src/storage/local";
import { CLOCK_ALGORITHM } from "../src/storage/clock-context";
test("short context cards keep exact provenance behind keyboard/touch disclosures and preserve offline exports", async ({
  page,
  context,
}, info) => {
  const fixture = fictionalReview(),
    base = fixture.sessions[0];
  fixture.sessions = [
    base,
    {
      ...base,
      id: "synthetic-clock-context",
      clock: {
        version: 1,
        algorithm: CLOCK_ALGORITHM,
        coverage: "partial",
        timeZone: "UTC",
        timeZoneChanged: false,
        wallClockShift: true,
        observationGap: true,
      },
    },
  ];
  await page.goto("/curiousity-lab/insights/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.getByLabel("Open Play JSON backup").setInputFiles({
    name: "synthetic-context-layout.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(fixture)),
  });
  const review = page.getByRole("region", { name: "Imported activity review" });
  await expect(review.getByRole("article")).toHaveCount(2);
  const choices = await review
    .getByLabel("Puzzle context")
    .locator("option")
    .allTextContents();
  expect(choices[1]).not.toBe(choices[2]);
  expect(choices[1].length).toBeLessThan(160);
  await review
    .getByLabel("Puzzle context")
    .selectOption(contextKey(fixture.sessions[1]));
  const card = review.getByRole("article");
  await expect(card.getByRole("heading", { level: 4 })).toHaveText(
    "Sudoku · 9x9:Classic",
  );
  const details = card.locator("details.context-details"),
    toggle = details.locator("summary");
  await expect(details).not.toHaveAttribute("open", "");
  await card.screenshot({ path: info.outputPath("insights-context-card.png") });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(details).toHaveAttribute("open", "");
  await expect(details.getByText(base.puzzleId, { exact: true })).toBeVisible();
  await expect(
    details.getByText(
      /Local clock observations partial; zone UTC; clock shift observed/,
    ),
  ).toBeVisible();
  await card.screenshot({
    path: info.outputPath("insights-context-provenance.png"),
  });
  await page.keyboard.press("Enter");
  await expect(details).not.toHaveAttribute("open", "");
  const downloading = page.waitForEvent("download");
  await review
    .getByRole("button", { name: "Export reviewed CSV", exact: true })
    .click();
  expect(await readFile((await (await downloading).path())!, "utf8")).toBe(
    sessionsCsv(fixture),
  );
  await page.setViewportSize({ width: 320, height: 740 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await toggle.click();
  await expect(details).toHaveAttribute("open", "");
  expect((await toggle.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await card.screenshot({
    path: info.outputPath("insights-context-large-text.png"),
  });
});
