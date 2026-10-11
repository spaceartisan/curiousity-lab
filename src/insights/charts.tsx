// Small hand-built SVG charts for Insights. Colors come from --viz-* tokens in styles.css.
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AREAS, type Area } from "./analysis";

const AREA_VAR: Record<Area, string> = {
  Music: "var(--viz-1)",
  Lab: "var(--viz-2)",
  Numbers: "var(--viz-3)",
  Words: "var(--viz-4)",
};
const shortDate = (d: Date) =>
  d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(320);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const set = () =>
      setWidth(Math.max(240, Math.round(el.getBoundingClientRect().width)));
    set();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** A chart with a one-line readout that hover or tap fills in. */
function Frame({
  children,
  readout,
  hint,
}: {
  children: ReactNode;
  readout: string;
  hint: string;
}) {
  return (
    <>
      <p className="viz-readout" aria-live="polite">
        {readout || <span className="muted">{hint}</span>}
      </p>
      {children}
    </>
  );
}

export function Legend({
  items,
}: {
  items: { label: string; color: string }[];
}) {
  return (
    <ul className="viz-legend">
      {items.map((i) => (
        <li key={i.label}>
          <span className="viz-swatch" style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
export const areaLegend = AREAS.map((a) => ({ label: a, color: AREA_VAR[a] }));

/** Twelve weeks of days, darker for more minutes. */
export function CalendarHeat({
  days,
}: {
  days: { date: Date; minutes: number; count: number; future: boolean }[];
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [readout, setReadout] = useState("");
  const weeks = days.length / 7;
  const bin = (m: number) =>
    m <= 0 ? 0 : m < 15 ? 1 : m < 30 ? 2 : m < 60 ? 3 : 4;
  const gap = 3,
    left = 30,
    cell = Math.max(12, Math.min(30, Math.floor((width - left) / weeks) - gap)),
    top = 16;
  const label = (d: (typeof days)[number]) =>
    `${d.date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}: ${
      d.count
        ? `${d.minutes} min, ${d.count} ${d.count === 1 ? "activity" : "activities"}`
        : "nothing played"
    }`;
  return (
    <Frame readout={readout} hint="Hover or tap a day.">
      <div className="viz-scroll" ref={ref}>
        <svg
          width={left + weeks * (cell + gap)}
          height={top + 7 * (cell + gap)}
          role="img"
          aria-label="Minutes played each day for the last twelve weeks"
          onMouseLeave={() => setReadout("")}
        >
          {["Mon", "Wed", "Fri"].map((d, i) => (
            <text
              key={d}
              x={0}
              y={top + i * 2 * (cell + gap) + cell - 4}
              className="viz-axis"
            >
              {d}
            </text>
          ))}
          {Array.from({ length: weeks }, (_, w) =>
            w % 4 === 0 ? (
              <text
                key={w}
                x={left + w * (cell + gap)}
                y={10}
                className="viz-axis"
              >
                {shortDate(days[w * 7].date)}
              </text>
            ) : null,
          )}
          {days.map((d, i) =>
            d.future ? null : (
              <rect
                key={i}
                x={left + Math.floor(i / 7) * (cell + gap)}
                y={top + (i % 7) * (cell + gap)}
                width={cell}
                height={cell}
                rx={3}
                className={`heat heat-${bin(d.minutes)}`}
                tabIndex={0}
                aria-label={label(d)}
                onMouseEnter={() => setReadout(label(d))}
                onFocus={() => setReadout(label(d))}
                onClick={() => setReadout(label(d))}
              />
            ),
          )}
        </svg>
      </div>
      <div className="heat-key" aria-hidden="true">
        <span>None</span>
        {[0, 1, 2, 3, 4].map((b) => (
          <span key={b} className={`heat heat-${b}`} />
        ))}
        <span>An hour or more</span>
      </div>
    </Frame>
  );
}

/** Minutes per week, one stacked column per week by area. */
export function WeeklyStack({
  rows,
}: {
  rows: ({ week: Date } & Record<Area, number>)[];
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [readout, setReadout] = useState("");
  const h = 180,
    left = 34,
    bottom = 22,
    top = 8;
  const totals = rows.map((r) => AREAS.reduce((a, k) => a + r[k], 0));
  const max = niceMax(Math.max(30, ...totals));
  const band = (width - left) / Math.max(1, rows.length);
  const bar = Math.min(24, band * 0.7);
  const y = (v: number) => top + (h - top - bottom) * (1 - v / max);
  return (
    <div ref={ref}>
      <Frame readout={readout} hint="Hover or tap a week.">
        <svg
          width={width}
          height={h}
          role="img"
          aria-label="Minutes played each week, by area"
          onMouseLeave={() => setReadout("")}
        >
          {ticks(max).map((t) => (
            <g key={t}>
              <line
                x1={left}
                x2={width}
                y1={y(t)}
                y2={y(t)}
                className="viz-grid"
              />
              <text
                x={left - 6}
                y={y(t) + 4}
                className="viz-axis"
                textAnchor="end"
              >
                {t}
              </text>
            </g>
          ))}
          {rows.map((r, i) => {
            const x = left + i * band + (band - bar) / 2;
            let acc = 0;
            const parts = AREAS.filter((a) => r[a] > 0);
            const text = `Week of ${shortDate(r.week)}: ${totals[i]} min${parts.length ? " (" + parts.map((a) => `${a} ${r[a]}`).join(", ") + ")" : ""}`;
            return (
              <g
                key={i}
                onMouseEnter={() => setReadout(text)}
                onClick={() => setReadout(text)}
                tabIndex={0}
                onFocus={() => setReadout(text)}
                aria-label={text}
              >
                <rect
                  x={left + i * band}
                  y={top}
                  width={band}
                  height={h - top - bottom}
                  fill="transparent"
                />
                {parts.map((a, k) => {
                  const y0 = y(acc);
                  acc += r[a];
                  const y1 = y(acc);
                  const isTop = k === parts.length - 1;
                  const hh = Math.max(0, y0 - y1 - (isTop ? 0 : 2));
                  return isTop ? (
                    <path
                      key={a}
                      d={roundTop(x, y1, bar, hh, 4)}
                      fill={AREA_VAR[a]}
                    />
                  ) : (
                    <rect
                      key={a}
                      x={x}
                      y={y1 + 2}
                      width={bar}
                      height={hh}
                      fill={AREA_VAR[a]}
                    />
                  );
                })}
                {i % Math.ceil(rows.length / 6) === 0 && (
                  <text
                    x={x + bar / 2}
                    y={h - 6}
                    className="viz-axis"
                    textAnchor="middle"
                  >
                    {shortDate(r.week)}
                  </text>
                )}
              </g>
            );
          })}
          <line
            x1={left}
            x2={width}
            y1={y(0)}
            y2={y(0)}
            className="viz-baseline"
          />
        </svg>
        <Legend items={areaLegend} />
      </Frame>
    </div>
  );
}

/** When in the day she plays: count per hour. */
export function HourColumns({ counts }: { counts: number[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [readout, setReadout] = useState("");
  const first = Math.min(
    7,
    counts.findIndex((c) => c > 0) === -1 ? 7 : counts.findIndex((c) => c > 0),
  );
  const lastHour = Math.max(
    21,
    23 - [...counts].reverse().findIndex((c) => c > 0),
  );
  const shown = counts.slice(first, lastHour + 1);
  const h = 140,
    left = 28,
    bottom = 22,
    top = 8;
  const max = niceMax(Math.max(4, ...shown));
  const band = (width - left) / shown.length;
  const bar = Math.min(24, band - 2);
  const y = (v: number) => top + (h - top - bottom) * (1 - v / max);
  const hourLabel = (hr: number) =>
    new Date(2000, 0, 1, hr).toLocaleTimeString(undefined, { hour: "numeric" });
  return (
    <div ref={ref}>
      <Frame readout={readout} hint="Hover or tap an hour.">
        <svg
          width={width}
          height={h}
          role="img"
          aria-label="Activities finished by hour of the day"
          onMouseLeave={() => setReadout("")}
        >
          {ticks(max).map((t) => (
            <g key={t}>
              <line
                x1={left}
                x2={width}
                y1={y(t)}
                y2={y(t)}
                className="viz-grid"
              />
              <text
                x={left - 6}
                y={y(t) + 4}
                className="viz-axis"
                textAnchor="end"
              >
                {t}
              </text>
            </g>
          ))}
          {shown.map((c, i) => {
            const hr = first + i;
            const x = left + i * band + (band - bar) / 2;
            const text = `${hourLabel(hr)}–${hourLabel((hr + 1) % 24)}: ${c} ${c === 1 ? "activity" : "activities"}`;
            return (
              <g
                key={hr}
                onMouseEnter={() => setReadout(text)}
                onClick={() => setReadout(text)}
                tabIndex={0}
                onFocus={() => setReadout(text)}
                aria-label={text}
              >
                <rect
                  x={left + i * band}
                  y={top}
                  width={band}
                  height={h - top - bottom}
                  fill="transparent"
                />
                {c > 0 && (
                  <path
                    d={roundTop(x, y(c), bar, y(0) - y(c), 4)}
                    fill="var(--viz-1)"
                  />
                )}
                {hr % 3 === 0 && (
                  <text
                    x={x + bar / 2}
                    y={h - 6}
                    className="viz-axis"
                    textAnchor="middle"
                  >
                    {hourLabel(hr)}
                  </text>
                )}
              </g>
            );
          })}
          <line
            x1={left}
            x2={width}
            y1={y(0)}
            y2={y(0)}
            className="viz-baseline"
          />
        </svg>
      </Frame>
    </div>
  );
}

/** Horizontal bars: how often each activity was chosen. */
export function MixBars({
  rows,
}: {
  rows: { label: string; area: Area; count: number; minutes: number }[];
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <>
      <ul className="mix-bars">
        {rows.map((r) => (
          <li
            key={r.label}
            title={`${r.label}: ${r.count} times, ${r.minutes} min`}
          >
            <span className="mix-label">{r.label}</span>
            <span className="mix-track">
              <span
                className="mix-bar"
                style={{
                  width: `${(r.count / max) * 100}%`,
                  background: AREA_VAR[r.area],
                }}
              />
            </span>
            <span className="mix-value">{r.count}</span>
          </li>
        ))}
      </ul>
      <Legend items={areaLegend} />
    </>
  );
}

/** One weekly series with points sized by how many tries that week held. */
export function TrendLine({
  weeks,
  points,
  unit,
  domain,
  versions,
}: {
  weeks: Date[];
  points: { value: number | null; n: number }[];
  unit: string;
  domain: [number, number] | null;
  versions: { at: string; app: string }[];
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [readout, setReadout] = useState("");
  const h = 150,
    left = 34,
    right = 44,
    top = 14,
    bottom = 22;
  const values = points
    .map((p) => p.value)
    .filter((v): v is number => v !== null);
  const [lo, hi] = domain ?? [0, niceMax(Math.max(1, ...values))];
  const step = (width - left - right) / Math.max(1, weeks.length - 1);
  const x = (i: number) => left + i * step;
  const y = (v: number) =>
    top +
    (h - top - bottom) *
      (1 - (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo || 1));
  const fmt = (v: number) =>
    `${Math.round(v * 10) / 10}${unit === "%" ? "%" : unit ? " " + unit : ""}`;
  let d = "";
  points.forEach((p, i) => {
    if (p.value === null) return;
    d += `${d && points[i - 1]?.value !== null ? "L" : "M"}${x(i)},${y(p.value)}`;
  });
  const lastIdx = points.map((p) => p.value !== null).lastIndexOf(true);
  const vmarks = versions
    .map((v) => ({
      ...v,
      i: weeks.findIndex(
        (w, k) =>
          new Date(v.at) >= w &&
          (k === weeks.length - 1 || new Date(v.at) < weeks[k + 1]),
      ),
    }))
    .filter((v) => v.i >= 0);
  if (!values.length)
    return (
      <p className="muted viz-empty">Nothing of this kind yet in this range.</p>
    );
  return (
    <div ref={ref}>
      <Frame
        readout={readout}
        hint="Hover or tap a week. Hollow points rest on fewer than 3 tries."
      >
        <svg
          width={width}
          height={h}
          role="img"
          aria-label="Weekly trend"
          onMouseLeave={() => setReadout("")}
        >
          {ticks(hi, lo).map((t) => (
            <g key={t}>
              <line
                x1={left}
                x2={width - right}
                y1={y(t)}
                y2={y(t)}
                className="viz-grid"
              />
              <text
                x={left - 6}
                y={y(t) + 4}
                className="viz-axis"
                textAnchor="end"
              >
                {t}
              </text>
            </g>
          ))}
          {vmarks.map((v) => (
            <g key={v.at}>
              <line
                x1={x(v.i)}
                x2={x(v.i)}
                y1={top - 4}
                y2={h - bottom}
                className="viz-version"
              />
              <text x={x(v.i) + 3} y={top - 4} className="viz-axis">
                v{v.app}
              </text>
            </g>
          ))}
          <path d={d} className="viz-line" />
          {points.map((p, i) => {
            const text = `Week of ${shortDate(weeks[i])}: ${p.value === null ? "no tries" : `${fmt(p.value)} from ${p.n} ${p.n === 1 ? "try" : "tries"}`}`;
            return (
              <g
                key={i}
                onMouseEnter={() => setReadout(text)}
                onClick={() => setReadout(text)}
                tabIndex={p.value === null ? -1 : 0}
                onFocus={() => setReadout(text)}
                aria-label={text}
              >
                <rect
                  x={x(i) - step / 2}
                  y={top}
                  width={Math.max(step, 8)}
                  height={h - top - bottom}
                  fill="transparent"
                />
                {p.value !== null && (
                  <circle
                    cx={x(i)}
                    cy={y(p.value)}
                    r={4.5}
                    className={p.n < 3 ? "viz-dot hollow" : "viz-dot"}
                  />
                )}
              </g>
            );
          })}
          {lastIdx >= 0 && (
            <text
              x={x(lastIdx) + 9}
              y={y(points[lastIdx].value!) + 4}
              className="viz-value"
            >
              {fmt(points[lastIdx].value!)}
            </text>
          )}
          {weeks.map((w, i) =>
            i % Math.ceil(weeks.length / 5) === 0 ? (
              <text
                key={i}
                x={x(i)}
                y={h - 6}
                className="viz-axis"
                textAnchor="middle"
              >
                {shortDate(w)}
              </text>
            ) : null,
          )}
        </svg>
      </Frame>
    </div>
  );
}

function niceStep(span: number) {
  const raw = span / 5;
  const p = 10 ** Math.floor(Math.log10(raw));
  for (const m of [1, 2, 5, 10]) if (m * p >= raw) return m * p;
  return 10 * p;
}
function niceMax(v: number) {
  const step = niceStep(v);
  return Math.ceil(v / step - 1e-9) * step;
}
function ticks(hi: number, lo = 0) {
  const step = niceStep(hi - lo);
  const out: number[] = [];
  for (let t = Math.ceil(lo / step) * step; t <= hi + 1e-9; t += step)
    out.push(Math.round(t * 100) / 100);
  return out;
}
/** Rect with rounded top corners only (square at the baseline). */
function roundTop(x: number, y: number, w: number, h: number, r: number) {
  if (h <= 0) return "";
  const rr = Math.min(r, h, w / 2);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}
