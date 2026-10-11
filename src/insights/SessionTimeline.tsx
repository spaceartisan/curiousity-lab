import {
  useState,
  useMemo,
  useEffect,
  useLayoutEffect,
  useRef,
  useId,
} from "react";
import type { Session } from "../storage/contracts";
import { download } from "../storage/local";
import {
  sessionTimeline,
  timelineExport,
  TIMELINE_VERSION,
  POINTS_PER_PAGE,
  type TimelineMetric,
} from "./timeline";
export function SessionTimeline({
  sessions,
  context,
}: {
  sessions: Session[];
  context: string;
}) {
  const [metric, setMetric] = useState<TimelineMetric>("active"),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState("");
  const model = useMemo(
    () => sessionTimeline(sessions, context, metric),
    [sessions, context, metric],
  );
  useEffect(() => {
    setPage(1);
    setSelected("");
  }, [sessions, context, metric]);
  const pages = Math.max(1, Math.ceil(model.points.length / POINTS_PER_PAGE));
  const safePage = Math.min(page, pages);
  const points = model.points.slice(
    (safePage - 1) * POINTS_PER_PAGE,
    safePage * POINTS_PER_PAGE,
  );
  const focused = points.find((p) => p.session.id === selected) ?? points[0];
  const scrollRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const reveal = () => {
      const point = container.querySelector<SVGElement>(
        ".timeline-point.selected",
      );
      if (!point || !container.clientWidth) return;
      const r = point.getBoundingClientRect(),
        box = container.getBoundingClientRect();
      if (r.left < box.left + 12)
        container.scrollLeft -= box.left + 12 - r.left;
      else if (r.right > box.right - 12)
        container.scrollLeft += r.right - box.right + 12;
    };
    reveal();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(reveal);
    observer.observe(container);
    const svg = container.querySelector("svg");
    if (svg) observer.observe(svg);
    return () => observer.disconnect();
  }, [focused?.session.id, safePage, metric, context]);
  const title = useId(),
    description = useId();
  const x = (time: number) =>
    100 +
    (460 * (time - model.timeDomain[0])) /
      (model.timeDomain[1] - model.timeDomain[0]);
  const y = (value: number) => 270 - 220 * (value / model.valueDomain[1]);
  const display = (value: number) =>
    metric === "hints" ? String(value) : (value / model.divisor).toFixed(1);
  const label =
    metric === "active"
      ? "Observed active time"
      : metric === "pause"
        ? "Observed foreground pause"
        : "Hints in completed sessions";
  const ticks = [
    ...new Set([
      0,
      metric === "hints"
        ? Math.ceil(model.valueDomain[1] / 2)
        : model.valueDomain[1] / 2,
      model.valueDomain[1],
    ]),
  ];
  const dateTicks = [
    model.timeDomain[0],
    (model.timeDomain[0] + model.timeDomain[1]) / 2,
    model.timeDomain[1],
  ];
  return (
    <section
      className="session-timeline"
      aria-label="Individual session timeline"
    >
      <h3>Individual sessions</h3>
      {context === "all" ? (
        <p>
          Choose one puzzle context, or use “Review this context” on a summary,
          to plot its recorded sessions.
        </p>
      ) : (
        <>
          <p>
            One point is one recorded session. No connecting line, fitted trend
            or health score. Matching context does not establish equivalent
            human difficulty. Sessions within a day or puzzle may be related.
          </p>
          <label>
            Plot value
            <select
              aria-label="Plot value"
              value={metric}
              onChange={(e) => {
                setMetric(e.target.value as TimelineMetric);
                setPage(1);
                setSelected("");
              }}
            >
              <option value="active">Active time</option>
              <option value="pause">Foreground pause time</option>
              <option value="hints" disabled={model.exploration}>
                Hints in completed sessions
              </option>
            </select>
          </label>
          <p aria-live="polite">
            {model.points.length} of {model.records} selected records have this
            plot value · {model.days} UTC {model.days === 1 ? "day" : "days"}.{" "}
            {model.omitted} excluded:{" "}
            {metric === "pause"
              ? "pause time unrecorded"
              : metric === "hints"
                ? "not a completed puzzle session"
                : "none"}
            .
          </p>
          {model.timeIssues ? (
            <p>
              Time consistency warning: {model.timeIssues} selected records have
              a local clock shift, an end before the start, or active plus known
              pause time exceeding elapsed time. Source values are preserved.
            </p>
          ) : null}
          {model.exploration ? (
            <p>
              Exploration and creation have no accuracy or performance score.
              Completed-session hint plots are unavailable.
            </p>
          ) : null}
          {!points.length ? (
            <p>
              No recorded values for this selection. Missing values are unknown,
              not zero.
            </p>
          ) : (
            <>
              <p>
                Showing {points.length} points on page {safePage} of {pages}.
                Axes use the full selected context across pages. Dates use
                source session end time in UTC; local clock observations do not
                verify UTC accuracy.
              </p>
              <div
                ref={scrollRef}
                className="timeline-scroll"
                role="region"
                aria-label="Scrollable session plot"
                tabIndex={0}
              >
                <svg
                  viewBox="0 0 640 360"
                  className="timeline-svg"
                  role="group"
                  aria-labelledby={`${title} ${description}`}
                >
                  <title id={title}>{label} by session end time (UTC)</title>
                  <desc id={description}>
                    Individual source observations with completed, explored and
                    unfinished shapes. Points may overlap. Use the selected
                    session control or plot data table to reach every record.
                    Axes remain fixed across pages.
                  </desc>
                  <text x="20" y="25" fontSize="16">
                    {label} ({model.unit})
                  </text>
                  {ticks.map((t) => (
                    <g key={t}>
                      <line
                        x1="100"
                        x2="560"
                        y1={y(t)}
                        y2={y(t)}
                        className="timeline-grid"
                      />
                      <text x="85" y={y(t) + 5} textAnchor="end" fontSize="14">
                        {display(t)}
                      </text>
                    </g>
                  ))}
                  <line
                    x1="100"
                    x2="100"
                    y1="50"
                    y2="270"
                    className="timeline-axis"
                  />
                  <line
                    x1="100"
                    x2="560"
                    y1="270"
                    y2="270"
                    className="timeline-axis"
                  />
                  {dateTicks.map((t, i) => {
                    const [date, time] = new Date(t).toISOString().split("T");
                    return (
                      <text
                        key={i}
                        x={x(t)}
                        y="292"
                        textAnchor="middle"
                        fontSize="13"
                      >
                        <tspan x={x(t)}>{date}</tspan>
                        <tspan x={x(t)} dy="18">
                          {time.slice(0, 8)}
                        </tspan>
                      </text>
                    );
                  })}
                  <text x="330" y="342" textAnchor="middle" fontSize="16">
                    Session end time (UTC)
                  </text>
                  {points.map((p) => {
                    const s = p.session,
                      cx = x(p.endedAtMs),
                      cy = y(p.value),
                      chosen = focused?.session.id === s.id;
                    const attrs = {
                      tabIndex: 0,
                      role: "button",
                      "aria-label": `${s.id}: ${new Date(s.endedAt).toISOString()}, ${display(p.value)} ${model.unit}, ${s.outcome}, attempt ${s.attempt}`,
                      "aria-pressed": chosen,
                      onClick: () => setSelected(s.id),
                      onKeyDown: (e: React.KeyboardEvent<SVGElement>) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelected(s.id);
                        }
                      },
                      className: `timeline-point ${s.outcome}${chosen ? " selected" : ""}`,
                    };
                    return s.outcome === "unfinished" ? (
                      <path
                        key={s.id}
                        {...attrs}
                        d={`M ${cx} ${cy - 7} L ${cx + 7} ${cy + 7} L ${cx - 7} ${cy + 7} Z`}
                      />
                    ) : s.outcome === "explored" ? (
                      <rect
                        key={s.id}
                        {...attrs}
                        x={cx - 6}
                        y={cy - 6}
                        width="12"
                        height="12"
                      />
                    ) : (
                      <circle key={s.id} {...attrs} cx={cx} cy={cy} r="7" />
                    );
                  })}
                </svg>
              </div>
              <p>
                Scroll the plot sideways when needed. Shapes: circle = completed
                · square = explored · triangle = unfinished. Overlapping values
                remain separate records. No record is a separate participant.
              </p>
              <label>
                Selected plotted session
                <select
                  aria-label="Selected plotted session"
                  value={focused?.session.id ?? ""}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  {points.map((p) => (
                    <option key={p.session.id} value={p.session.id}>
                      {new Date(p.session.endedAt).toISOString()} ·{" "}
                      {p.session.id}
                    </option>
                  ))}
                </select>
              </label>
              {focused ? (
                <div
                  role="region"
                  className="timeline-details"
                  aria-label="Selected session details"
                >
                  <p>
                    <strong>{focused.session.id}</strong>
                  </p>
                  <p>
                    Original end timestamp: {focused.session.endedAt}
                    <br />
                    UTC: {new Date(focused.session.endedAt).toISOString()}
                  </p>
                  <p>
                    {label}: {display(focused.value)} {model.unit}
                    {metric !== "hints"
                      ? ` · exact source: ${focused.value} ms`
                      : null}
                  </p>
                  <p>
                    Outcome: {focused.session.outcome} ·{" "}
                    {focused.session.attempt === 1
                      ? "First attempt"
                      : `Repeat attempt ${focused.session.attempt}`}{" "}
                    · Hints: {focused.session.hints} · Undo:{" "}
                    {focused.session.undos}
                  </p>
                </div>
              ) : null}
              {pages > 1 ? (
                <nav className="actions" aria-label="Session plot pages">
                  <button
                    disabled={safePage === 1}
                    onClick={() => {
                      setPage(safePage - 1);
                      setSelected("");
                    }}
                  >
                    Previous plot points
                  </button>
                  <span>
                    Plot page {safePage} of {pages}
                  </span>
                  <button
                    disabled={safePage === pages}
                    onClick={() => {
                      setPage(safePage + 1);
                      setSelected("");
                    }}
                  >
                    Next plot points
                  </button>
                </nav>
              ) : null}
              <details className="timeline-data">
                <summary>Plot data table</summary>
                <div
                  className="table-wrap"
                  role="region"
                  aria-label="Plot source values"
                  tabIndex={0}
                >
                  <table>
                    <thead>
                      <tr>
                        {[
                          "Session / original end time",
                          "UTC end time",
                          `${label} (${metric === "hints" ? "count" : "exact ms"})`,
                          "Outcome / attempt / hints / undo",
                        ].map((h) => (
                          <th key={h} scope="col">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {points.map((p) => (
                        <tr key={p.session.id}>
                          <td>
                            {p.session.id}
                            <br />
                            {p.session.endedAt}
                          </td>
                          <td>{new Date(p.session.endedAt).toISOString()}</td>
                          <td>{p.value}</td>
                          <td>
                            {p.session.outcome} · attempt {p.session.attempt} ·
                            hints {p.session.hints} · undo {p.session.undos}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
              <button
                onClick={() =>
                  download(
                    timelineExport(model, context),
                    "curiosity-lab-session-plot.json",
                  )
                }
              >
                Export plot data
              </button>
            </>
          )}
          <p className="muted">
            Plot version: {TIMELINE_VERSION}. Values come from this selected
            backup; no upload.
          </p>
        </>
      )}
    </section>
  );
}
