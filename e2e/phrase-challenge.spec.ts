import { test, expect } from "@playwright/test";
import { phraseExercises } from "../src/content/music";
test("challenging phrase rules, optional hints, keyboard and chosen replay work offline", async ({
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
  await page.getByRole("button", { name: /^Music Name the piece/ }).click();
  await page.getByRole("tab", { name: "Earlier exercises" }).click();
  await page
    .getByRole("button", { name: "Complete the phrase", exact: true })
    .click();
  const choice = page.getByRole("combobox", { name: "Phrase challenge" });
  page.once("dialog", (d) => d.accept());
  await choice.selectOption("Challenging");
  await expect(
    page.getByRole("heading", { name: "Alternating steps", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(phraseExercises[4].rule, { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(phraseExercises[4].hint, { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.locator("details").filter({ hasText: "Phrase controls & help" }),
  ).not.toHaveAttribute("open", "");
  await page.screenshot({
    path: info.outputPath("phrase-challenge-staff.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "By ear", exact: true }).click();
  await expect(
    page.getByRole("img", { name: /Treble staff|Note pattern/ }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Play / replay" }).click();
  await expect(
    page.getByText(
      "Sound is off. Choose Staff or Note pattern, or turn sound on here.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "Sound", exact: true }).check();
  await page.getByRole("button", { name: "Play / replay" }).click();
  await expect(
    page.getByText("Playing. You can listen again whenever you like.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Stop sound", exact: true }).click();
  await page.getByRole("checkbox", { name: "Sound", exact: true }).uncheck();
  await page.getByRole("button", { name: "Back to games" }).click();
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: /^Music Name the piece/ }).click();
  await page.getByRole("tab", { name: "Earlier exercises" }).click();
  await expect(choice).toHaveValue("Challenging");
  await expect(
    page.getByRole("button", { name: "By ear", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  page.once("dialog", (d) => d.dismiss());
  await choice.selectOption("Classic");
  await expect(choice).toHaveValue("Challenging");
  await page.getByRole("button", { name: "Note pattern", exact: true }).click();
  await page.setViewportSize({ width: 320, height: 740 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await page.screenshot({
    path: info.outputPath("phrase-challenge-large-text.png"),
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
  const high = page.getByRole("button", { name: "Play C high", exact: true });
  await high.scrollIntoViewIfNeeded();
  const b = await high.boundingBox();
  expect(b!.width).toBeGreaterThanOrEqual(48);
  expect(b!.height).toBeGreaterThanOrEqual(48);
  expect(b!.x + b!.width).toBeLessThanOrEqual(320);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "";
  });
  await page.setViewportSize(
    info.project.name === "phone-chromium"
      ? { width: 393, height: 851 }
      : { width: 1280, height: 720 },
  );
  await page.getByRole("button", { name: "Play C", exact: true }).click();
  await expect(
    page.getByText("That note doesn't continue the stated pattern.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(phraseExercises[4].hint, { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Hint", exact: true }).click();
  await expect(
    page.getByText(phraseExercises[4].hint, { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Play G", exact: true }).click();
  await expect(
    page.getByText("G4 completes the stated pattern.", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Hint", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Try this exercise again" }).click();
  await expect(
    page.getByRole("heading", { name: "Alternating steps", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Hint", exact: true }),
  ).toBeEnabled();
  for (const i of [5, 6, 7, 4]) {
    await page.getByRole("button", { name: "Another phrase" }).click();
    await expect(
      page.getByRole("heading", {
        name: phraseExercises[i].title,
        exact: true,
      }),
    ).toBeVisible();
    await expect(choice).toHaveValue("Challenging");
    await expect(
      page.getByText(phraseExercises[i].hint, { exact: true }),
    ).toHaveCount(0);
  }
});
