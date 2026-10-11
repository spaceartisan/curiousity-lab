import { expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { gestureView } from "../src/games/microscope-gestures";
import { MicroscopeViewport } from "../src/games/MicroscopeViewport";
import { App } from "../src/App";
import { emptyState } from "../src/storage/contracts";
import { clearState, loadState, saveState } from "../src/storage/local";
import type { LabData } from "../src/content/laboratory";
const bounds = { left: 0, top: 0, width: 400, height: 200 };
const initial = { zoom: 1, pan: [0, 0] };
function prepare(node: HTMLElement) {
  const capture = new Set<number>();
  node.getBoundingClientRect = () => ({
    ...bounds,
    right: 400,
    bottom: 200,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  });
  node.setPointerCapture = (id) => {
    capture.add(id);
  };
  node.hasPointerCapture = (id) => capture.has(id);
  node.releasePointerCapture = (id) => {
    capture.delete(id);
  };
  return capture;
}
function pointer(
  node: HTMLElement,
  kind: string,
  id: number,
  x: number,
  y: number,
  button = 0,
) {
  const e = new MouseEvent(`pointer${kind}`, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button,
  });
  Object.defineProperties(e, {
    pointerId: { value: id },
    pointerType: { value: "touch" },
  });
  fireEvent(node, e);
}
beforeEach(async () => {
  await clearState("play");
});
it("drag uses viewport percentages, pinch preserves the actual image point under a moving midpoint, and limits stay finite", () => {
  expect(
    gestureView(initial, [{ x: 100, y: 100 }], [{ x: 140, y: 70 }], bounds),
  ).toEqual({ zoom: 1, pan: [10, -15] });
  const start = [
    { x: 100, y: 100 },
    { x: 200, y: 100 },
  ];
  const result = gestureView(
    initial,
    start,
    [
      { x: 70, y: 100 },
      { x: 270, y: 100 },
    ],
    bounds,
  );
  expect(result).toEqual({ zoom: 2, pan: [17.5, 0] });
  // The same point is -50 CSS pixels from center before and +20-50 after.
  expect(-50 * result.zoom + (result.pan[0] / 100) * bounds.width).toBe(-30);
  const large = gestureView(
    initial,
    start,
    [
      { x: -900, y: 500 },
      { x: 1100, y: 500 },
    ],
    bounds,
  );
  expect(large.zoom).toBe(3);
  expect(large.pan).toEqual([12.5, 35]);
  const tiny = gestureView(
    { zoom: 2, pan: [10, -5] },
    start,
    [
      { x: 100, y: 100 },
      { x: 101, y: 100 },
    ],
    bounds,
  );
  expect(tiny.zoom).toBe(1);
  expect(
    gestureView(
      initial,
      [
        { x: 100, y: 100 },
        { x: 100, y: 100 },
      ],
      start,
      bounds,
    ).zoom,
  ).toBe(1);
  for (const invalid of [
    { ...bounds, width: 0 },
    { ...bounds, height: NaN },
  ])
    expect(gestureView(initial, start, start, invalid)).toEqual(initial);
  expect(
    gestureView(
      initial,
      start,
      [
        { x: Infinity, y: 0 },
        { x: 0, y: 0 },
      ],
      bounds,
    ),
  ).toEqual(initial);
});
it("pointer capture continues outside the viewport and commits once after the final pointer, with continuous one/two/one transitions and no third-pointer takeover", () => {
  const commit = vi.fn();
  render(
    <MicroscopeViewport
      src="slide.webp"
      description="Source image"
      view={initial}
      onView={commit}
    />,
  );
  const node = screen.getByRole("region"),
    captures = prepare(node);
  pointer(node, "down", 1, 100, 100);
  pointer(node, "move", 1, 140, 100);
  expect(commit).not.toHaveBeenCalled();
  pointer(node, "down", 2, 240, 100);
  pointer(node, "down", 3, 300, 100);
  pointer(node, "move", 3, 900, 900);
  expect(captures).toEqual(new Set([1, 2]));
  pointer(node, "move", 1, 90, 100);
  pointer(node, "move", 2, 290, 100);
  expect(node.querySelector("img")!.style.transform).toBe(
    "translate(22.5%,0%) scale(2)",
  );
  pointer(node, "up", 2, 290, 100);
  expect(commit).not.toHaveBeenCalled();
  pointer(node, "move", 1, 110, 120);
  pointer(node, "up", 1, 110, 120);
  expect(commit).toHaveBeenCalledTimes(1);
  expect(commit.mock.calls[0][0].zoom).toBe(2);
  expect(commit.mock.calls[0][0].pan[0]).toBeCloseTo(27.5);
  expect(commit.mock.calls[0][0].pan[1]).toBe(10);
  expect(captures.size).toBe(0);
  expect(node).not.toHaveAttribute("data-dragging");
});
it("cancel, lost capture, Escape, window blur and external resets discard incomplete views; non-primary buttons never start a gesture", () => {
  const commit = vi.fn();
  const rendered = render(
    <MicroscopeViewport
      src="slide.webp"
      description="Source image"
      view={initial}
      onView={commit}
    />,
  );
  const node = screen.getByRole("region"),
    captures = prepare(node);
  pointer(node, "down", 1, 100, 100, 2);
  expect(captures.size).toBe(0);
  for (const cancel of [
    () => pointer(node, "cancel", 1, 150, 100),
    () =>
      fireEvent(
        node,
        Object.assign(new Event("lostpointercapture", { bubbles: true }), {
          pointerId: 1,
        }),
      ),
    () => fireEvent.keyDown(node, { key: "Escape" }),
    () => fireEvent(window, new Event("blur")),
    () => fireEvent(window, new Event("resize")),
  ]) {
    pointer(node, "down", 1, 100, 100);
    pointer(node, "move", 1, 150, 100);
    cancel();
    pointer(node, "up", 1, 150, 100);
    expect(commit).not.toHaveBeenCalled();
    expect(node.querySelector("img")!.style.transform).toBe(
      "translate(0%,0%) scale(1)",
    );
    expect(captures.size).toBe(0);
  }
  pointer(node, "down", 1, 100, 100);
  pointer(node, "move", 1, 150, 100);
  rendered.rerender(
    <MicroscopeViewport
      src="slide.webp"
      description="Source image"
      view={{ zoom: 1.25, pan: [5, 0] }}
      onView={commit}
    />,
  );
  pointer(node, "up", 1, 150, 100);
  expect(commit).not.toHaveBeenCalled();
  expect(node.querySelector("img")!.style.transform).toBe(
    "translate(5%,0%) scale(1.25)",
  );
  fireEvent.keyDown(node, { key: "ArrowRight" });
  expect(commit).toHaveBeenLastCalledWith({ zoom: 1.25, pan: [10, 0] });
});
it.each([false, true])(
  "history=%s saves only the final bounded view, reloads it, and notebook snapshots and finalized history remain unchanged by later gestures",
  async (history) => {
    const state = emptyState("play");
    state.preferences.welcomeDone = true;
    state.preferences.history = history;
    await saveState(state);
    const user = userEvent.setup(),
      rendered = render(<App appRole="play" />);
    await user.click(
      await screen.findByRole("button", { name: /My Laboratory/ }),
    );
    await user.click(
      screen.getByRole("button", { name: "Explore Microscope" }),
    );
    let node = screen.getByRole("region", { name: /Microscope image/ });
    prepare(node);
    pointer(node, "down", 1, 100, 100);
    for (let x = 110; x <= 140; x += 10) pointer(node, "move", 1, x, 100);
    await waitFor(() =>
      expect(screen.getByText("Saved on this device")).toBeInTheDocument(),
    );
    expect(((await loadState("play")).drafts.lab!.data as LabData).pan).toEqual(
      [0, 0],
    );
    pointer(node, "up", 1, 140, 100);
    await waitFor(async () =>
      expect(
        ((await loadState("play")).drafts.lab!.data as LabData).pan,
      ).toEqual([10, 0]),
    );
    rendered.unmount();
    render(<App appRole="play" />);
    await user.click(
      await screen.findByRole("button", { name: /My Laboratory/ }),
    );
    node = screen.getByRole("region", { name: /Microscope image/ });
    prepare(node);
    expect(node.querySelector("img")!.style.transform).toBe(
      "translate(10%,0%) scale(1)",
    );
    await user.click(
      screen.getByRole("button", { name: "Save to Lab Notebook" }),
    );
    await waitFor(async () =>
      expect((await loadState("play")).creations).toHaveLength(1),
    );
    const saved = await loadState("play");
    pointer(node, "down", 1, 100, 100);
    pointer(node, "up", 1, 120, 100);
    await waitFor(async () =>
      expect(
        ((await loadState("play")).drafts.lab!.data as LabData).pan,
      ).toEqual([15, 0]),
    );
    const later = await loadState("play");
    expect(later.creations).toEqual(saved.creations);
    expect(later.sessions).toEqual(saved.sessions);
    expect(Object.keys(later.drafts.lab!.data as LabData).sort()).not.toContain(
      "pointers",
    );
    expect(JSON.stringify(later)).not.toMatch(
      /clientX|clientY|pointerId|baseline|preview/,
    );
    await user.click(screen.getByRole("button", { name: "Open Lab Notebook" }));
    await user.click(screen.getByRole("button", { name: "Revisit specimen" }));
    expect(
      screen
        .getByRole("region", { name: /Microscope image/ })
        .querySelector("img")!.style.transform,
    ).toBe("translate(10%,0%) scale(1)");
  },
);
