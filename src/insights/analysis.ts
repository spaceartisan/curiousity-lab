// Descriptive summaries of shared activity for Insights. Counts and medians only; no scores.
import { ACTIVITY, type ActivityRecord } from "../activity/records";
import { DAY, startOfDay } from "../activity/stories";

export const AREAS = ["Music", "Lab", "Numbers", "Words"] as const;
export type Area = (typeof AREAS)[number];

/** Monday 00:00 local of the week containing d. */
export function weekStart(d: Date) {
  const x = startOfDay(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export function median(xs: number[]) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const num = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) ? v : null;
const mins = (r: ActivityRecord) => (r.seconds ?? 0) / 60;

/** Minutes per local day for the last `weeks` weeks, Monday-aligned, oldest first. */
export function calendar(records: ActivityRecord[], now: Date, weeks = 12) {
  const first = new Date(weekStart(now).getTime());
  first.setDate(first.getDate() - (weeks - 1) * 7);
  const days: { date: Date; minutes: number; count: number }[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const date = new Date(first);
    date.setDate(first.getDate() + i);
    days.push({ date, minutes: 0, count: 0 });
  }
  const index = new Map(days.map((d, i) => [d.date.toDateString(), i]));
  for (const r of records) {
    const i = index.get(new Date(r.at).toDateString());
    if (i === undefined) continue;
    days[i].minutes += mins(r);
    days[i].count++;
  }
  return days.map((d) => ({
    ...d,
    future: d.date > now,
    minutes: Math.round(d.minutes),
  }));
}

/** Weeks from `from` to `now`, Monday-aligned. */
export function weeksBetween(from: Date, now: Date) {
  const out: Date[] = [];
  for (
    let w = weekStart(from);
    w <= now;
    w = new Date(w.getFullYear(), w.getMonth(), w.getDate() + 7)
  )
    out.push(w);
  return out;
}

export function byWeek(records: ActivityRecord[], weeks: Date[]) {
  const buckets = weeks.map(() => [] as ActivityRecord[]);
  if (!weeks.length) return buckets;
  const end = new Date(weeks[weeks.length - 1]);
  end.setDate(end.getDate() + 7);
  const edges = [...weeks.map((w) => w.getTime()), end.getTime()];
  for (const r of records) {
    const t = new Date(r.at).getTime();
    for (let i = 0; i < weeks.length; i++)
      if (t >= edges[i] && t < edges[i + 1]) {
        buckets[i].push(r);
        break;
      }
  }
  return buckets;
}

/** Weekly minutes split by area. */
export function weeklyMinutes(records: ActivityRecord[], weeks: Date[]) {
  return byWeek(records, weeks).map((list, i) => {
    const row: Record<Area, number> = {
      Music: 0,
      Lab: 0,
      Numbers: 0,
      Words: 0,
    };
    for (const r of list) row[ACTIVITY[r.activity].area] += mins(r);
    for (const a of AREAS) row[a] = Math.round(row[a]);
    return { week: weeks[i], ...row };
  });
}

/** How many activities finished in each hour of the local day. */
export function hours(records: ActivityRecord[]) {
  const out = Array.from({ length: 24 }, () => 0);
  for (const r of records) out[new Date(r.at).getHours()]++;
  return out;
}

export function mix(records: ActivityRecord[]) {
  const counts = new Map<
    string,
    { label: string; area: Area; count: number; minutes: number }
  >();
  for (const r of records) {
    const a = ACTIVITY[r.activity];
    const c = counts.get(r.activity) ?? {
      label: a.label,
      area: a.area,
      count: 0,
      minutes: 0,
    };
    c.count++;
    c.minutes += mins(r);
    counts.set(r.activity, c);
  }
  return [...counts.values()]
    .map((c) => ({ ...c, minutes: Math.round(c.minutes) }))
    .sort(
      (a, b) =>
        AREAS.indexOf(a.area) - AREAS.indexOf(b.area) || b.count - a.count,
    );
}

/** Median minutes per activity, by area: how long a sitting with one thing tends to last. */
export function lengths(records: ActivityRecord[]) {
  return AREAS.map((area) => {
    const xs = records
      .filter((r) => ACTIVITY[r.activity].area === area && r.seconds)
      .map(mins);
    return { area, median: median(xs), n: xs.length };
  });
}

/** Weeks where the Play version changed, so trend readers know the content may differ. */
export function versionChanges(records: ActivityRecord[]) {
  const out: { at: string; app: string }[] = [];
  let last = "";
  for (const r of [...records].sort((a, b) => a.at.localeCompare(b.at))) {
    if (r.app !== last && last) out.push({ at: r.at, app: r.app });
    last = r.app;
  }
  return out;
}

export interface Trend {
  id: string;
  title: string;
  /** What each point means, in a sentence. */
  means: string;
  unit: "%" | "min" | "";
  domain: [number, number] | null;
  /** Comparable-task filters offered above the chart. */
  options?: { id: string; label: string }[];
  points: (
    records: ActivityRecord[],
    option?: string,
  ) => { value: number | null; n: number };
}

const pct = (hit: number, n: number) => ({
  value: n ? Math.round((hit / n) * 100) : null,
  n,
});
const med = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x !== null);
  return { value: median(v), n: v.length };
};

export const TRENDS: Trend[] = [
  {
    id: "name",
    title: "Name that piece",
    means: "Share of pieces named correctly that week.",
    unit: "%",
    domain: [0, 100],
    options: [
      { id: "ear", label: "By ear" },
      { id: "score", label: "From the score" },
    ],
    points: (rs, meet = "ear") => {
      const xs = rs.filter(
        (r) =>
          r.activity === "name-that-piece" &&
          r.detail.meet === meet &&
          r.outcome !== "revealed",
      );
      return pct(xs.filter((r) => r.outcome === "correct").length, xs.length);
    },
  },
  {
    id: "bench",
    title: "Bench unknowns",
    means: "Share of cases where her identification matched the organism.",
    unit: "%",
    domain: [0, 100],
    points: (rs) => {
      const xs = rs.filter((r) => r.activity === "bench");
      return pct(xs.filter((r) => r.outcome === "correct").length, xs.length);
    },
  },
  {
    id: "tests",
    title: "Tests ordered per case",
    means: "Median number of tests she ordered before signing out.",
    unit: "",
    domain: null,
    points: (rs) =>
      med(
        rs
          .filter((r) => r.activity === "bench")
          .map((r) => num(r.detail.tests)),
      ),
  },
  {
    id: "diff",
    title: "Blood differential",
    means: "Median agreement with the reference count.",
    unit: "%",
    domain: [50, 100],
    points: (rs) =>
      med(
        rs
          .filter((r) => r.activity === "differential")
          .map((r) => num(r.detail.agreement)),
      ),
  },
  {
    id: "killer",
    title: "Killer Sudoku",
    means: "Median minutes to solve, one difficulty at a time.",
    unit: "min",
    domain: null,
    options: [
      { id: "Gentle", label: "Gentle" },
      { id: "Classic", label: "Classic" },
      { id: "Challenging", label: "Challenging" },
    ],
    points: (rs, tier = "Classic") =>
      med(
        rs
          .filter(
            (r) =>
              r.activity === "killer" &&
              r.outcome === "solved" &&
              r.detail.tier === tier,
          )
          .map((r) => (r.seconds ? Math.round(r.seconds / 60) : null)),
      ),
  },
  {
    id: "countdown",
    title: "Countdown",
    means: "Share of rounds where she reached the target exactly.",
    unit: "%",
    domain: [0, 100],
    points: (rs) => {
      const xs = rs.filter((r) => r.activity === "countdown");
      return pct(xs.filter((r) => r.outcome === "solved").length, xs.length);
    },
  },
  {
    id: "hive",
    title: "Letter Hive",
    means: "Median share of the hive’s common words she found.",
    unit: "%",
    domain: [0, 100],
    points: (rs) =>
      med(
        rs.filter((r) => r.activity === "hive").map((r) => num(r.detail.share)),
      ),
  },
  {
    id: "ladder",
    title: "Word ladders",
    means:
      "Median steps beyond the shortest possible ladder (0 means the shortest).",
    unit: "",
    domain: null,
    points: (rs) =>
      med(
        rs
          .filter((r) => r.activity === "ladder")
          .map((r) => {
            const s = num(r.detail.steps);
            const p = num(r.detail.par);
            return s !== null && p !== null ? Math.max(0, s - p) : null;
          }),
      ),
  },
  {
    id: "crypto",
    title: "Cryptograms",
    means: "Median letters she asked to have revealed.",
    unit: "",
    domain: null,
    points: (rs) =>
      med(
        rs
          .filter((r) => r.activity === "cryptogram")
          .map((r) => num(r.detail.revealed)),
      ),
  },
];

const REPEATABLE = new Set([
  "name-that-piece",
  "bench",
  "cryptogram",
  "differential",
]);

export interface Exposure {
  at: string;
  outcome: ActivityRecord["outcome"];
  /** Days since she last met this item, or null the first time. */
  gap: number | null;
}

/** Items she has met more than once, with each meeting in order. */
export function repeats(records: ActivityRecord[]) {
  const groups = new Map<
    string,
    {
      activity: ActivityRecord["activity"];
      item: string;
      title: string;
      seen: Exposure[];
    }
  >();
  for (const r of [...records].sort((a, b) => a.at.localeCompare(b.at))) {
    if (!REPEATABLE.has(r.activity) || !r.item) continue;
    const key = r.activity + "|" + r.item;
    const g = groups.get(key) ?? {
      activity: r.activity,
      item: r.item,
      title: r.title,
      seen: [],
    };
    const prev = g.seen[g.seen.length - 1];
    g.seen.push({
      at: r.at,
      outcome: r.outcome,
      gap: prev
        ? Math.round(
            (new Date(r.at).getTime() - new Date(prev.at).getTime()) / DAY,
          )
        : null,
    });
    groups.set(key, g);
  }
  return [...groups.values()]
    .filter((g) => g.seen.length > 1)
    .sort((a, b) =>
      b.seen[b.seen.length - 1].at.localeCompare(a.seen[a.seen.length - 1].at),
    );
}

/** For yes/no tasks: how it went the first time versus when the item came back. */
export function reExposure(records: ActivityRecord[]) {
  const rows = {
    first: { right: 0, n: 0 },
    sameDay: { right: 0, n: 0 },
    withinWeek: { right: 0, n: 0 },
    later: { right: 0, n: 0 },
  };
  const sorted = [...records].sort((a, b) => a.at.localeCompare(b.at));
  const last = new Map<string, number>();
  for (const r of sorted) {
    if (r.activity !== "name-that-piece" && r.activity !== "bench") continue;
    if (r.outcome !== "correct" && r.outcome !== "incorrect") continue;
    const key = r.activity + "|" + r.item;
    const t = new Date(r.at).getTime();
    const prev = last.get(key);
    const bucket =
      prev === undefined
        ? rows.first
        : new Date(prev).toDateString() === new Date(t).toDateString()
          ? rows.sameDay
          : t - prev <= 7 * DAY
            ? rows.withinWeek
            : rows.later;
    bucket.n++;
    if (r.outcome === "correct") bucket.right++;
    last.set(key, t);
  }
  return rows;
}

/** The same item more than once on one day: could be enjoyment, could be not remembering. */
export function sameDay(records: ActivityRecord[]) {
  const seen = new Map<string, ActivityRecord[]>();
  for (const r of records) {
    if (!REPEATABLE.has(r.activity) || !r.item) continue;
    const key = new Date(r.at).toDateString() + "|" + r.activity + "|" + r.item;
    seen.set(key, [...(seen.get(key) ?? []), r]);
  }
  return [...seen.values()]
    .filter((xs) => xs.length > 1)
    .map((xs) => ({
      day: xs[0].at,
      activity: xs[0].activity,
      title: xs[0].title,
      times: xs.length,
    }))
    .sort((a, b) => b.day.localeCompare(a.day));
}

const csvCell = (v: unknown) => {
  const s = v === undefined || v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(records: ActivityRecord[]) {
  const keys = [
    ...new Set(records.flatMap((r) => Object.keys(r.detail))),
  ].sort();
  const head = [
    "at",
    "local_time",
    "tz",
    "app",
    "area",
    "activity",
    "item",
    "title",
    "outcome",
    "seconds",
    ...keys.map((k) => "detail." + k),
  ];
  const rows = records.map((r) =>
    [
      r.at,
      new Date(r.at).toLocaleString(),
      r.tz ?? "",
      r.app,
      ACTIVITY[r.activity].area,
      r.activity,
      r.item,
      r.title,
      r.outcome,
      r.seconds ?? "",
      ...keys.map((k) => r.detail[k]),
    ]
      .map(csvCell)
      .join(","),
  );
  return [head.join(","), ...rows].join("\n");
}
