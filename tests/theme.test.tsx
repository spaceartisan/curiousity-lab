import { it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { App } from "../src/App";
import { clearState, loadState } from "../src/storage/local";

function mockDevice(dark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: dark,
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
}
beforeEach(async () => {
  vi.unstubAllGlobals();
  await clearState("play");
});

it("follows the device by default and the header switch picks a theme", async () => {
  mockDevice(true);
  const { container } = render(<App appRole="play" />);
  await screen.findByRole("button", { name: "Switch to light theme" });
  expect(container.querySelector(".app")).toHaveClass("theme-dark");
  expect(document.documentElement.dataset.theme).toBe("dark");
  fireEvent.click(
    screen.getByRole("button", { name: "Switch to light theme" }),
  );
  expect(container.querySelector(".app")).toHaveClass("theme-light");
  await waitFor(async () =>
    expect((await loadState("play")).preferences.theme).toBe("light"),
  );
});

it("offers Match this device, Light and Dark in Settings", async () => {
  mockDevice(false);
  const { container } = render(<App appRole="companion" />);
  fireEvent.click(await screen.findByRole("button", { name: /Settings/ }));
  const select = screen.getByLabelText(/Theme/) as HTMLSelectElement;
  expect([...select.options].map((o) => o.text)).toEqual([
    "Match this device",
    "Light",
    "Dark",
  ]);
  expect(select.value).toBe("system");
  expect(container.querySelector(".app")).toHaveClass("theme-light");
  fireEvent.change(select, { target: { value: "dark" } });
  expect(container.querySelector(".app")).toHaveClass("theme-dark");
});
