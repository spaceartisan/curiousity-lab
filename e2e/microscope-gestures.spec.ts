import { test, expect } from "@playwright/test";
test("real drag/pinch input saves a bounded view offline without blocking page scrolling or keyboard alternatives", async ({
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
  await page.getByRole("button", { name: /My Laboratory/ }).click();
  await page
    .getByRole("button", { name: "Explore Microscope", exact: true })
    .click();
  const viewer = page.getByRole("region", { name: /Microscope image/ });
  const image = viewer.locator("img");
  await expect(
    page.getByText("Microscope controls", { exact: true }).locator(".."),
  ).not.toHaveAttribute("open", "");
  await viewer.scrollIntoViewIfNeeded();
  const box = (await viewer.boundingBox())!;
  const x = box.x + box.width / 2,
    y = box.y + box.height / 2;
  const readView = () =>
    image.evaluate((el) => {
      const m = el.style.transform.match(
        /translate\(([-\d.]+)%,\s*([-\d.]+)%\) scale\(([\d.]+)\)/,
      )!;
      return { pan: [Number(m[1]), Number(m[2])], zoom: Number(m[3]) };
    });
  if (info.project.name === "phone-chromium") {
    const cdp = await context.newCDPSession(page);
    const touch = (
      type: "touchStart" | "touchMove" | "touchEnd" | "touchCancel",
      touchPoints: { x: number; y: number; id: number }[],
    ) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints });
    await touch("touchStart", [{ x, y, id: 1 }]);
    await touch("touchMove", [{ x: x + 30, y: y + 10, id: 1 }]);
    await touch("touchEnd", []);
    let v = await readView();
    expect(v.pan[0]).toBeCloseTo((30 / box.width) * 100, 1);
    expect(v.pan[1]).toBeCloseTo((10 / box.height) * 100, 1);
    await touch("touchStart", [
      { x: x - 30, y, id: 1 },
      { x: x + 30, y, id: 2 },
    ]);
    await touch("touchMove", [
      { x: x - 60, y, id: 1 },
      { x: x + 60, y, id: 2 },
    ]);
    await touch("touchEnd", []);
    v = await readView();
    expect(v.zoom).toBeCloseTo(2, 1);
    const beforeCancel = await image.getAttribute("style");
    await touch("touchStart", [{ x, y, id: 1 }]);
    await touch("touchMove", [{ x: x - 25, y, id: 1 }]);
    await touch("touchCancel", []);
    await expect(image).toHaveAttribute("style", beforeCancel!);
    // Outside the image, ordinary touch page scrolling remains available.
    const scrollBefore = await page.evaluate(() => window.scrollY);
    await touch("touchStart", [{ x: 5, y: 650, id: 1 }]);
    for (let y = 600; y >= 300; y -= 50)
      await touch("touchMove", [{ x: 5, y, id: 1 }]);
    await touch("touchEnd", []);
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(scrollBefore);
    await cdp.detach();
  } else {
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 30, y + 10, { steps: 5 });
    await page.mouse.up();
    let v = await readView();
    expect(v.pan[0]).toBeCloseTo((30 / box.width) * 100, 1);
    expect(v.pan[1]).toBeCloseTo((10 / box.height) * 100, 1);
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width + 100, y, { steps: 6 });
    await page.mouse.up();
    v = await readView();
    expect(v.pan[0]).toBe(35);
    await viewer.focus();
    await page.keyboard.press("+");
    expect((await readView()).zoom).toBe(1.25);
  }
  const finalView = await image.getAttribute("style");
  await page.getByRole("button", { name: "Back to games" }).click();
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: /My Laboratory/ }).click();
  await expect(image).toHaveAttribute("style", finalView!);
  await page.screenshot({
    path: info.outputPath("microscope-gestures.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await page.getByText("Microscope controls", { exact: true }).click();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  for (const name of [
    "Zoom in",
    "Zoom out",
    "Reset view",
    "Move left",
    "Move right",
  ]) {
    const b = (await page
      .getByRole("button", { name, exact: true })
      .boundingBox())!;
    expect(b.width).toBeGreaterThanOrEqual(48);
    expect(b.height).toBeGreaterThanOrEqual(48);
  }
  await page.screenshot({
    path: info.outputPath("microscope-gestures-large-text.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Reset view" }).click();
  await viewer.focus();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("+");
  const v = await readView();
  expect(v).toEqual({ zoom: 1.25, pan: [5, 0] });
  await page.getByRole("button", { name: "Save to Lab Notebook" }).click();
  await page.getByRole("button", { name: "Reset view" }).click();
  await page.getByRole("button", { name: "Open Lab Notebook" }).click();
  await page.getByRole("button", { name: "Revisit specimen" }).click();
  expect(await readView()).toEqual(v);
});
