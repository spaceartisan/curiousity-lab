import { test, expect } from "@playwright/test";

const noOverflow = async (page: import("@playwright/test").Page) =>
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    ),
  ).toBeLessThanOrEqual(0);

test("Companion fictional week, starters and day details", async ({ page }) => {
  await page.goto("/curiousity-lab/companion/");
  await page.getByRole("button", { name: "View a fictional example" }).click();
  await expect(page.getByRole("heading", { name: "This week" })).toBeVisible();
  const days = page
    .getByRole("group", { name: "Days this week" })
    .getByRole("button");
  await expect(days).toHaveCount(7);
  await days.first().click();
  await expect(days.first()).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("heading", { name: "Something to talk about" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "A lab case" }).click();
  await page
    .getByRole("combobox", { name: "Choose" })
    .selectOption({ index: 1 });
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    page.getByText("This is the fictional example, so nothing was sent."),
  ).toBeVisible();
  await noOverflow(page);
});

test("Insights fictional dashboard reads out charts and exports", async ({
  page,
}) => {
  await page.goto("/curiousity-lab/insights/");
  await page.getByRole("button", { name: "View a fictional example" }).click();
  await expect(
    page.getByRole("heading", { name: "Every day, last 12 weeks" }),
  ).toBeVisible();
  const day = page.locator("rect.heat").nth(10);
  await day.click();
  await expect(page.locator(".viz-readout").first()).toContainText(
    /min|nothing played/,
  );
  await page.getByRole("button", { name: "From the score" }).click();
  await expect(
    page.getByRole("button", { name: "From the score" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Everything" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download CSV" }).click();
  expect((await download).suggestedFilename()).toMatch(
    /^curiosity-lab-fictional-.*\.csv$/,
  );
  await noOverflow(page);
});
