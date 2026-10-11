import { test, expect } from "@playwright/test";
import { specimens } from "../src/content/specimens";
test("eight real slide assets load offline; chosen comparison and notebook preserve the actual new source", async ({
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
  await page.getByRole("button", { name: /My Laboratory/ }).click();
  await page.getByRole("tab", { name: "Microscope & notebook" }).click();
  const cards = page.getByRole("button", { name: /Explore specimen/ });
  await expect(cards).toHaveCount(8);
  for (const img of await cards.locator("img").all())
    await expect
      .poll(() => img.evaluate((el) => el.naturalWidth))
      .toBeGreaterThanOrEqual(699);
  await page.screenshot({
    path: info.outputPath("lab-eight-slide-desk.png"),
    fullPage: true,
  });
  for (const asset of specimens.slice(2)) {
    await page
      .getByRole("button", {
        name: new RegExp(`${asset.title}.*Explore specimen`),
      })
      .click();
    const image = page
      .getByRole("region", { name: /Microscope image/ })
      .locator("img");
    await expect(image).toHaveAttribute(
      "src",
      `/curiousity-lab/${asset.asset}`,
    );
    await expect
      .poll(() => image.evaluate((el) => el.naturalWidth))
      .toBeGreaterThanOrEqual(699);
    await page.getByRole("button", { name: "Back to specimen desk" }).click();
  }
  await page
    .getByRole("button", {
      name: /Brush-like conidial groups.*Explore specimen/,
    })
    .click();
  await page
    .getByRole("textbox", { name: "Your notebook note" })
    .fill("Synthetic observation: brush-like groups");
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page
    .getByRole("button", { name: "Compare views", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Comparison image" })
    .selectOption("6");
  const comparison = page.getByRole("region", {
    name: "Optional image comparison",
  });
  await expect(comparison.getByRole("img").nth(0)).toHaveAttribute(
    "src",
    "/curiousity-lab/media/phil-26587.jpg",
  );
  await expect(comparison.getByRole("img").nth(1)).toHaveAttribute(
    "src",
    "/curiousity-lab/media/phil-14588.jpg",
  );
  await page.screenshot({
    path: info.outputPath("lab-chosen-comparison.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  for (const name of ["Back to microscope", "Save to Lab Notebook"]) {
    const b = (await page
      .getByRole("button", { name, exact: true })
      .boundingBox())!;
    expect(b.height).toBeGreaterThanOrEqual(48);
    expect(b.width).toBeGreaterThanOrEqual(48);
  }
  await page.screenshot({
    path: info.outputPath("lab-collection-large-text.png"),
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
  await page.getByRole("button", { name: "Back to microscope" }).click();
  await expect(
    page.getByRole("textbox", { name: "Your notebook note" }),
  ).toHaveValue("Synthetic observation: brush-like groups");
  await page.getByRole("button", { name: "Save to Lab Notebook" }).click();
  await page.getByRole("button", { name: "Open Lab Notebook" }).click();
  await page.getByRole("button", { name: "Revisit specimen" }).click();
  await expect(
    page.getByRole("region", { name: /Microscope image/ }).locator("img"),
  ).toHaveAttribute("src", "/curiousity-lab/media/phil-26587.jpg");
  await expect(
    page.getByText("Digital zoom 1.25×", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to games" }).click();
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /My Laboratory/ }).click();
  await page.getByRole("tab", { name: "Microscope & notebook" }).click();
  await expect(
    page.getByRole("textbox", { name: "Your notebook note" }),
  ).toHaveValue("Synthetic observation: brush-like groups");
});
