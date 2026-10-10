import { test, expect } from "@playwright/test";
import { connections } from "../src/content/words";
test("word connections help undo and replay work offline across all eight packs", async ({
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
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await context.setOffline(true);
  await page.getByRole("button", { name: /Words Find/ }).click();
  await page.getByRole("button", { name: "Hint", exact: true }).click();
  await expect(
    page.getByText("Look for in the garden.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Show one word" }).click();
  await page.getByRole("button", { name: "Show four words" }).click();
  await expect(
    page.getByRole("button", { name: "Show four words" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Shuffle words" }).click();
  const wordGroup = page.getByRole("group", { name: "Connection words" });
  const order = await wordGroup.getByRole("button").allTextContents();
  for (const word of connections[0].groups[0].words)
    await expect(
      page.getByRole("button", { name: word, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /Words Find/ }).click();
  expect(
    await page
      .getByRole("group", { name: "Connection words" })
      .getByRole("button")
      .allTextContents(),
  ).toEqual(order);
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(
    page.getByText("Connected: In the garden.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Undo last connection" }).click();
  await expect(
    page.getByRole("button", { name: "TULIP", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.getByRole("button", { name: "TULIP", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "TULIP", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Connect", exact: true }),
  ).toBeDisabled();
  for (let pack = 1; pack < 8; pack++) {
    await page.getByRole("button", { name: "Another puzzle" }).click();
    await expect(
      page.getByRole("heading", { name: connections[pack].title, exact: true }),
    ).toBeVisible();
  }
  await page.screenshot({
    path: info.outputPath("connections-weather-plants.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await page.screenshot({
    path: info.outputPath("connections-large-text.png"),
    fullPage: true,
  });
  const layout = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    overflowing: Array.from(document.querySelectorAll("body *"))
      .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
      .map((el) => ({
        tag: el.tagName,
        className: el.className,
        text: el.textContent?.slice(0, 50),
      }))
      .slice(0, 15),
  }));
  expect(layout.scrollWidth, JSON.stringify(layout)).toBeLessThanOrEqual(
    layout.width,
  );
  for (const button of await page
    .getByRole("group", { name: "Connection words" })
    .getByRole("button")
    .all()) {
    const box = await button.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(48);
    expect(box!.height).toBeGreaterThanOrEqual(48);
  }
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "";
  });
  await page.setViewportSize(
    info.project.name === "phone-chromium"
      ? { width: 393, height: 851 }
      : { width: 1280, height: 720 },
  );
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const group of connections[7].groups) {
      for (const word of group.words)
        await page.getByRole("button", { name: word, exact: true }).click();
      await page.getByRole("button", { name: "Connect", exact: true }).click();
    }
    await expect(
      page.getByText("You found all four connections.", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Undo last connection" }),
    ).toBeDisabled();
    if (attempt === 0)
      await page.getByRole("button", { name: "Replay this puzzle" }).click();
  }
  await page.screenshot({
    path: info.outputPath("connections-completed.png"),
    fullPage: true,
  });
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  const sessions = await page.evaluate(async () => {
    const db: IDBDatabase = await new Promise((resolve, reject) => {
      const request = indexedDB.open("curiosity-lab:v1:play:guest", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const state: any = await new Promise((resolve, reject) => {
      const request = db
        .transaction("state")
        .objectStore("state")
        .get("current");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return state.sessions;
  });
  const done = sessions.filter((s: any) => s.outcome === "completed");
  expect(done.map((s: any) => s.attempt)).toEqual([1, 2]);
  expect(new Set(done.map((s: any) => s.id)).size).toBe(2);
  expect(done.every((s: any) => s.contentVersion === "connections-2")).toBe(
    true,
  );
  const starter = sessions.find((s: any) => s.puzzleId === "connections-0");
  expect(starter.hints).toBe(3);
  expect(starter.undos).toBe(1);
  expect(starter.contentVersion).toBe("starter-1");
});
