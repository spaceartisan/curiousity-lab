import { test, expect } from "@playwright/test";
import { emptyState } from "../src/storage/contracts";
import {
  generateSudoku,
  solveAdvanced,
  findAdvancedStep,
  sudokuPuzzle,
} from "../src/games/sudoku-engine";
test("challenging Sudoku offers optional pair deductions, offline progress and deliberate difficulty", async ({
  page,
  context,
}, info) => {
  const d = generateSudoku(9, 0, "Challenging");
  d.cells = solveAdvanced(d.givens, 9, false).cells;
  const step = findAdvancedStep(d.cells, 9)!;
  expect(step.deductions!.some((d) => d.technique === "naked-pair")).toBe(true);
  const state = emptyState("play");
  state.preferences.welcomeDone = true;
  state.drafts.sudoku = {
    id: "synthetic-challenge",
    game: "sudoku",
    puzzleId: sudokuPuzzle(d),
    startedAt: "2026-10-10T00:00:00Z",
    activeMs: 0,
    hints: 0,
    undos: 0,
    mode: "9x9:Challenging",
    data: d,
  };
  await page.goto("/curiousity-lab/play/");
  await page
    .getByRole("button", { name: "Play without activity history", exact: true })
    .click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Restore this app’s JSON backup").setInputFiles({
    name: "synthetic-challenge.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(state)),
  });
  await page
    .getByRole("button", { name: "Restore this backup", exact: true })
    .click();
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Back to games", exact: true })
    .click();
  await page.getByRole("button", { name: /^Numbers Sudoku/ }).click();
  const challenge = page.getByRole("combobox", {
    name: "Challenge",
    exact: true,
  });
  await expect(challenge).toHaveValue("Challenging");
  const help = page.locator("details").filter({
    has: page.getByText("Controls & help", { exact: true }),
  });
  await expect(help).not.toHaveAttribute("open");
  await expect(page.getByRole("status")).toBeEmpty();
  await page
    .locator(".game-surface")
    .screenshot({ path: info.outputPath("sudoku-challenging.png") });
  const cell = page.locator(`#cell-${step.index}`);
  await page.getByRole("button", { name: "Show a step", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Naked pair:");
  await expect(cell).toHaveAttribute("aria-label", /empty/);
  await page.getByRole("button", { name: "Hint", exact: true }).click();
  await expect(cell).toHaveText(String(step.value));
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(cell).toHaveAttribute("aria-label", /empty/);
  await page.getByRole("button", { name: "Hint", exact: true }).click();
  await page
    .getByRole("button", { name: "Back to games", exact: true })
    .click();
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: /^Numbers Sudoku/ }).click();
  await expect(challenge).toHaveValue("Challenging");
  await expect(cell).toHaveText(String(step.value));
  await expect(help).not.toHaveAttribute("open");
  await page
    .getByRole("button", { name: "Replay this puzzle", exact: true })
    .click();
  await expect(challenge).toHaveValue("Challenging");
  const board = page.getByRole("group", { name: "9 by 9 Sudoku", exact: true });
  expect(
    await board
      .locator("button")
      .evaluateAll((elements) => elements.map((e) => e.textContent!.trim())),
  ).toEqual(d.givens.map((n) => (n ? String(n) : "")));
  await page.locator(".game-surface").screenshot({
    path: info.outputPath("sudoku-challenging-fresh.png"),
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
  const challengeFits = await challenge.evaluate((element) => {
    const select = element as HTMLSelectElement;
    const style = getComputedStyle(select);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    context.font = `${style.fontSize} ${style.fontFamily}`;
    const needed = context.measureText(select.selectedOptions[0].text).width;
    return (
      needed <=
      select.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight) -
        24
    );
  });
  expect(challengeFits).toBe(true);
  await page.locator(".game-surface").screenshot({
    path: info.outputPath("sudoku-challenging-200-percent.png"),
  });
  page.once("dialog", (dialog) => dialog.dismiss());
  await challenge.selectOption("Classic");
  await expect(challenge).toHaveValue("Challenging");
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("combobox", { name: "Grid", exact: true })
    .selectOption("6");
  await expect(challenge).toHaveValue("Classic");
  await expect(
    page.getByRole("option", { name: "Challenging", exact: true }),
  ).toHaveJSProperty("disabled", true);
});
