import { expect, test } from "@playwright/test";

test("name a piece by ear, see its score, then play it yourself", async ({
  page,
}) => {
  await page.goto("/curiousity-lab/play/");
  await page
    .getByRole("button", { name: "Play without activity history" })
    .click();
  await page.getByRole("button", { name: /^Music Name the piece/ }).click();
  await page.getByRole("button", { name: "Turn sound on" }).click();
  await page.getByRole("button", { name: "Play the excerpt" }).click();
  const choices = page.locator(".ntp-choices button");
  await expect(choices).toHaveCount(4);
  await choices.first().click();
  await expect(page.locator(".ntp-reveal h2")).toBeVisible();
  await expect(page.locator(".score svg").first()).toBeVisible();
  await page.screenshot({
    path: "test-results/music-room-reveal.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Play it yourself" }).click();
  const status = page.locator(".piy-status");
  await expect(status).toContainText("Note 1 of");
  await page.locator(".key-target").dispatchEvent("pointerdown");
  await expect(status).toContainText("Note 2 of");
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("piano samples are cached for offline play", async ({ page }) => {
  await page.goto("/curiousity-lab/play/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  const cached = await page.evaluate(async () => {
    const keys = await caches.keys();
    const cache = await caches.open(keys.find((k) => k.includes("play"))!);
    return (await cache.keys()).filter((r) =>
      /\/media\/piano\/.*\.mp3$/.test(r.url),
    ).length;
  });
  expect(cached).toBe(30);
});
