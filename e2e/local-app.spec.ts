import { test, expect } from "@playwright/test";
import { searchPacks, findWordPaths } from "../src/content/words";
test("music exercises replay separately and keep rhythm progress offline", async ({
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
  await page.getByRole("button", { name: /Music Hear/ }).click();
  await page.getByRole("tab", { name: "Earlier exercises" }).click();
  await expect(
    page.getByRole("checkbox", { name: "Sound", exact: true }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Play C", exact: true }).click();
  await page.getByRole("button", { name: "Play E", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Melody name" })
    .fill("Fictional test melody");
  await page.getByRole("button", { name: "Complete the phrase" }).click();
  await page.getByRole("button", { name: "Hint", exact: true }).click();
  await page.getByRole("button", { name: "Play F", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Hint", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Note pattern", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Hint", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Another phrase" }).click();
  await expect(
    page.getByRole("heading", { name: "Down one step" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Free piano", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Melody name" })).toHaveValue(
    "Fictional test melody",
  );
  await expect(page.getByText(/2 notes recorded/)).toBeVisible();
  await page
    .getByRole("button", { name: "Match the melody", exact: true })
    .click();
  await page.getByRole("button", { name: "Another melody" }).click();
  await page.getByRole("button", { name: "Staff", exact: true }).click();
  await page.screenshot({
    path: info.outputPath("music-melody-staff.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Choose pattern 1" }).click();
  await expect(
    page.getByRole("button", { name: "Choose pattern 2" }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Choose pattern 2" }).click();
  await expect(
    page.getByRole("button", { name: "Choose pattern 2" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Rhythm echo", exact: true }).click();
  await page.getByRole("button", { name: "Another rhythm" }).click();
  await expect(page.getByRole("heading", { name: "Two pairs" })).toBeVisible();
  for (let i = 0; i < 2; i++)
    await page.getByRole("button", { name: "Tap a beat" }).click();
  await page.getByRole("button", { name: "Back to games" }).click();
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: /Music Hear/ }).click();
  await page.getByRole("tab", { name: "Earlier exercises" }).click();
  await expect(page.getByText("2 of 4 beats tapped.")).toBeVisible();
  for (let i = 0; i < 2; i++)
    await page.getByRole("button", { name: "Tap a beat" }).click();
  await expect(page.getByRole("button", { name: "Tap a beat" })).toBeDisabled();
  await page.getByRole("button", { name: "Slower", exact: true }).click();
  await expect(page.getByRole("button", { name: "Tap a beat" })).toBeDisabled();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByText("0 of 4 beats tapped.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Two pairs" })).toBeVisible();
  await page
    .getByRole("button", { name: "Extra flexible", exact: true })
    .click();
  await page.screenshot({
    path: info.outputPath("music-rhythm-replay.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
  await page
    .getByRole("button", { name: "Match the melody", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
  await page.getByRole("button", { name: "Free piano", exact: true }).click();
  const key = await page
    .getByRole("button", { name: "Play C", exact: true })
    .boundingBox();
  expect(key!.width).toBeGreaterThanOrEqual(48);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
});
test("music audio starts only after a gesture and Stop or Sound off cancels scheduled tones", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = { contexts: 0, starts: 0, stops: 0 };
    (window as unknown as { musicAudio: typeof state }).musicAudio = state;
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor() {
        super();
        state.contexts++;
      }
      createOscillator() {
        const voice = super.createOscillator(),
          start = voice.start.bind(voice),
          stop = voice.stop.bind(voice);
        voice.start = (when?: number) => {
          state.starts++;
          start(when);
        };
        voice.stop = (when?: number) => {
          state.stops++;
          stop(when);
        };
        return voice;
      }
    };
  });
  const audio = () =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            musicAudio: { contexts: number; starts: number; stops: number };
          }
        ).musicAudio,
    );
  await page.goto("/curiousity-lab/play/");
  await page
    .getByRole("button", { name: "Play without activity history" })
    .click();
  await page.getByRole("button", { name: /Music Hear/ }).click();
  await page.getByRole("tab", { name: "Earlier exercises" }).click();
  await page
    .getByRole("button", { name: "Match the melody", exact: true })
    .click();
  await page.getByRole("button", { name: "Play / replay" }).click();
  expect((await audio()).contexts).toBe(0);
  await page.getByRole("checkbox", { name: "Sound", exact: true }).click();
  expect((await audio()).contexts).toBe(0);
  await page.getByRole("button", { name: "Play / replay" }).click();
  await expect.poll(async () => (await audio()).starts).toBe(4);
  const before = (await audio()).stops;
  await page.getByRole("button", { name: "Stop sound" }).click();
  expect((await audio()).stops).toBeGreaterThan(before);
  await page.getByRole("button", { name: "Play / replay" }).click();
  await expect.poll(async () => (await audio()).starts).toBe(8);
  const playing = (await audio()).stops;
  await page.getByRole("checkbox", { name: "Sound", exact: true }).click();
  expect((await audio()).stops).toBeGreaterThan(playing);
  await page.getByRole("button", { name: "Free piano", exact: true }).click();
  await page.getByRole("button", { name: "Play C", exact: true }).click();
  expect((await audio()).starts).toBe(8);
});
test("word search boards preserve highlights offline and support keyboard, replay and large text", async ({
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
  await page.getByRole("button", { name: "Open Word Search →" }).click();
  await expect(
    page.getByRole("heading", { name: "Quiet garden" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Another puzzle" }).click();
  const bread = findWordPaths(searchPacks[1], "BREAD")[0];
  for (const index of [bread[0], bread.at(-1)!])
    await page
      .getByRole("button", {
        name: new RegExp(
          `^Row ${Math.floor(index / 8) + 1}, column ${(index % 8) + 1}:`,
        ),
      })
      .click();
  await expect(page.getByText(/1 of 8 words found/)).toBeVisible();
  await page.getByRole("button", { name: "Hint", exact: true }).click();
  const spoon = findWordPaths(searchPacks[1], "SPOON")[0];
  const start = page.getByRole("button", {
    name: new RegExp(
      `^Row ${Math.floor(spoon[0] / 8) + 1}, column ${(spoon[0] % 8) + 1}:`,
    ),
  });
  await expect(start).toHaveClass(/hint-letter/);
  await start.focus();
  await page.keyboard.press("Enter");
  for (let i = 1; i < spoon.length; i++) await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByText(/2 of 8 words found/)).toBeVisible();
  await page.getByRole("button", { name: "Back to games" }).click();
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Open Word Search →" }).click();
  await expect(
    page.getByRole("heading", { name: "Kitchen table" }),
  ).toBeVisible();
  await expect(page.getByText(/2 of 8 words found/)).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: new RegExp(
        `^Row ${Math.floor(spoon[0] / 8) + 1}, column ${(spoon[0] % 8) + 1}:`,
      ),
    }),
  ).toHaveClass(/found-letter/);
  await page.getByRole("button", { name: "Replay this puzzle" }).click();
  await expect(
    page.getByRole("heading", { name: "Kitchen table" }),
  ).toBeVisible();
  await expect(page.getByText(/0 of 8 words found/)).toBeVisible();
  await page.getByRole("button", { name: "Another puzzle" }).click();
  await expect(
    page.getByRole("heading", { name: "At the workbench" }),
  ).toBeVisible();
  const light = findWordPaths(searchPacks[2], "LIGHT")[0];
  for (const index of [light.at(-1)!, light[0]])
    await page
      .getByRole("button", {
        name: new RegExp(
          `^Row ${Math.floor(index / 8) + 1}, column ${(index % 8) + 1}:`,
        ),
      })
      .click();
  await page.getByRole("button", { name: "Hint", exact: true }).click();
  await page.screenshot({
    path: info.outputPath("word-search-workbench.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 900 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
  ).toBe(false);
  const size = await page
    .getByRole("group", { name: "Word search", exact: true })
    .getByRole("button")
    .first()
    .boundingBox();
  expect(size!.width).toBeGreaterThanOrEqual(48);
  expect(size!.height).toBeGreaterThanOrEqual(48);
  await page.screenshot({
    path: info.outputPath("word-search-large-text.png"),
    fullPage: true,
  });
});
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
  await page.getByRole("tab", { name: "Microscope & notebook" }).click();
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
  await page.getByRole("tab", { name: "Earlier exercises" }).click();
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

test.describe("synthetic connected family", () => {
  // The offline shell is covered above. These transport fixtures must intercept
  // every reload, so use a fresh context without service-worker interception.
  test.use({ serviceWorkers: "block" });
  // Synthetic transport only inside this browser test. Production has no fixture switch.
  async function mockConnectedFamily(page: import("@playwright/test").Page) {
    await page.route("**/assets/client-*.js", async (route) => {
      await route.fulfill({
        contentType: "text/javascript",
        body: `
      export function familyClient(config, role) {
        return { watch(notify) { notify({ status: "approved", uid: "synthetic-player", membership: { schemaVersion: 1, familyId: "synthetic-family", subjectId: "synthetic-subject", role, status: "active" } }); return () => {}; }, watchDevices(id, notify) { notify([]); return () => {}; } };
      }
    `,
      });
    });
  }
  for (const role of ["play", "companion", "insights"]) {
    test(`${role} shows the connected home without claiming shared activity`, async ({
      page,
    }, info) => {
      await mockConnectedFamily(page);
      await page.goto(`/curiousity-lab/${role}/`);
      if (role === "play")
        await expect(
          page.getByText(/Connected to your family. Your games stay/),
        ).toBeVisible();
      else {
        await expect(
          page.getByRole("heading", { name: "Connected to your family" }),
        ).toBeVisible();
        await expect(
          page.getByText(/Activity sharing has not started/),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Manage family connection" }),
        ).toBeVisible();
      }
      await page.screenshot({
        path: info.outputPath(`${role}-connected-synthetic.png`),
        fullPage: true,
      });
    });
  }
  test("connected Play saves explicit sharing preparation locally across reload and deletes copies", async ({
    page,
  }, info) => {
    await mockConnectedFamily(page);
    await page.goto("/curiousity-lab/play/");
    await expect(
      page.getByText(/Connected to your family. Your games stay/),
    ).toBeVisible();
    await expect(
      page.getByText("Saved on this device", { exact: true }),
    ).toBeVisible();
    await page.evaluate(async () => {
      const request = indexedDB.open("curiosity-lab:v1:play:guest", 1);
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const tx = db.transaction("state", "readwrite");
      tx.objectStore("state").put(
        {
          schemaVersion: 1,
          installationRole: "play",
          authenticatedUid: null,
          preferences: {
            theme: "light",
            textSize: "normal",
            sound: false,
            volume: 0.25,
            history: true,
            welcomeDone: true,
          },
          drafts: {},
          creations: [],
          sessions: [
            {
              id: "synthetic-session",
              schemaVersion: 1,
              appVersion: "0.4.0",
              contentVersion: "1",
              game: "sudoku",
              puzzleId: "synthetic-puzzle",
              startedAt: "2020-01-01T00:00:00.000Z",
              endedAt: "2020-01-01T00:01:00.000Z",
              activeMs: 60000,
              hints: 1,
              undos: 0,
              outcome: "completed",
              mode: "4x4:Relaxed",
              attempt: 1,
              source: "local-guest",
            },
          ],
        },
        "current",
      );
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    });
    await page.reload();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(
      page.getByText("0 prepared records on this device · Not uploaded"),
    ).toBeVisible();
    await page.getByLabel(/This is my personal device; keep/).check();
    await page.getByLabel(/Insights: activity/).check();
    await page.getByLabel(/Companion: activity names/).check();
    await page
      .getByRole("button", { name: "Save preparation choices" })
      .click();
    await expect(
      page.getByText("Choices saved on this device. Nothing was uploaded."),
    ).toBeVisible();
    await page
      .getByText("Select older activity explicitly", { exact: true })
      .click();
    await page.getByLabel(/sudoku · 4x4:Relaxed/).check();
    await page
      .getByRole("button", { name: "Prepare selected activity" })
      .click();
    await expect(
      page.getByText("2 prepared records on this device · Not uploaded"),
    ).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(
      page.getByText("2 prepared records on this device · Not uploaded"),
    ).toBeVisible();
    await page.locator(".sharing-preparation").screenshot({
      path: info.outputPath("sharing-preparation-synthetic.png"),
    });
    await page
      .getByRole("button", {
        name: "Stop preparation and remove prepared copies",
      })
      .click();
    await expect(
      page.getByText("0 prepared records on this device · Not uploaded"),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
    ).toBe(false);
  });
});

test("local backup preview, cancellation, restore, undo and full deletion", async ({
  page,
}, info) => {
  await page.goto("/curiousity-lab/play/");
  await page
    .getByRole("button", { name: "Play without activity history" })
    .click();
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const backup = {
    schemaVersion: 1,
    installationRole: "play",
    authenticatedUid: null,
    preferences: {
      theme: "light",
      textSize: "normal",
      sound: false,
      volume: 0.25,
      history: false,
      welcomeDone: true,
    },
    drafts: {},
    sessions: [],
    creations: [
      {
        id: "synthetic-notebook",
        kind: "notebook",
        title: "Fictional backup notebook",
        savedAt: "2026-10-10T00:00:00.000Z",
        text: "Fictional specimen notes",
      },
    ],
  };
  const file = {
    name: "synthetic-play-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  };
  await page.getByLabel("Restore this app’s JSON backup").setInputFiles(file);
  const preview = page.getByRole("region", { name: "Restore preview" });
  await expect(preview).toBeVisible();
  await preview.screenshot({
    path: info.outputPath("restore-preview-synthetic.png"),
  });
  await page.getByRole("button", { name: "Cancel restore" }).click();
  await expect(preview).not.toBeVisible();
  await expect(
    page.getByText("Previous saves before restoring (0)"),
  ).toBeVisible();
  await page.getByLabel("Restore this app’s JSON backup").setInputFiles(file);
  await page
    .getByRole("button", { name: "Restore this backup", exact: true })
    .click();
  await expect(page.getByText(/Backup restored on this device/)).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByText("Previous saves before restoring (1)").click();
  await page.getByRole("button", { name: "Review previous save 1" }).click();
  await expect(
    page.getByText("Previous local save", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Restore this backup", exact: true })
    .click();
  await expect(page.getByText(/Backup restored on this device/)).toBeVisible();
  await page
    .locator(".recovery-panel")
    .screenshot({ path: info.outputPath("restore-undo-synthetic.png") });
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Remove this app’s local data", exact: true })
    .click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(
    page.getByText("Previous saves before restoring (0)"),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});
test("corrupt and wrong-role backups cannot replace local data", async ({
  page,
}) => {
  await page.goto("/curiousity-lab/play/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  for (const bytes of [
    "broken json",
    JSON.stringify({ schemaVersion: 1, installationRole: "insights" }),
  ]) {
    await page.getByLabel("Restore this app’s JSON backup").setInputFiles({
      name: "unsupported.json",
      mimeType: "application/json",
      buffer: Buffer.from(bytes),
    });
    await expect(
      page.getByText(
        "This file is not a supported backup for this app. Your existing data is unchanged.",
      ),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Restore preview" }),
    ).not.toBeVisible();
  }
  await expect(
    page.getByText("Previous saves before restoring (0)"),
  ).toBeVisible();
});
