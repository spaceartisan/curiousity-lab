import { test, expect } from "@playwright/test";
test("player save/resume, scoped offline shell, and screenshots", async ({
  page,
  context,
}, info) => {
  await page.goto("/curiousity-lab/play/");
  await page
    .getByRole("button", { name: "Play without activity history" })
    .click();
  await expect(
    page.getByRole("heading", { name: /What would you like/ }),
  ).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.screenshot({
    path: info.outputPath("play-library.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: /Numbers Settle/ }).click();
  await page
    .getByRole("button", { name: /Row.*empty/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Hint", exact: true }).click();
  await page.getByRole("button", { name: "Back to games" }).click();
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /Numbers Settle/ }).click();
  await expect(
    page.getByRole("group", { name: "9 by 9 Sudoku" }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("sudoku.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Back to games" }).click();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: /My Laboratory Take/ }).click();
  await page.getByRole("button", { name: /Fungal forms Explore/ }).click();
  await expect(
    page.getByRole("region", { name: /Microscope image/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: /Microscope image/ }).locator("img"),
  ).toHaveJSProperty("naturalWidth", 700);
  await page.getByRole("button", { name: "Save to Lab Notebook" }).click();
  await expect(
    page.getByText("Saved to your Lab Notebook in My Creations."),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("laboratory-offline.png"),
    fullPage: true,
  });
  const clipping = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(clipping).toBe(false);
});
for (const role of ["companion", "insights"])
  test(`${role} launches directly with no family records`, async ({
    page,
  }, info) => {
    await page.goto(`/curiousity-lab/${role}/`);
    await expect(
      page.getByRole("heading", { name: "Family sharing is not connected" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "View a fictional example" })
      .click();
    await expect(
      page.getByText("Fictional example · No family data"),
    ).toBeVisible();
    await page.screenshot({
      path: info.outputPath(role + "-example.png"),
      fullPage: true,
    });
    const manifest = await page
      .locator("link[rel=manifest]")
      .getAttribute("href");
    expect(manifest).toBe("./manifest.webmanifest");
  });

test("settings stays local-only and selected controls remain readable", async ({
  page,
}, info) => {
  await page.goto("/curiousity-lab/play/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Family connection" }),
  ).toBeVisible();
  // CI may have the optional public web config, but never real auth/family fixtures.
  const prompt = page.getByRole("button", { name: "Sign in with Google" });
  if (await prompt.isVisible()) await expect(prompt).toBeEnabled();
  await page.getByRole("combobox", { name: "Theme", exact: true }).selectOption("dark");
  await page.screenshot({
    path: info.outputPath("settings-dark.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
  await page.getByRole("button", { name: "Back to games" }).click();
  await page.getByRole("button", { name: /Music Hear/ }).click();
  const selected = page.getByRole("button", {
    name: "Free piano",
    exact: true,
  });
  await expect(selected).toHaveAttribute("aria-pressed", "true");
  const colors = await selected.evaluate((element) => {
    const style = getComputedStyle(element);
    return { text: style.color, background: style.backgroundColor };
  });
  expect(colors.text).toBe("rgb(20, 40, 35)");
  expect(colors.background).toBe("rgb(178, 220, 200)");
  await page.screenshot({
    path: info.outputPath("music-dark.png"),
    fullPage: true,
  });
});
