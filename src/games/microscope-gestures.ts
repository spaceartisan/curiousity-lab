export interface MicroscopeView {
  zoom: number;
  pan: number[];
}
export interface ViewPoint {
  x: number;
  y: number;
}
export interface ViewBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}
const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));
const midpoint = (points: ViewPoint[]) => ({
  x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
  y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
});
// Coordinates are transient screen inputs. Only the returned bounded display
// settings can enter the existing save-game contract, once a gesture finishes.
export function gestureView(
  view: MicroscopeView,
  start: ViewPoint[],
  current: ViewPoint[],
  bounds: ViewBounds,
): MicroscopeView {
  if (
    start.length < 1 ||
    start.length > 2 ||
    current.length !== start.length ||
    ![
      bounds.left,
      bounds.top,
      bounds.width,
      bounds.height,
      ...start.flatMap((p) => [p.x, p.y]),
      ...current.flatMap((p) => [p.x, p.y]),
    ].every(Number.isFinite) ||
    bounds.width <= 0 ||
    bounds.height <= 0
  )
    return { zoom: view.zoom, pan: [...view.pan] };
  const a = midpoint(start),
    b = midpoint(current);
  let zoom = view.zoom;
  if (start.length === 2) {
    const distance = Math.hypot(
      start[1].x - start[0].x,
      start[1].y - start[0].y,
    );
    if (distance > 0)
      zoom = clamp(
        (view.zoom *
          Math.hypot(
            current[1].x - current[0].x,
            current[1].y - current[0].y,
          )) /
          distance,
        1,
        3,
      );
  }
  // Keep the image point under the initial midpoint under the moving midpoint.
  // CSS translation percentages refer to the full image element, including its
  // object-fit letterbox, so use viewport dimensions rather than source pixels.
  const before = [
    a.x - bounds.left - bounds.width / 2,
    a.y - bounds.top - bounds.height / 2,
  ];
  const after = [
    b.x - bounds.left - bounds.width / 2,
    b.y - bounds.top - bounds.height / 2,
  ];
  const pan = [bounds.width, bounds.height].map((size, i) => {
    const imagePoint = (before[i] - (view.pan[i] * size) / 100) / view.zoom;
    return clamp(((after[i] - imagePoint * zoom) / size) * 100, -35, 35);
  });
  return { zoom, pan };
}
