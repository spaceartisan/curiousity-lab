import { test, expect } from "@playwright/test";
test("named microscope views remain slide-bound and notebook snapshots reopen offline", async ({
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
  await page.getByRole("button", { name: /My Laboratory/ }).click();
  await page
    .getByRole("button", { name: "Explore Microscope", exact: true })
    .click();
  const summary = page.getByText(/^Saved microscope views/);
  await expect(summary.locator("..")).not.toHaveAttribute("open", "");
  await summary.click();
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.getByRole("button", { name: "Move right", exact: true }).click();
  await page.getByRole("textbox", { name: "View name" }).fill("Branch tips");
  await page.getByRole("button", { name: "Save current view" }).click();
  await page.getByRole("button", { name: "Reset view" }).click();
  await page
    .getByRole("button", { name: "Open saved view 1: Branch tips" })
    .click();
  await expect(
    page.getByText("Digital zoom 1.25×", { exact: true }).first(),
  ).toBeVisible();
  const image = page
    .getByRole("region", { name: /Microscope image/ })
    .locator("img");
  await expect(image).toHaveAttribute(
    "style",
    /translate\(5%,\s*0%\) scale\(1\.25\)/,
  );
  await page.screenshot({
    path: info.outputPath("lab-saved-views.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Next specimen" }).click();
  await expect(
    page.getByRole("button", { name: "Open saved view 1: Branch tips" }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Next specimen" }).click();
  await summary.click();
  await page
    .getByRole("button", { name: "Remove saved view 1: Branch tips" })
    .click();
  await page.getByRole("button", { name: "Undo view removal" }).click();
  await page.getByRole("button", { name: "Back to games" }).click();
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: /My Laboratory/ }).click();
  await summary.click();
  await expect(
    page.getByRole("button", { name: "Open saved view 1: Branch tips" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 320, height: 740 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await page.screenshot({
    path: info.outputPath("lab-saved-views-large-text.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  for (const name of [
    "Open saved view 1: Branch tips",
    "Remove saved view 1: Branch tips",
    "Save current view",
  ]) {
    const b = await page
      .getByRole("button", { name, exact: true })
      .boundingBox();
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
  await page.getByRole("button", { name: "Save to Lab Notebook" }).click();
  await page
    .getByRole("button", { name: "Remove saved view 1: Branch tips" })
    .click();
  await page.getByRole("button", { name: "Explore this slide again" }).click();
  await page.getByRole("button", { name: "Open Lab Notebook" }).click();
  await page
    .getByRole("searchbox", { name: "Find a saved creation" })
    .fill("Branch tips");
  await expect(
    page.getByText("1 saved microscope view: Branch tips", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Revisit specimen" }).click();
  await summary.click();
  await page
    .getByRole("button", { name: "Open saved view 1: Branch tips" })
    .click();
  await expect(
    page.getByText("Digital zoom 1.25×", { exact: true }).first(),
  ).toBeVisible();
});
