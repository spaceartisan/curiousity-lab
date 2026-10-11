import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { App } from "../src/App";
import { clearState } from "../src/storage/local";
import { ActivityRecorder, useRecord } from "../src/activity/recorder";
import {
  allRecords,
  clearRecords,
  markUploaded,
  pendingRecords,
} from "../src/activity/store";
import {
  fromSession,
  validRecord,
  type ActivityRecord,
} from "../src/activity/records";
import { validGift, validNote } from "../src/activity/family-data";
import { fictionalFamily } from "../src/activity/demo";
import { highlights, starters } from "../src/activity/stories";
import {
  calendar,
  reExposure,
  repeats,
  sameDay,
  toCsv,
  TRENDS,
  weeksBetween,
  byWeek,
} from "../src/insights/analysis";

const base: ActivityRecord = {
  v: 1,
  id: "abc12345",
  at: "2026-10-01T15:00:00.000Z",
  seconds: 90,
  tz: "America/New_York",
  app: "0.33.0",
  activity: "name-that-piece",
  item: "fur-elise",
  title: "Für Elise — Ludwig van Beethoven",
  outcome: "correct",
  detail: { meet: "ear", family: "classical" },
};
const rec = (over: Partial<ActivityRecord>): ActivityRecord => ({
  ...base,
  ...over,
});

beforeEach(async () => {
  await clearRecords();
  await clearState("companion");
  await clearState("insights");
});

describe("activity records", () => {
  it("validates the shared record shape strictly", () => {
    expect(validRecord(base)).toBe(true);
    expect(validRecord({ ...base, uid: "someone" })).toBe(true);
    expect(validRecord({ ...base, extra: 1 })).toBe(false);
    expect(validRecord({ ...base, activity: "poker" })).toBe(false);
    expect(validRecord({ ...base, outcome: "won" })).toBe(false);
    expect(validRecord({ ...base, id: "has spaces" })).toBe(false);
  });

  it("maps legacy sessions into records", () => {
    const r = fromSession({
      id: "s:1/2",
      schemaVersion: 1,
      appVersion: "0.31.0",
      contentVersion: "1",
      game: "sudoku",
      puzzleId: "classic-1",
      startedAt: "2026-10-01T14:00:00.000Z",
      endedAt: "2026-10-01T14:10:00.000Z",
      activeMs: 600_000,
      hints: 1,
      undos: 0,
      outcome: "completed",
      mode: "Classic",
      attempt: 1,
      source: "local-guest",
    });
    expect(r.id).toBe("legacy-s12");
    expect(r.outcome).toBe("solved");
    expect(r.seconds).toBe(600);
    expect(validRecord(r)).toBe(true);
  });

  it("validates notes and gifts", () => {
    expect(
      validNote({
        v: 1,
        id: "note0001",
        at: base.at,
        author: "companion",
        name: "Dad",
        text: "Good day",
      }),
    ).toBe(true);
    expect(
      validNote({
        v: 1,
        id: "note0001",
        at: base.at,
        author: "play",
        name: "Dad",
        text: "x",
      }),
    ).toBe(false);
    expect(
      validGift({
        v: 1,
        id: "gift0001",
        at: base.at,
        from: "companion",
        fromName: "Dad",
        kind: "piece",
        item: "fur-elise",
        title: "Für Elise",
        message: "",
        status: "sent",
      }),
    ).toBe(true);
  });
});

describe("recorder and outbox", () => {
  function Finish() {
    const record = useRecord();
    return (
      <button
        onClick={() =>
          record({
            activity: "countdown",
            item: "numbers-001",
            title: "Countdown · target 512",
            outcome: "solved",
            detail: { steps: 3 },
          })
        }
      >
        finish
      </button>
    );
  }

  it("keeps nothing when activity history is off", async () => {
    render(
      <ActivityRecorder enabled={false}>
        <Finish />
      </ActivityRecorder>,
    );
    fireEvent.click(screen.getByText("finish"));
    await new Promise((r) => setTimeout(r, 50));
    expect(await allRecords()).toEqual([]);
  });

  it("keeps a valid record when on, pending until uploaded", async () => {
    render(
      <ActivityRecorder enabled>
        <Finish />
      </ActivityRecorder>,
    );
    fireEvent.click(screen.getByText("finish"));
    await waitFor(async () => expect(await allRecords()).toHaveLength(1));
    const [r] = await allRecords();
    expect(validRecord(r)).toBe(true);
    expect(await pendingRecords()).toHaveLength(1);
    await markUploaded([r.id]);
    expect(await pendingRecords()).toHaveLength(0);
  });
});

describe("stories and analysis", () => {
  const now = new Date("2026-10-11T18:00:00");
  const demo = fictionalFamily(now);

  it("fictional data is valid, varied and dated before now", () => {
    expect(demo.fictional).toBe(true);
    expect(demo.records.length).toBeGreaterThan(100);
    expect(demo.records.every(validRecord)).toBe(true);
    expect(demo.records.every((r) => new Date(r.at) <= now)).toBe(true);
    expect(new Set(demo.records.map((r) => r.activity)).size).toBeGreaterThan(
      6,
    );
    expect(demo.notes.every(validNote)).toBe(true);
    expect(demo.gifts.every(validGift)).toBe(true);
  });

  it("writes highlights and starters from what she did", () => {
    const h = highlights([rec({ detail: { meet: "score" } })]);
    expect(h[0].text).toBe("Recognized Für Elise from the sheet music");
    const s = starters([rec({})]);
    expect(s[0]).toMatch(/Put on Für Elise together/);
    expect(starters(demo.records).length).toBeGreaterThan(0);
  });

  it("buckets a calendar and weeks without losing records", () => {
    const days = calendar(demo.records, now, 12);
    expect(days).toHaveLength(84);
    expect(days[0].date.getDay()).toBe(1);
    const weeks = weeksBetween(new Date(demo.records[0].at), now);
    const total = byWeek(demo.records, weeks).reduce((a, b) => a + b.length, 0);
    expect(total).toBe(demo.records.length);
  });

  it("compares like with like in trends", () => {
    const name = TRENDS.find((t) => t.id === "name")!;
    const rs = [
      rec({}),
      rec({ outcome: "incorrect", id: "b0000000" }),
      rec({ id: "c0000000", detail: { meet: "score" } }),
    ];
    expect(name.points(rs, "ear")).toEqual({ value: 50, n: 2 });
    expect(name.points(rs, "score")).toEqual({ value: 100, n: 1 });
  });

  it("describes re-exposure and same-day repeats without scoring", () => {
    const rs = [
      rec({ id: "a0000000", at: "2026-09-01T15:00:00Z" }),
      rec({ id: "b0000000", at: "2026-09-01T17:00:00Z", outcome: "incorrect" }),
      rec({ id: "c0000000", at: "2026-09-05T15:00:00Z" }),
      rec({ id: "d0000000", at: "2026-09-30T15:00:00Z" }),
    ];
    expect(reExposure(rs)).toEqual({
      first: { right: 1, n: 1 },
      sameDay: { right: 0, n: 1 },
      withinWeek: { right: 1, n: 1 },
      later: { right: 1, n: 1 },
    });
    expect(repeats(rs)[0].seen.map((e) => e.gap)).toEqual([null, 0, 4, 25]);
    expect(sameDay(rs)[0].times).toBe(2);
  });

  it("exports CSV with escaped cells and detail columns", () => {
    const csv = toCsv([rec({ title: 'Say "hi", please' })]);
    const [head, row] = csv.split("\n");
    expect(head).toContain("detail.meet");
    expect(row).toContain('"Say ""hi"", please"');
  });
});

describe("Companion and Insights fictional views", () => {
  it("Companion shows the week, starters, notes and sending", async () => {
    render(<App appRole="companion" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "View a fictional example" }),
    );
    expect(await screen.findByText("This week")).toBeInTheDocument();
    expect(screen.getByText("Something to talk about")).toBeInTheDocument();
    expect(screen.getByText("Send something to Mom")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Note"), {
      target: { value: "Lovely afternoon" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    expect(
      await screen.findByText(/fictional example, so the note wasn’t saved/),
    ).toBeInTheDocument();
  });

  it("Insights shows engagement, trends, memory signals and raw records", async () => {
    render(<App appRole="insights" />);
    fireEvent.click(
      await screen.findByRole("button", { name: "View a fictional example" }),
    );
    expect(
      await screen.findByText("Every day, last 12 weeks"),
    ).toBeInTheDocument();
    expect(screen.getByText("Trends on comparable tasks")).toBeInTheDocument();
    expect(
      screen.getByText("When a piece or case comes back"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Download CSV" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Review a local Play export")).toBeInTheDocument();
  });
});

describe("Play sharing", () => {
  it("asks once, then uploads pending records and marks them shared", async () => {
    const { useActivitySync, SharingQuestion } =
      await import("../src/activity/PlayFamily");
    const { saveRecord } = await import("../src/activity/store");
    localStorage.clear();
    await saveRecord(base);
    const uploaded: string[] = [];
    const client = {
      uploadActivity: async (_f: string, rs: ActivityRecord[]) => {
        uploaded.push(...rs.map((r) => r.id));
        return rs.map((r) => r.id);
      },
      setSharing: async () => {},
    };
    const family = {
      connection: {
        status: "approved",
        uid: "mom00001",
        membership: { familyId: "fam00001", role: "play", status: "active" },
      },
      client,
      projectId: "test",
    } as unknown as Parameters<typeof useActivitySync>[0];
    function Harness() {
      const sync = useActivitySync(family, []);
      return sync.needsDecision ? (
        <SharingQuestion onAnswer={(on) => void sync.decide(on)} />
      ) : (
        <p>{sync.sharing ? "sharing" : "not sharing"}</p>
      );
    }
    render(<Harness />);
    expect(uploaded).toEqual([]);
    fireEvent.click(
      screen.getByRole("button", { name: "Yes, share with the family" }),
    );
    expect(await screen.findByText("sharing")).toBeInTheDocument();
    await waitFor(() => expect(uploaded).toEqual([base.id]));
    await waitFor(async () => expect(await pendingRecords()).toHaveLength(0));
    expect(
      JSON.parse(localStorage.getItem("curiosity-lab:sharing:mom00001")!).on,
    ).toBe(true);
  });
});
