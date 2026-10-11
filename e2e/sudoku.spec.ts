import { test, expect } from "@playwright/test";
import { emptyState } from "../src/storage/contracts";
import {
  generateSudoku,
  solveLogically,
  findLogicalStep,
  sudokuPuzzle,
} from "../src/games/sudoku-engine";
test("hidden-single Sudoku explains, saves notes, undoes and replays offline with large controls", async ({
  page,
  context,
}, info) => {
  const data = generateSudoku(9, 0, "Hidden singles");
  data.cells = solveLogically(data.givens, 9, false).cells;
  const step = findLogicalStep(data.cells, 9)!;
  expect(step.technique).toBe("hidden-single");
  const state = emptyState("play");
  state.preferences.welcomeDone = true;
  state.preferences.history = true;
  state.drafts.sudoku = {
    id: "fictional-sudoku-attempt",
    game: "sudoku",
    puzzleId: sudokuPuzzle(data),
    startedAt: "2026-10-10T00:00:00Z",
    activeMs: 0,
    hints: 0,
    undos: 0,
    mode: "9x9:Hidden singles",
    data,
  };
  await page.goto("/curiousity-lab/play/");
  await page
    .getByRole("button", { name: "Play without activity history" })
    .click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByLabel("Restore this app’s JSON backup").setInputFiles({
    name: "fictional-sudoku-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(state)),
  });
  await expect(
    page.getByRole("region", { name: "Restore preview" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Restore this backup", exact: true })
    .click();
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to games" }).click();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: /^Numbers Sudoku/ }).click();
  await expect(
    page.getByRole("combobox", { name: "Challenge", exact: true }),
  ).toHaveValue("Hidden singles");
  const cell = page.locator(`#cell-${step.index}`);
  await page.getByRole("button", { name: "Show a step", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "only one possible place",
  );
  await expect(cell).toHaveAttribute("aria-label", /empty/);
  await page.getByRole("button", { name: "Hint", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "The square is filled for you",
  );
  await expect(cell).toHaveText(String(step.value));
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(cell).toHaveAttribute("aria-label", /empty/);
  await page.getByRole("button", { name: "Pencil notes off" }).click();
  await cell.click();
  await cell.press(String(step.value));
  await expect(cell).toHaveAttribute(
    "aria-label",
    new RegExp(`notes ${step.value}`),
  );
  await page.getByRole("button", { name: "Pencil notes on" }).click();
  await cell.press(String(step.value));
  await expect(cell).not.toHaveAttribute("aria-label", /notes/);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(cell).toHaveAttribute(
    "aria-label",
    new RegExp(`empty, notes ${step.value}`),
  );
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /^Numbers Sudoku/ }).click();
  await expect(cell).toHaveAttribute(
    "aria-label",
    new RegExp(`empty, notes ${step.value}`),
  );
  await page.locator("#cell-0").focus();
  await page.locator("#cell-0").press("ArrowLeft");
  await expect(page.locator("#cell-0")).toBeFocused();
  await page.locator("#cell-0").press("End");
  await expect(page.locator("#cell-8")).toBeFocused();
  await page.locator("#cell-8").press("ArrowRight");
  await expect(page.locator("#cell-8")).toBeFocused();
  await page.locator("#cell-8").press("Control+End");
  await expect(page.locator("#cell-80")).toBeFocused();
  await expect(
    page.getByRole("combobox", { name: "Row", exact: true }),
  ).toHaveValue("8");
  await expect(
    page.getByRole("combobox", { name: "Column", exact: true }),
  ).toHaveValue("8");
  await page.getByRole("button", { name: "Show a step", exact: true }).click();
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("sudoku-hidden-singles.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await page
    .getByRole("combobox", { name: "Row", exact: true })
    .selectOption({ value: String(Math.floor(step.index / 9)) });
  await page
    .getByRole("combobox", { name: "Column", exact: true })
    .selectOption({ value: String(step.index % 9) });
  await expect(page.locator(".selected-square")).toContainText(
    `Row ${Math.floor(step.index / 9) + 1}, column ${(step.index % 9) + 1}: empty`,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  for (const label of ["Show a step", "Hint", "Replay this puzzle"]) {
    const button = page.getByRole("button", { name: label, exact: true });
    expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  }
  await page.screenshot({
    path: info.outputPath("sudoku-large-controls.png"),
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
  await page.getByRole("button", { name: "Replay this puzzle" }).click();
  await expect(page.getByRole("status")).toHaveText("");
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  const readPersisted = () =>
    page.evaluate(async () => {
      const db: IDBDatabase = await new Promise((resolve, reject) => {
        const req = indexedDB.open("curiosity-lab:v1:play:guest", 1);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      const result: any = await new Promise((resolve, reject) => {
        const req = db.transaction("state").objectStore("state").get("current");
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      db.close();
      return result;
    });
  await expect
    .poll(async () => (await readPersisted()).drafts.sudoku.id)
    .not.toBe("fictional-sudoku-attempt");
  const persisted = await readPersisted();
  expect(persisted.sessions).toHaveLength(1);
  expect(persisted.sessions[0]).toMatchObject({
    id: "fictional-sudoku-attempt",
    outcome: "unfinished",
    contentVersion: "sudoku-hidden-singles-1",
    puzzleId: sudokuPuzzle(data),
    hints: 3,
    undos: 2,
  });
  expect(persisted.drafts.sudoku.id).not.toBe("fictional-sudoku-attempt");
  expect(persisted.drafts.sudoku.data.givens).toEqual(data.givens);
  expect(persisted.drafts.sudoku.data.cells).toEqual(data.givens);
  // A smaller grid is an explicit choice, with its challenge change disclosed.
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("combobox", { name: "Grid", exact: true })
    .selectOption({ value: "4" });
  await expect(
    page.getByRole("group", { name: "4 by 4 Sudoku" }),
  ).toBeVisible();
  await expect(
    page.getByRole("combobox", { name: "Challenge", exact: true }),
  ).toHaveValue("Classic");
  await expect(
    page.getByRole("option", { name: "Hidden singles", exact: true }),
  ).toHaveJSProperty("disabled", true);
});
