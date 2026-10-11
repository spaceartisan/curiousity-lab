import { test, expect, type Page } from "@playwright/test";
import { medicalConnections } from "../src/content/medical-words";
import type { LocalState } from "../src/storage/contracts";
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
test("medical Latin and Greek play resumes offline, reveals optional roots and keeps large text contained", async ({
  page,
  context,
}, info) => {
  await page.goto("/curiousity-lab/play/");
  await page
    .getByRole("button", { name: "Keep activity history on this device" })
    .click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(async () => (await saved(page))?.preferences.welcomeDone)
    .toBe(true);
  await expect
    .poll(async () => (await saved(page))?.preferences.history)
    .toBe(true);
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Words Find/ }).click();
  await page.getByRole("tab", { name: "Connections" }).click();
  page.once("dialog", (d) => d.accept());
  const choice = page.getByRole("combobox", {
    name: "Word Connections challenge",
  });
  await choice.selectOption("Medical");
  await expect(
    page.getByRole("heading", { name: "Two languages, one meaning" }),
  ).toBeVisible();
  await expect(page.getByText("Kidney", { exact: true })).toHaveCount(0);
  for (const b of await page
    .getByRole("group", { name: "Connection words" })
    .getByRole("button")
    .all()) {
    const fits = await b.evaluate((el) => {
      const style = getComputedStyle(el);
      const c = document.createElement("canvas").getContext("2d")!;
      c.font = style.font;
      return (
        c.measureText(el.textContent || "").width <=
        el.clientWidth -
          parseFloat(style.paddingLeft) -
          parseFloat(style.paddingRight)
      );
    });
    expect(fits).toBe(true);
  }
  await page.screenshot({
    path: info.outputPath("medical-words-fresh.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "RENAL", exact: true }).click();
  await page.getByRole("button", { name: "Back to games" }).click();
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(
      async () =>
        (
          (await saved(page))?.drafts.connections?.data as
            { selected: string[] } | undefined
        )?.selected,
    )
    .toEqual(["RENAL"]);
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: /Words Find/ }).click();
  await page.getByRole("tab", { name: "Connections" }).click();
  await expect(choice).toHaveValue("Medical");
  await expect(
    page.getByRole("button", { name: "RENAL", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "RENAL", exact: true }).click();
  for (const g of medicalConnections[0].groups) {
    for (const w of g.words)
      await page.getByRole("button", { name: w, exact: true }).click();
    await page.getByRole("button", { name: "Connect", exact: true }).click();
  }
  await expect
    .poll(
      async () =>
        (await saved(page))?.sessions.find((s) => s.mode === "medical-roots")
          ?.contentVersion,
    )
    .toBe("medical-roots-1");
  const summary = page
    .locator("summary")
    .filter({ hasText: "Explore these roots: Kidney" });
  await expect(summary.locator("..")).not.toHaveAttribute("open", "");
  expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(summary.locator("..")).toHaveAttribute("open", "");
  await expect(page.getByText(/Latin ren- and Greek nephr-/)).toBeVisible();
  await page.screenshot({
    path: info.outputPath("medical-words-roots.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Another puzzle" }).click();
  await expect(
    page.getByRole("heading", { name: "Position in the word" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 320, height: 740 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await page.screenshot({
    path: info.outputPath("medical-words-large-text.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  for (const button of await page
    .getByRole("group", { name: "Connection words" })
    .getByRole("button")
    .all()) {
    const bounds = (await button.boundingBox())!;
    expect(bounds.width).toBeGreaterThanOrEqual(48);
    expect(bounds.height).toBeGreaterThanOrEqual(48);
  }
});
