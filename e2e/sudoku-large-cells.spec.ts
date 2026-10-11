import { test, expect } from "@playwright/test";
test("large Sudoku squares retain the board and selected-square visibility offline", async ({
  page,
  context,
}, info) => {
  await page.setViewportSize({ width: 390, height: 740 });
  await page.goto("/curiousity-lab/play/");
  await page
    .getByRole("button", { name: "Play without activity history", exact: true })
    .click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.getByRole("button", { name: /Numbers Settle/ }).click();
  const board = page.getByRole("group", { name: "9 by 9 Sudoku", exact: true });
  const original = await board
    .locator("button")
    .evaluateAll((elements) =>
      elements.map((e) => e.getAttribute("aria-label")),
    );
  const option = page.getByRole("checkbox", {
    name: "Larger Sudoku squares",
    exact: true,
  });
  await option.check();
  const holder = page.getByRole("region", {
    name: "Sudoku grid viewport",
    exact: true,
  });
  await expect(holder).toHaveClass(/large-cells/);
  expect(
    await board
      .locator("button")
      .evaluateAll((elements) =>
        elements.map((e) => e.getAttribute("aria-label")),
      ),
  ).toEqual(original);
  const bounds = await page.locator("#cell-0").boundingBox();
  expect(bounds!.width).toBeGreaterThanOrEqual(48);
  expect(bounds!.height).toBeGreaterThanOrEqual(48);
  await page.locator("#cell-0").press("Control+End");
  await expect(page.locator("#cell-80")).toBeFocused();
  await expect
    .poll(() => holder.evaluate((e) => e.scrollLeft))
    .toBeGreaterThan(0);
  await expect
    .poll(() => holder.evaluate((e) => e.scrollTop))
    .toBeGreaterThan(0);
  const visible = async () =>
    holder.evaluate((e) => {
      const selected = e
          .querySelector(".cell.selected")!
          .getBoundingClientRect(),
        viewport = e.getBoundingClientRect(),
        left = viewport.left + e.clientLeft,
        top = viewport.top + e.clientTop;
      return (
        selected.left >= left - 1 &&
        selected.right <= left + e.clientWidth + 1 &&
        selected.top >= top - 1 &&
        selected.bottom <= top + e.clientHeight + 1
      );
    });
  await expect.poll(visible).toBe(true);
  await page
    .getByRole("combobox", { name: "Row", exact: true })
    .selectOption("0");
  await page
    .getByRole("combobox", { name: "Column", exact: true })
    .selectOption("0");
  await expect.poll(visible).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator(".game-surface")
    .screenshot({ path: info.outputPath("sudoku-large-squares.png") });
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: /Numbers Settle/ }).click();
  await expect(option).toBeChecked();
  expect(
    await board
      .locator("button")
      .evaluateAll((elements) =>
        elements.map((e) => e.getAttribute("aria-label")),
      ),
  ).toEqual(original);
  await page
    .getByRole("button", { name: "Replay this puzzle", exact: true })
    .click();
  await expect(option).toBeChecked();
  expect(
    await board
      .locator("button")
      .evaluateAll((elements) =>
        elements.map((e) => e.getAttribute("aria-label")),
      ),
  ).toEqual(original);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await page.locator("#cell-0").press("Control+End");
  await expect.poll(visible).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator(".game-surface").screenshot({
    path: info.outputPath("sudoku-large-squares-200-percent.png"),
  });
  await option.uncheck();
  await expect(holder).not.toHaveClass(/large-cells/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
