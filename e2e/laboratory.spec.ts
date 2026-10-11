import { specimens } from "../src/content/specimens";
import { test, expect } from "@playwright/test";
test("optional laboratory journey keeps separate notes offline and permits repeat visits", async ({
  page,
  context,
}, info) => {
  await page.goto("/curiousity-lab/play/");
  await page
    .getByRole("button", { name: "Play without activity history" })
    .click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await context.setOffline(true);
  await page.getByRole("button", { name: /My Laboratory Take/ }).click();
  await page.getByRole("button", { name: "Start a Lab Session" }).click();
  await expect(
    page.getByRole("region", { name: "Fictional specimen card" }),
  ).toContainText("not an image of this fictional specimen");
  await page.screenshot({
    path: info.outputPath("laboratory-specimen-card.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Skip to observations" }).click();
  await page.getByRole("button", { name: "Filaments", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Your notebook note" })
    .fill("Fictional test note: branches");
  await page.getByRole("button", { name: "Jump to microscope" }).click();
  const viewer = page.getByRole("region", { name: /Microscope image/ });
  await viewer.focus();
  await page.keyboard.press("+");
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByText("Digital zoom 1.25×", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Next specimen", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Your notebook note" }),
  ).toHaveValue("");
  await page
    .getByRole("textbox", { name: "Your notebook note" })
    .fill("Fictional test note: rounded forms");
  for (let i = 1; i < specimens.length; i++)
    await page
      .getByRole("button", { name: "Next specimen", exact: true })
      .click();
  await expect(
    page.getByRole("textbox", { name: "Your notebook note" }),
  ).toHaveValue("Fictional test note: branches");
  await expect(
    page.getByRole("button", { name: "Filaments", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByText("Digital zoom 1.25×", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Compare views", exact: true })
    .click();
  const comparison = page.getByRole("region", {
    name: "Optional image comparison",
  });
  await expect(comparison).toContainText("not fields from the same specimen");
  for (const img of await comparison.getByRole("img").all())
    await expect(img).toHaveJSProperty("naturalWidth", 700);
  for (const source of await comparison.locator("summary").all())
    await source.click();
  await expect(
    comparison.getByRole("link", {
      name: "CDC source and public-domain record",
    }),
  ).toHaveCount(2);
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /My Laboratory Take/ }).click();
  await expect(
    page.getByRole("region", { name: "Optional image comparison" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to microscope" }).click();
  await expect(
    page.getByRole("textbox", { name: "Your notebook note" }),
  ).toHaveValue("Fictional test note: branches");
  await page
    .getByRole("button", { name: "Next specimen", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Your notebook note" }),
  ).toHaveValue("Fictional test note: rounded forms");
  await page.getByRole("button", { name: "Save to Lab Notebook" }).click();
  await expect(
    page.getByRole("button", { name: "Save to Lab Notebook" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Back to games" }).click();
  await page.getByRole("button", { name: /My Creations Your/ }).click();
  await expect(
    page.getByText("Fictional test note: rounded forms", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Revisit specimen" }).click();
  for (let i = 0; i < 7; i++) {
    await page.getByRole("button", { name: "Save to Lab Notebook" }).click();
    if (i < 6)
      await page
        .getByRole("button", { name: "Explore this slide again" })
        .click();
  }
  // Small screen and 200% text: comparison stacks; page never clips; controls remain tappable.
  await page.setViewportSize({ width: 320, height: 740 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await page
    .getByRole("button", { name: "Compare views", exact: true })
    .click();
  await page.screenshot({
    path: info.outputPath("laboratory-comparison-large-text.png"),
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
        text: el.textContent?.slice(0, 60),
        right: el.getBoundingClientRect().right,
      }))
      .slice(0, 20),
  }));
  expect(layout.scrollWidth, JSON.stringify(layout)).toBeLessThanOrEqual(
    layout.width,
  );
  const button = await page
    .getByRole("button", { name: "Back to microscope" })
    .boundingBox();
  expect(button!.height).toBeGreaterThanOrEqual(48);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "";
  });
  await page.setViewportSize(
    info.project.name === "phone-chromium"
      ? { width: 393, height: 851 }
      : { width: 1280, height: 720 },
  );
  await page.screenshot({
    path: info.outputPath("laboratory-comparison.png"),
    fullPage: true,
  });
});
