import { expect, test } from "@playwright/test";

test("work up a bench unknown and count a differential", async ({ page }) => {
  await page.goto("/curiousity-lab/play/");
  await page
    .getByRole("button", { name: "Play without activity history" })
    .click();
  await page.getByRole("button", { name: /My Laboratory/ }).click();
  await page.getByRole("button", { name: /Sour crop/ }).click();
  await page.getByRole("button", { name: "Read the slide" }).click();
  await page
    .getByRole("button", { name: "Take the plates out of the incubator" })
    .click();
  await page.getByRole("button", { name: "Germ tube", exact: true }).click();
  const photo = page.locator(".worksheet img").first();
  await expect(photo).toBeVisible();
  expect(
    await photo.evaluate((img: HTMLImageElement) => img.naturalWidth),
  ).toBeGreaterThan(100);
  await page.locator(".signout select").selectOption("candida-albicans");
  await page.getByRole("button", { name: "Sign out the report" }).click();
  await expect(
    page.getByText("Agrees with the reference identification."),
  ).toBeVisible();

  await page.getByRole("tab", { name: "Hematology" }).click();
  await page.getByRole("button", { name: /A baby with coughing fits/ }).click();
  for (let i = 0; i < 100; i++)
    await page.getByRole("button", { name: /^Lymph/ }).click();
  await expect(page.getByText("Your differential")).toBeVisible();
  await page.screenshot({
    path: "test-results/lab-differential.png",
    fullPage: true,
  });
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});
