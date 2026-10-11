import { test, expect } from "@playwright/test";
import { rhythmExercises } from "../src/content/music";
test("six-beat rhythm challenge resumes honestly offline and retains its chosen collection", async ({
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
  await page.getByRole("button", { name: /Music Hear/ }).click();
  await page.getByRole("button", { name: "Rhythm echo", exact: true }).click();
  const choice = page.getByRole("combobox", { name: "Rhythm challenge" });
  page.once("dialog", (d) => d.accept());
  await choice.selectOption("Challenging");
  await expect(
    page.getByRole("heading", { name: "Two trios", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/0 of 6 beats tapped/)).toBeVisible();
  await expect(
    page.locator("details").filter({ hasText: "Rhythm controls & help" }),
  ).not.toHaveAttribute("open", "");
  await expect(page.getByText(/Spaces between beats/)).toHaveCount(0);
  await expect(page.locator(".rhythm-pattern circle")).toHaveCount(6);
  await page.screenshot({
    path: info.outputPath("rhythm-challenge-fresh.png"),
    fullPage: true,
  });
  await page.getByRole("checkbox", { name: "Sound", exact: true }).check();
  await page.getByRole("button", { name: "Play / replay" }).click();
  await expect(
    page.getByText("Playing. You can listen again whenever you like.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Stop sound", exact: true }).click();
  await page.getByRole("checkbox", { name: "Sound", exact: true }).uncheck();
  for (let i = 0; i < 2; i++)
    await page.getByRole("button", { name: "Tap a beat" }).click();
  page.once("dialog", (d) => d.dismiss());
  await choice.selectOption("Classic");
  await expect(choice).toHaveValue("Challenging");
  await expect(page.getByText(/2 of 6 beats tapped/)).toBeVisible();
  await page.getByRole("button", { name: "Back to games" }).click();
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: /Music Hear/ }).click();
  await expect(choice).toHaveValue("Challenging");
  await expect(page.getByText(/2 of 6 beats tapped/)).toBeVisible();
  await page.setViewportSize({ width: 320, height: 740 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await page.screenshot({
    path: info.outputPath("rhythm-challenge-large-text.png"),
    fullPage: true,
  });
  const layout = await choice.evaluate((el) => {
    const s = getComputedStyle(el),
      c = document.createElement("canvas").getContext("2d")!;
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
  const b = await page
    .getByRole("button", { name: "Tap a beat" })
    .boundingBox();
  expect(b!.width).toBeGreaterThanOrEqual(48);
  expect(b!.height).toBeGreaterThanOrEqual(48);
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
    page.getByText(
      "Spaces between beats: 1 · 1 · 4 · 1 · 1. Keep these relative spaces at your own pace.",
      { exact: true },
    ),
  ).toBeVisible();
  for (let i = 0; i < 4; i++)
    await page.getByRole("button", { name: "Tap a beat" }).click();
  await expect(
    page.getByText(
      "Sequence complete. Timing feedback is unavailable for a resumed sequence.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Tap a beat" })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Hint", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Extra flexible" }).click();
  await expect(page.getByRole("button", { name: "Tap a beat" })).toBeDisabled();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByText(/0 of 6 beats tapped/)).toBeVisible();
  for (const i of [4, 5, 3]) {
    await page.getByRole("button", { name: "Another rhythm" }).click();
    await expect(
      page.getByRole("heading", {
        name: rhythmExercises[i].title,
        exact: true,
      }),
    ).toBeVisible();
    await expect(choice).toHaveValue("Challenging");
    await expect(page.getByText(/Spaces between beats/)).toHaveCount(0);
  }
});
