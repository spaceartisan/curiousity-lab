import { test, expect } from "@playwright/test";
import { connections } from "../src/content/words";
test("chosen wordplay stays challenging offline with optional help and readable large text", async ({
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
  await page.getByRole("button", { name: /Words Find/ }).click();
  page.once("dialog", (d) => d.accept());
  const choice = page.getByRole("combobox", {
    name: "Word Connections challenge",
  });
  await choice.selectOption("Challenging");
  await expect(
    page.getByRole("heading", { name: "Crossed meanings" }),
  ).toBeVisible();
  await expect(
    page.locator("details").filter({ hasText: "How to play & get help" }),
  ).not.toHaveAttribute("open", "");
  for (const g of connections[8].groups)
    await expect(page.getByText(g.title, { exact: true })).toHaveCount(0);
  await page.screenshot({
    path: info.outputPath("wordplay-fresh.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "TRAIL", exact: true }).click();
  await page.getByRole("button", { name: "Shuffle words" }).click();
  const words = page.getByRole("group", { name: "Connection words" });
  const order = await words.getByRole("button").allTextContents();
  await page.getByRole("button", { name: "Back to games" }).click();
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: /Words Find/ }).click();
  await expect(choice).toHaveValue("Challenging");
  await expect(
    page.getByRole("button", { name: "TRAIL", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  expect(await words.getByRole("button").allTextContents()).toEqual(order);
  page.once("dialog", (d) => d.dismiss());
  await choice.selectOption("Classic");
  await expect(choice).toHaveValue("Challenging");
  await expect(
    page.getByRole("button", { name: "TRAIL", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.setViewportSize({ width: 320, height: 740 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await page.screenshot({
    path: info.outputPath("wordplay-large-text.png"),
    fullPage: true,
  });
  const layout = await choice.evaluate((el) => {
    const s = getComputedStyle(el);
    const c = document.createElement("canvas").getContext("2d")!;
    c.font = s.font;
    return {
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
      text: c.measureText((el as HTMLSelectElement).selectedOptions[0].text)
        .width,
      available:
        el.clientWidth -
        parseFloat(s.paddingLeft) -
        parseFloat(s.paddingRight) -
        24,
    };
  });
  expect(layout.scroll).toBeLessThanOrEqual(layout.width);
  expect(layout.text).toBeLessThanOrEqual(layout.available);
  for (const button of await words.getByRole("button").all()) {
    const b = await button.boundingBox();
    expect(b!.width).toBeGreaterThanOrEqual(48);
    expect(b!.height).toBeGreaterThanOrEqual(48);
  }
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "";
  });
  await page.setViewportSize(
    info.project.name === "phone-chromium"
      ? { width: 393, height: 851 }
      : { width: 1280, height: 720 },
  );
  await page.getByRole("button", { name: "Hint", exact: true }).click();
  await expect(
    page.getByText("Look for words after paper.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Show one word" }).click();
  await page.getByRole("button", { name: "Show four words" }).click();
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await page.getByRole("button", { name: "Undo last connection" }).click();
  for (const g of connections[8].groups) {
    for (const w of g.words)
      await page.getByRole("button", { name: w, exact: true }).click();
    await page.getByRole("button", { name: "Connect", exact: true }).click();
  }
  await expect(
    page.getByText("You found all four connections.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Replay this puzzle" }).click();
  await expect(
    page.getByRole("heading", { name: "Crossed meanings" }),
  ).toBeVisible();
  for (const i of [9, 10, 11, 8]) {
    await page.getByRole("button", { name: "Another puzzle" }).click();
    await expect(
      page.getByRole("heading", { name: connections[i].title, exact: true }),
    ).toBeVisible();
    await expect(choice).toHaveValue("Challenging");
  }
});
