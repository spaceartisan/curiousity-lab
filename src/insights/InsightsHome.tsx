import { useMemo, useState } from "react";
import { ACTIVITY, type ActivityRecord } from "../activity/records";
import { DAY } from "../activity/stories";
import type { useFamilyData } from "../activity/useFamilyData";
import { Notes, SendSomething } from "../companion/CompanionHome";
import {
  AREAS,
  TRENDS,
  byWeek,
  calendar,
  hours,
  lengths,
  mix,
  reExposure,
  repeats,
  sameDay,
  toCsv,
  versionChanges,
  weekStart,
  weeklyMinutes,
  weeksBetween,
} from "./analysis";
import {
  CalendarHeat,
  HourColumns,
  MixBars,
  TrendLine,
  WeeklyStack,
} from "./charts";

type Data = ReturnType<typeof useFamilyData>;
const RANGES = [
  { id: "12", label: "12 weeks", weeks: 12 },
  { id: "26", label: "26 weeks", weeks: 26 },
  { id: "all", label: "Everything", weeks: 0 },
];
const MARK: Record<ActivityRecord["outcome"], string> = {
  correct: "✓",
  solved: "✓",
  finished: "•",
  incorrect: "✗",
  revealed: "?",
  stopped: "–",
};
const date = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

export function InsightsHome({ family }: { family: Data }) {
  const records = useMemo(
    () =>
      [...(family.data?.records ?? [])].sort((a, b) =>
        a.at.localeCompare(b.at),
      ),
    [family.data],
  );
  const [range, setRange] = useState("12");
  const now = new Date();
  const weeks = useMemo(() => {
    const r = RANGES.find((x) => x.id === range)!;
    const from = r.weeks
      ? new Date(
          weekStart(now).getTime() - (r.weeks - 1) * 7 * DAY + 3 * 3_600_000,
        )
      : records[0]
        ? new Date(records[0].at)
        : now;
    return weeksBetween(from, now);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, records, now.toDateString()]);
  const inRange = records.filter((r) => new Date(r.at) >= weeks[0]);
  const buckets = useMemo(() => byWeek(records, weeks), [records, weeks]);
  const versions = useMemo(() => versionChanges(records), [records]);
  if (!family.data) return null;

  const fourWeeks = records.filter(
    (r) => new Date(r.at).getTime() > now.getTime() - 28 * DAY,
  );
  const activeDays = new Set(
    fourWeeks.map((r) => new Date(r.at).toDateString()),
  ).size;
  const minutes = Math.round(
    fourWeeks.reduce((a, r) => a + (r.seconds ?? 0), 0) / 60,
  );
  const last = records[records.length - 1];

  return (
    <div className="insights">
      <div className="insights-filters" role="group" aria-label="Time range">
        <span>Showing</span>
        <div className="segmented">
          {RANGES.map((r) => (
            <button
              key={r.id}
              aria-pressed={range === r.id}
              onClick={() => setRange(r.id)}
            >
              {r.label}
            </button>
          ))}
        </div>
        <span className="muted">
          {records.length} shared{" "}
          {records.length === 1 ? "activity" : "activities"} in all
          {family.data.sharing?.on === false &&
            " · sharing is turned off on Play"}
        </span>
      </div>

      <section className="stat-tiles" aria-label="Last four weeks">
        <div>
          <span>Days with play, last 4 weeks</span>
          <strong>{activeDays} of 28</strong>
        </div>
        <div>
          <span>Minutes, last 4 weeks</span>
          <strong>{minutes.toLocaleString()}</strong>
        </div>
        <div>
          <span>Activities, last 4 weeks</span>
          <strong>{fourWeeks.length}</strong>
        </div>
        <div>
          <span>Last played</span>
          <strong>
            {last
              ? `${date(last.at)}, ${new Date(last.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`
              : "—"}
          </strong>
        </div>
      </section>

      <h2 className="insights-section">Engagement</h2>
      <div className="insights-grid">
        <section className="viz-card wide">
          <h3>Every day, last 12 weeks</h3>
          <p className="muted">Minutes played each day.</p>
          <CalendarHeat days={calendar(records, now, 12)} />
        </section>
        <section className="viz-card wide">
          <h3>Minutes each week</h3>
          <WeeklyStack rows={weeklyMinutes(inRange, weeks)} />
        </section>
        <section className="viz-card">
          <h3>Time of day</h3>
          <p className="muted">
            Activities finished in each hour,{" "}
            {RANGES.find((r) => r.id === range)!.label.toLowerCase()}.
          </p>
          <HourColumns counts={hours(inRange)} />
        </section>
        <section className="viz-card">
          <h3>What she chose</h3>
          <p className="muted">Times each activity was finished.</p>
          <MixBars rows={mix(inRange)} />
          <p className="viz-foot">
            Typical sitting with one activity:{" "}
            {lengths(inRange)
              .filter((l) => l.median !== null)
              .map((l) => `${l.area} ${Math.round(l.median!)} min`)
              .join(" · ") || "—"}
          </p>
        </section>
      </div>

      <h2 className="insights-section">Trends on comparable tasks</h2>
      <p className="muted insights-lede">
        Each chart follows one kind of task so like is compared with like.
        Points are weekly. A dashed line marks a Play update, after which
        content or difficulty may differ. Week-to-week wobble is normal; look
        for runs of several weeks.
      </p>
      <div className="insights-grid trends">
        {TRENDS.map((t) => (
          <TrendCard
            key={t.id}
            trend={t}
            buckets={buckets}
            weeks={weeks}
            versions={versions}
          />
        ))}
      </div>

      <h2 className="insights-section">Memory signals</h2>
      <p className="muted insights-lede">
        Descriptive only. These show what happened when something came back, not
        a score, and they can’t tell remembering from recognizing or enjoying.
      </p>
      <MemorySignals records={inRange} />

      <h2 className="insights-section">Notes and sending</h2>
      <div className="insights-grid">
        <Notes family={family} author="insights" limit={20} />
        <SendSomething family={family} from="insights" />
      </div>

      <h2 className="insights-section">Raw records</h2>
      <RawRecords records={records} fictional={family.data.fictional} />
    </div>
  );
}

function TrendCard({
  trend,
  buckets,
  weeks,
  versions,
}: {
  trend: (typeof TRENDS)[number];
  buckets: ActivityRecord[][];
  weeks: Date[];
  versions: { at: string; app: string }[];
}) {
  const [option, setOption] = useState(trend.options?.[0]?.id);
  const points = buckets.map((b) => trend.points(b, option));
  const total = points.reduce((a, p) => a + p.n, 0);
  return (
    <section className="viz-card">
      <h3>{trend.title}</h3>
      <p className="muted">
        {trend.means} {total ? `${total} in range.` : ""}
      </p>
      {trend.options && (
        <div
          className="segmented small"
          role="group"
          aria-label={`${trend.title} comparison`}
        >
          {trend.options.map((o) => (
            <button
              key={o.id}
              aria-pressed={option === o.id}
              onClick={() => setOption(o.id)}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
      <TrendLine
        weeks={weeks}
        points={points}
        unit={trend.unit}
        domain={trend.domain}
        versions={versions}
      />
    </section>
  );
}

function MemorySignals({ records }: { records: ActivityRecord[] }) {
  const exp = reExposure(records);
  const reps = repeats(records).slice(0, 12);
  const same = sameDay(records).slice(0, 8);
  const row = (label: string, b: { right: number; n: number }) => (
    <tr>
      <th scope="row">{label}</th>
      <td>{b.n ? `${b.right} of ${b.n}` : "—"}</td>
    </tr>
  );
  return (
    <div className="insights-grid">
      <section className="viz-card">
        <h3>When a piece or case comes back</h3>
        <p className="muted">
          Name That Piece and bench unknowns, counted by how long since she last
          met that same item.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Meeting</th>
                <th>Correct</th>
              </tr>
            </thead>
            <tbody>
              {row("First time", exp.first)}
              {row("Again, same day", exp.sameDay)}
              {row("Again, within a week", exp.withinWeek)}
              {row("Again, after more than a week", exp.later)}
            </tbody>
          </table>
        </div>
      </section>
      <section className="viz-card">
        <h3>Same thing twice in one day</h3>
        <p className="muted">
          Could be a favorite, could be not recalling the earlier go. Worth
          asking about, not concluding from.
        </p>
        {same.length ? (
          <ul className="plain-list">
            {same.map((s, i) => (
              <li key={i}>
                <small>{date(s.day)}</small> {ACTIVITY[s.activity].label}:{" "}
                {s.title} <strong>×{s.times}</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">None in this range.</p>
        )}
      </section>
      <section className="viz-card wide">
        <h3>Items she has met more than once</h3>
        <p className="muted">
          Each mark is one meeting, oldest first: ✓ right or solved, ✗ not
          right, ? looked at the answer, • finished. The small number is days
          since the meeting before.
        </p>
        {reps.length ? (
          <div className="table-wrap">
            <table className="repeat-table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Meetings</th>
                </tr>
              </thead>
              <tbody>
                {reps.map((g) => (
                  <tr key={g.activity + g.item}>
                    <td>
                      <small>{ACTIVITY[g.activity].label}</small>
                      <br />
                      {g.title}
                    </td>
                    <td className="meetings">
                      {g.seen.map((e, i) => (
                        <span
                          key={i}
                          className={`meeting m-${e.outcome}`}
                          title={`${date(e.at)}: ${e.outcome}`}
                        >
                          {e.gap !== null && <sup>{e.gap}d</sup>}
                          {MARK[e.outcome]}
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Nothing has come round twice yet.</p>
        )}
      </section>
    </div>
  );
}

function download(name: string, type: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function RawRecords({
  records,
  fictional,
}: {
  records: ActivityRecord[];
  fictional: boolean;
}) {
  const [area, setArea] = useState("all");
  const [shown, setShown] = useState(50);
  const list = [...records]
    .reverse()
    .filter((r) => area === "all" || ACTIVITY[r.activity].area === area);
  const stamp = new Date().toISOString().slice(0, 10);
  const prefix = fictional
    ? "curiosity-lab-fictional"
    : "curiosity-lab-activity";
  return (
    <section className="viz-card wide raw-records">
      <div className="actions">
        <label className="inline-label">
          Area{" "}
          <select value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="all">All</option>
            {AREAS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
        </label>
        <button
          onClick={() =>
            download(`${prefix}-${stamp}.csv`, "text/csv", toCsv(records))
          }
        >
          Download CSV
        </button>
        <button
          onClick={() =>
            download(
              `${prefix}-${stamp}.json`,
              "application/json",
              JSON.stringify(records, null, 2),
            )
          }
        >
          Download JSON
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Activity</th>
              <th>Item</th>
              <th>Outcome</th>
              <th>Min</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {list.slice(0, shown).map((r) => (
              <tr key={r.id}>
                <td>
                  {date(r.at)}{" "}
                  {new Date(r.at).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </td>
                <td>{ACTIVITY[r.activity].label}</td>
                <td>{r.title}</td>
                <td>{r.outcome}</td>
                <td>{r.seconds ? Math.round(r.seconds / 60) : ""}</td>
                <td className="details">
                  {Object.entries(r.detail)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(", ")}
                  <small> · v{r.app}</small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.length > shown && (
        <button onClick={() => setShown(shown + 100)}>
          Show more ({list.length - shown} left)
        </button>
      )}
    </section>
  );
}
