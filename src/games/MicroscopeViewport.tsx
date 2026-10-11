import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  gestureView,
  type MicroscopeView,
  type ViewBounds,
  type ViewPoint,
} from "./microscope-gestures";

export function MicroscopeViewport({
  src,
  description,
  view,
  onView,
}: {
  src: string;
  description: string;
  view: MicroscopeView;
  onView: (value: MicroscopeView) => void;
}) {
  const element = useRef<HTMLDivElement>(null);
  const gesture = useRef<{
    pointers: Map<number, ViewPoint>;
    start: ViewPoint[];
    baseline: MicroscopeView;
    preview: MicroscopeView;
    bounds: ViewBounds;
  } | null>(null);
  const [preview, setPreview] = useState<MicroscopeView | null>(null);
  const current = preview ?? view;
  function cancel() {
    const ids = [...(gesture.current?.pointers.keys() ?? [])];
    gesture.current = null;
    setPreview(null);
    for (const id of ids)
      if (element.current?.hasPointerCapture(id))
        element.current.releasePointerCapture(id);
  }
  useEffect(() => {
    cancel();
  }, [view.zoom, view.pan[0], view.pan[1], src]);
  useEffect(() => {
    const hidden = () => {
      if (document.hidden) cancel();
    };
    window.addEventListener("blur", cancel);
    window.addEventListener("resize", cancel);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      gesture.current = null;
      window.removeEventListener("blur", cancel);
      window.removeEventListener("resize", cancel);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);
  function point(e: PointerEvent): ViewPoint {
    return { x: e.clientX, y: e.clientY };
  }
  function down(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || gesture.current?.pointers.size === 2) return;
    const p = point(e);
    if (![p.x, p.y].every(Number.isFinite)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    e.preventDefault();
    e.currentTarget.focus({ preventScroll: true });
    e.currentTarget.setPointerCapture(e.pointerId);
    if (!gesture.current)
      gesture.current = {
        pointers: new Map(),
        start: [],
        baseline: { zoom: view.zoom, pan: [...view.pan] },
        preview: { zoom: view.zoom, pan: [...view.pan] },
        bounds: {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        },
      };
    const g = gesture.current;
    g.pointers.set(e.pointerId, p);
    g.start = [...g.pointers.values()];
    g.baseline = g.preview;
    setPreview(g.preview);
  }
  function move(e: PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g?.pointers.has(e.pointerId)) return;
    const p = point(e);
    if (![p.x, p.y].every(Number.isFinite)) return;
    e.preventDefault();
    g.pointers.set(e.pointerId, p);
    g.preview = gestureView(
      g.baseline,
      g.start,
      [...g.pointers.values()],
      g.bounds,
    );
    setPreview(g.preview);
  }
  function up(e: PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g?.pointers.has(e.pointerId)) return;
    move(e);
    g.pointers.delete(e.pointerId);
    if (g.pointers.size) {
      g.start = [...g.pointers.values()];
      g.baseline = g.preview;
    } else {
      gesture.current = null;
      setPreview(null);
      if (
        g.preview.zoom !== view.zoom ||
        g.preview.pan.some((n, i) => n !== view.pan[i])
      )
        onView(g.preview);
    }
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  }
  return (
    <div
      ref={element}
      className="microscope"
      tabIndex={0}
      role="region"
      aria-label="Microscope image. Drag to pan; pinch with two fingers to adjust digital zoom. Arrow keys move the image; plus and minus adjust digital zoom."
      data-dragging={preview !== null ? "true" : undefined}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={(e) => {
        if (gesture.current?.pointers.has(e.pointerId)) cancel();
      }}
      onLostPointerCapture={(e) => {
        if (gesture.current?.pointers.has(e.pointerId)) cancel();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          cancel();
          return;
        }
        if (
          ![
            "ArrowLeft",
            "ArrowRight",
            "ArrowUp",
            "ArrowDown",
            "+",
            "-",
            "=",
          ].includes(e.key)
        )
          return;
        e.preventDefault();
        cancel();
        const pan = [...view.pan];
        if (e.key === "ArrowLeft") pan[0] -= 5;
        if (e.key === "ArrowRight") pan[0] += 5;
        if (e.key === "ArrowUp") pan[1] -= 5;
        if (e.key === "ArrowDown") pan[1] += 5;
        let zoom = view.zoom;
        if (e.key === "+" || e.key === "=") zoom += 0.25;
        if (e.key === "-") zoom -= 0.25;
        onView({
          zoom: Math.max(1, Math.min(3, zoom)),
          pan: pan.map((n) => Math.max(-35, Math.min(35, n))),
        });
      }}
    >
      <img
        src={src}
        alt={description}
        draggable={false}
        style={{
          transform: `translate(${current.pan[0]}%,${current.pan[1]}%) scale(${current.zoom})`,
        }}
      />
    </div>
  );
}
