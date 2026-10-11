import { useEffect, useRef } from "react";
import { isBlack, noteName } from "./repertoire";

/** A real keyboard: white and black keys, any range, scrolls sideways on small screens. */
export function Keyboard({
  low,
  high,
  onPress,
  target,
  pressed,
  labels = "c-only",
}: {
  low: number;
  high: number;
  onPress: (midi: number) => void;
  /** Key to gently mark as "next". */
  target?: number;
  /** Briefly lit key (the one just played). */
  pressed?: { midi: number; right: boolean };
  labels?: "none" | "c-only" | "all";
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const whites: number[] = [];
  for (let m = low; m <= high; m++) if (!isBlack(m)) whites.push(m);
  const keyWidth = 100 / whites.length;

  useEffect(() => {
    if (target === undefined) return;
    const key = scroller.current?.querySelector<HTMLElement>(
      `[data-midi="${target}"]`,
    );
    const box = scroller.current;
    if (!key || !box) return;
    const left = key.offsetLeft;
    if (
      left < box.scrollLeft + 40 ||
      left > box.scrollLeft + box.clientWidth - 80
    )
      box.scrollTo({ left: left - box.clientWidth / 2, behavior: "smooth" });
  }, [target]);

  const state = (m: number) =>
    [
      m === target ? "key-target" : "",
      pressed?.midi === m ? (pressed.right ? "key-right" : "key-pressed") : "",
    ].join(" ");

  return (
    <div className="keyboard-scroll" ref={scroller}>
      <div
        className="keyboard"
        style={{ minWidth: `${whites.length * 46}px` }}
        role="group"
        aria-label={`Piano keyboard from ${noteName(low)} to ${noteName(high)}`}
      >
        {whites.map((m) => (
          <button
            key={m}
            data-midi={m}
            className={`white-key ${state(m)}`}
            onPointerDown={(e) => {
              e.preventDefault();
              onPress(m);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onPress(m);
              }
            }}
            aria-label={noteName(m)}
          >
            {(labels === "all" || (labels === "c-only" && m % 12 === 0)) && (
              <span>{noteName(m)}</span>
            )}
          </button>
        ))}
        {whites.map((m, i) =>
          isBlack(m + 1) && m + 1 <= high ? (
            <button
              key={m + 1}
              data-midi={m + 1}
              className={`black-key ${state(m + 1)}`}
              style={{
                left: `calc(${(i + 1) * keyWidth}% - ${keyWidth * 0.32}%)`,
                width: `${keyWidth * 0.64}%`,
              }}
              onPointerDown={(e) => {
                e.preventDefault();
                onPress(m + 1);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onPress(m + 1);
                }
              }}
              aria-label={noteName(m + 1)}
            />
          ) : null,
        )}
      </div>
    </div>
  );
}
