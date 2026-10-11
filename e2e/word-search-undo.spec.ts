import { test, expect } from "@playwright/test";
import { searchPacks, findWordPaths } from "../src/content/words";
test("word search undo keeps crossing words and survives offline reload", async ({
  page,
  context,
}, info) => {
  await page.goto("/curiousity-lab/play/");
  await page
    .getByRole("button", { name: "Play without activity history", exact: true })
    .click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.getByRole("button", { name: /^Word Search/ }).click();
  await page.getByRole("button", { name: "Another puzzle" }).click();
  const find = async (word: string) => {
    const path = findWordPaths(searchPacks[1], word)[0];
    for (const index of [path[0], path.at(-1)!])
      await page
        .getByRole("button", {
          name: new RegExp(
            `^Row ${Math.floor(index / 8) + 1}, column ${(index % 8) + 1}:`,
          ),
        })
        .click();
  };
  const undo = page.getByRole("button", {
    name: "Undo last word",
    exact: true,
  });
  await expect(undo).toBeDisabled();
  await find("SPOON");
  await find("BOWL");
  await undo.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("Returned bowl");
  await expect(page.getByText(/1 of 8 words found/)).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Row 6, column 2: O, found",
      exact: true,
    }),
  ).toHaveClass(/found-letter/);
  await expect(
    page.getByRole("button", { name: "Row 6, column 1: B", exact: true }),
  ).not.toHaveClass(/found-letter/);
  await page
    .getByRole("button", { name: "Back to games", exact: true })
    .click();
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: /^Word Search/ }).click();
  await expect(
    page.getByRole("heading", { name: "Kitchen table", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/1 of 8 words found/)).toBeVisible();
  await page.getByText("How to play & get help", { exact: true }).click();
  await page
    .locator(".game-surface")
    .screenshot({ path: info.outputPath("word-search-undo.png") });
  await undo.click();
  await expect(undo).toBeDisabled();
  await expect(page.locator(".found-letter")).toHaveCount(0);
  for (const word of searchPacks[1].words) await find(word);
  await expect(undo).toBeDisabled();
  await page
    .getByRole("button", { name: "Replay this puzzle", exact: true })
    .click();
  await expect(page.getByText(/0 of 8 words found/)).toBeVisible();
  await find("SPOON");
  await page.setViewportSize({ width: 320, height: 740 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expect(undo).toBeEnabled();
  const bounds = await undo.boundingBox();
  expect(bounds!.width).toBeGreaterThanOrEqual(48);
  expect(bounds!.height).toBeGreaterThanOrEqual(48);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await undo.click();
  await expect(page.getByText(/0 of 8 words found/)).toBeVisible();
  await page
    .locator(".game-surface")
    .screenshot({ path: info.outputPath("word-search-undo-200-percent.png") });
});
