import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { fictionalTimeline } from "../tests/fixtures/timeline";
import { contextKey } from "../src/insights/review";
test("local session plots retain source values, overlap, fixed axes and missingness offline", async ({
  page,
  context,
}, info) => {
  const fixture = fictionalTimeline(),
    key = contextKey(fixture.sessions[0]);
  await page.goto("/curiousity-lab/insights/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.getByLabel("Open Play JSON backup").setInputFiles({
    name: "fictional-timeline.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(fixture)),
  });
  const plot = page.getByRole("region", {
    name: "Individual session timeline",
    exact: true,
  });
  await expect(plot.getByText(/Choose one puzzle context/)).toBeVisible();
  await expect(
    plot.getByRole("combobox", { name: "Plot value", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Puzzle context", exact: true })
    .selectOption({ value: key });
  const chart = plot.getByRole("group", { name: /^Observed active time by/ });
  await expect(
    plot.getByRole("button", { name: /^fictional-point-/ }),
  ).toHaveCount(24);
  const axes = await chart.locator("text").allTextContents();
  await plot.getByRole("button", { name: /^fictional-point-01:/ }).focus();
  await page.keyboard.press("Enter");
  const detail = plot.getByRole("region", {
    name: "Selected session details",
    exact: true,
  });
  await expect(
    detail.getByText("fictional-point-01", { exact: true }),
  ).toBeVisible();
  await expect(detail.getByText(/exact source: 24000 ms/)).toBeVisible();
  await expect(detail.getByText(/11:00:00-04:00/)).toBeVisible();
  await plot
    .getByRole("button", { name: "Next plot points", exact: true })
    .click();
  await expect(
    plot.getByText("Plot page 2 of 2", { exact: true }),
  ).toBeVisible();
  expect(await chart.locator("text").allTextContents()).toEqual(axes);
  await expect(
    plot.getByRole("button", { name: /^fictional-point-/ }),
  ).toHaveCount(8);
  await expect
    .poll(() =>
      plot.locator(".timeline-scroll").evaluate((el) => {
        const marker = el
            .querySelector(".timeline-point.selected")!
            .getBoundingClientRect(),
          box = el.getBoundingClientRect();
        return marker.left >= box.left && marker.right <= box.right;
      }),
    )
    .toBe(true);
  await plot
    .getByRole("combobox", { name: "Plot value", exact: true })
    .selectOption({ value: "hints" });
  await expect(
    plot.getByText("Plot page 1 of 2", { exact: true }),
  ).toBeVisible();
  await expect(plot.getByText(/31 of 32 selected records/)).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await plot
    .getByRole("button", { name: "Export plot data", exact: true })
    .click();
  const download = await downloadEvent;
  const exported = JSON.parse(await readFile((await download.path())!, "utf8"));
  expect(exported.plotVersion).toBe("local-session-points-3");
  expect(exported.selectedSourceSessionIds).toHaveLength(32);
  expect(exported.points).toHaveLength(31);
  expect(exported.excludedSourceSessionIds).toEqual(["fictional-point-04"]);
  expect(exported.points[1]).toMatchObject({
    value: 1,
    unit: "count",
    attempt: 3,
    sourceEndedAt: "2026-10-01T11:00:00-04:00",
    endedAtUtc: "2026-10-01T15:00:00.000Z",
  });
  await plot.getByText("Plot data table", { exact: true }).click();
  await expect(
    plot
      .getByRole("region", { name: "Plot source values", exact: true })
      .getByRole("row"),
  ).toHaveCount(25);
  await plot.getByText("Plot data table", { exact: true }).click();
  await plot.screenshot({
    path: info.outputPath("insights-session-points.png"),
  });
  const normalWidth = await plot
    .locator("svg")
    .evaluate((el) => el.getBoundingClientRect().width);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Text size", exact: true })
    .selectOption({ value: "large" });
  await page
    .getByRole("button", { name: "Back to overview", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Puzzle context", exact: true })
    .selectOption({ value: key });
  expect(
    await plot
      .locator("svg")
      .evaluate((el) => el.getBoundingClientRect().width),
  ).toBeGreaterThan(normalWidth * 1.15);
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Text size", exact: true })
    .selectOption({ value: "normal" });
  await page
    .getByRole("button", { name: "Back to overview", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Puzzle context", exact: true })
    .selectOption({ value: key });
  await plot
    .getByRole("combobox", { name: "Plot value", exact: true })
    .selectOption({ value: "hints" });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const scroll = plot.getByRole("region", {
    name: "Scrollable session plot",
    exact: true,
  });
  await scroll.focus();
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(() => scroll.evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(0);
  await plot.screenshot({
    path: info.outputPath("insights-session-points-large-text.png"),
  });
  await page
    .getByRole("combobox", { name: "Puzzle context", exact: true })
    .selectOption({ value: contextKey(fixture.sessions[32]) });
  await plot
    .getByRole("combobox", { name: "Plot value", exact: true })
    .selectOption({ value: "pause" });
  await expect(plot.getByText(/Missing values are unknown/)).toBeVisible();
  await expect(
    plot.getByRole("button", { name: /^fictional-point-/ }),
  ).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Puzzle context", exact: true })
    .selectOption({ value: contextKey(fixture.sessions[33]) });
  await expect(
    plot.getByRole("option", {
      name: "Hints in completed sessions",
      exact: true,
    }),
  ).toHaveJSProperty("disabled", true);
  await page
    .getByRole("button", { name: "Reset review filters", exact: true })
    .click();
  await expect(plot.getByText(/Choose one puzzle context/)).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Imported activity review", exact: true })
      .getByRole("status"),
  ).toContainText("34 of 34");
  await page.reload();
  await expect(
    page.getByRole("region", { name: "Imported activity review", exact: true }),
  ).toHaveCount(0);
});
