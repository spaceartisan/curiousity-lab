import { expect, test } from "@playwright/test";

test("numbers and words rooms play offline-ready new puzzles", async ({
  page,
}) => {
  await page.goto("/curiousity-lab/play/");
  await page
    .getByRole("button", { name: "Play without activity history" })
    .click();
  await page.getByRole("button", { name: /Numbers/ }).click();
  await page.getByRole("tab", { name: "Killer Sudoku" }).click();
  await expect(page.locator(".kcell")).toHaveCount(81);
  await page.locator(".kcell").first().click();
  await page.locator(".numberpad button", { hasText: "5" }).click();
  await expect(page.locator(".combos")).toBeVisible();
  await page.getByRole("tab", { name: "Countdown" }).click();
  await page.getByRole("button", { name: "Show a solution" }).click();
  await expect(page.locator(".cd-steps.solution li").last()).toBeVisible();

  await page.goto("/curiousity-lab/play/");
  await page.getByRole("button", { name: /Words/ }).click();
  await page.getByRole("tab", { name: "Word Ladder" }).click();
  for (const w of ["heal", "teal", "tell", "tall", "tail"]) {
    await page.getByLabel("Next word").fill(w);
    await page.getByRole("button", { name: "Add", exact: true }).click();
  }
  await expect(page.getByText(/Done in 5 steps/)).toBeVisible();
  await page.getByRole("tab", { name: "Letter Hive" }).click();
  await expect(page.locator(".hex")).toHaveCount(7);
  await page.getByRole("tab", { name: "Cryptogram" }).click();
  await page.locator(".crypto-cell").first().click();
  await page.getByRole("button", { name: "Reveal a letter" }).click();
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
