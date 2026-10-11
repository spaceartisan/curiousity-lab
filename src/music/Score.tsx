import { useEffect, useRef, useState } from "react";
import type { TuneObject, NoteTimingEvent } from "abcjs";

type Abcjs = typeof import("abcjs");
let abcjsModule: Promise<Abcjs> | undefined;
const loadAbcjs = () =>
  (abcjsModule ??= import("abcjs").then(
    (m) => ((m as { default?: Abcjs }).default ?? m) as Abcjs,
  ));

/**
 * Engraved score. `beat` (quarter notes from the start) highlights what is sounding;
 * pass -1 when nothing is playing.
 */
export function Score({
  abc,
  tempo,
  beat = -1,
  label,
}: {
  abc: string;
  tempo: number;
  beat?: number;
  label: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const timings = useRef<NoteTimingEvent[]>([]);
  const lit = useRef<Element[]>([]);
  const [width, setWidth] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    if (typeof ResizeObserver === "undefined") {
      setWidth(el.clientWidth || 720);
      return;
    }
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.round(entry.contentRect.width / 40) * 40),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = host.current?.querySelector(".score-paper") as HTMLElement;
    if (!el || !width) return;
    let live = true;
    loadAbcjs()
      .then((abcjs) => {
        if (!live) return;
        const perLine = width < 520 ? 2 : width < 820 ? 3 : 4;
        const [tune] = abcjs.renderAbc(el, abc, {
          add_classes: true,
          foregroundColor: "currentColor",
          responsive: "resize",
          staffwidth: Math.max(280, width - 30),
          paddingleft: 0,
          paddingright: 0,
          paddingtop: 4,
          wrap: {
            minSpacing: 1.5,
            maxSpacing: 2.6,
            preferredMeasuresPerLine: perLine,
          },
          format: { titlefont: "serif 1", tempofont: "sans 12" },
        }) as TuneObject[];
        const timing = new abcjs.TimingCallbacks(tune, {});
        timings.current = timing.noteTimings.filter(
          (t) => t.type === "event" && t.elements?.length,
        );
        el.querySelector("svg")?.setAttribute("aria-hidden", "true");
        setFailed(false);
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [abc, width]);

  useEffect(() => {
    for (const e of lit.current) e.classList.remove("score-playing");
    lit.current = [];
    if (beat < 0) return;
    const ms = (beat * 60000) / tempo;
    let current: NoteTimingEvent | undefined;
    for (const t of timings.current) {
      if ((t.milliseconds ?? 0) <= ms + 15) current = t;
      else break;
    }
    if (!current?.elements) return;
    for (const group of current.elements)
      for (const e of group as Element[]) {
        e.classList.add("score-playing");
        lit.current.push(e);
      }
  }, [beat, tempo]);

  return (
    <div className="score" ref={host} role="img" aria-label={label}>
      <div className="score-paper" />
      {failed && <p className="muted">The score could not be drawn.</p>}
    </div>
  );
}
