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
  const prompt = page.getByRole("button", { name: "Connect", exact: true });
  const policy = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute("content");
  if (policy?.includes("firestore.googleapis.com")) {
    await expect(prompt).toBeVisible();
    await expect(prompt).toBeDisabled();
    await page.getByLabel("Connection code").fill("123456");
    await prompt.click();
    await expect(page.getByRole("alert")).toContainText("Paste the complete");
    await expect(
      page.getByRole("button", { name: "Sign in with Google" }),
    ).not.toBeVisible();
  } else await expect(prompt).not.toBeVisible();
  await page
    .getByRole("combobox", { name: "Theme", exact: true })
    .selectOption("dark");
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

for (const role of ["play", "companion"]) {
  test(`${role} invitation opens a simple code screen and removes the bearer from the URL`, async ({
    page,
  }, info) => {
    await page.goto(`/curiousity-lab/${role}/#connect=${"0".repeat(32)}`);
    await expect(
      page.getByRole("heading", { name: "Connect your app" }),
    ).toBeVisible();
    await expect(page).toHaveURL(new RegExp(`/curiousity-lab/${role}/$`));
    const policy = await page
      .locator('meta[http-equiv="Content-Security-Policy"]')
      .getAttribute("content");
    if (policy?.includes("firestore.googleapis.com")) {
      await expect(page.getByLabel("Connection code")).toHaveValue(
        "0".repeat(32),
      );
      await expect(
        page.getByRole("button", { name: "Connect", exact: true }),
      ).toBeEnabled();
      await expect(
        page.getByRole("button", { name: "Sign in with Google" }),
      ).not.toBeVisible();
      await expect(page.getByLabel("Connection code")).toBeInViewport();
    }
    await page.screenshot({
      path: info.outputPath(`${role}-connection.png`),
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
  });
}
test("Insights owner has Google setup without a parent code prompt", async ({
  page,
}, info) => {
  await page.goto("/curiousity-lab/insights/");
  await page.getByRole("button", { name: "Connect your family" }).click();
  const policy = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute("content");
  if (policy?.includes("firestore.googleapis.com")) {
    await expect(
      page.getByRole("button", { name: "Sign in with Google" }),
    ).toBeEnabled();
    await expect(page.getByLabel("Connection code")).not.toBeVisible();
  }
  await page.screenshot({
    path: info.outputPath("owner-connection.png"),
    fullPage: true,
  });
});
