import { expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  sessionTimeline,
  timelineExport,
  POINTS_PER_PAGE,
} from "../src/insights/timeline";
import { SessionTimeline } from "../src/insights/SessionTimeline";
import { SessionReview } from "../src/insights/SessionReview";
import { contextKey } from "../src/insights/review";
import { fictionalTimeline } from "./fixtures/timeline";
import * as local from "../src/storage/local";
it("plots require one exact chosen context and cannot pool other versions or coverage", () => {
  const s = fictionalTimeline().sessions,
    key = contextKey(s[0]);
  expect(sessionTimeline(s, "all", "active").points).toEqual([]);
  expect(sessionTimeline(s, key, "active").records).toBe(32);
  expect(sessionTimeline(s, key, "active").recordIds).not.toContain(
    "fictional-pause-unknown",
  );
  expect(
    sessionTimeline(
      [...s, { ...s[0], id: "changed", contentVersion: "changed" }],
      key,
      "active",
    ).records,
  ).toBe(32);
});
it("chronological UTC points keep ties and original offset timestamps without mutating sources", () => {
  const s = fictionalTimeline().sessions,
    snapshot = JSON.stringify(s),
    m = sessionTimeline([...s].reverse(), contextKey(s[0]), "active");
  expect(m.points.slice(0, 2).map((p) => p.session.id)).toEqual([
    "fictional-point-00",
    "fictional-point-01",
  ]);
  expect(m.points[0].endedAtMs).toBe(m.points[1].endedAtMs);
  expect(m.points[1].session.endedAt).toContain("-04:00");
  expect(m.days).toBe(16);
  expect(m.valueDomain).toEqual([0, 600000]);
  expect(m.points).toHaveLength(32);
  expect(JSON.stringify(s)).toBe(snapshot);
});
it("hint plots use completed sessions only and exploration has no performance plot", () => {
  const s = fictionalTimeline().sessions,
    key = contextKey(s[0]),
    m = sessionTimeline(s, key, "hints");
  expect(m.records).toBe(32);
  expect(m.points).toHaveLength(31);
  expect(m.omittedSessionIds).toEqual(["fictional-point-04"]);
  expect(m.points.every((p) => p.value < 99)).toBe(true);
  for (const game of ["music", "lab"] as const) {
    const item = { ...s[33], game };
    expect(sessionTimeline([item], contextKey(item), "hints").points).toEqual(
      [],
    );
  }
});
it("observed zero pause is a genuine point while missing pause is unknown", () => {
  const s = fictionalTimeline().sessions,
    m = sessionTimeline(s, contextKey(s[0]), "pause");
  expect(m.points[0].value).toBe(0);
  expect(m.unit).toBe("seconds");
  const unknown = sessionTimeline(s, contextKey(s[32]), "pause");
  expect(unknown.points).toEqual([]);
  expect(unknown.omittedSessionIds).toEqual(["fictional-pause-unknown"]);
});
it("zero/single/extreme records get finite domains and inconsistent source values remain visible", () => {
  const s = fictionalTimeline().sessions[0],
    zero = { ...s, activeMs: 0, timing: { ...s.timing!, pausedMs: 0 } };
  const m = sessionTimeline([zero], contextKey(zero), "active");
  expect(m.valueDomain).toEqual([0, 1000]);
  expect(m.timeDomain[1] - m.timeDomain[0]).toBe(120000);
  const edge = {
    ...s,
    endedAt: new Date(8640000000000000).toISOString(),
    activeMs: Number.MAX_VALUE,
  };
  const end = sessionTimeline([edge], contextKey(edge), "active");
  expect(end.timeDomain[1]).toBe(8640000000000000);
  expect(end.timeIssues).toBe(1);
  render(<SessionTimeline sessions={[edge]} context={contextKey(edge)} />);
  expect(
    screen
      .getByRole("button", { name: /fictional-point-00:/ })
      .getAttribute("cy"),
  ).toBe("50");
});
it("versioned plot exports retain all inclusion IDs, raw units, timestamps and source independence", () => {
  const s = fictionalTimeline().sessions,
    key = contextKey(s[0]),
    m = sessionTimeline(s, key, "hints"),
    e = timelineExport(m, key);
  expect(e.plotVersion).toBe("local-session-points-2");
  expect(e.selectedSourceSessionIds).toHaveLength(32);
  expect(e.sourceSessionIds).toHaveLength(31);
  expect(e.excludedSourceSessionIds).toEqual(["fictional-point-04"]);
  expect(e.points[1]).toMatchObject({
    sessionId: "fictional-point-01",
    sourceEndedAt: "2026-10-01T11:00:00-04:00",
    endedAtUtc: "2026-10-01T15:00:00.000Z",
    value: 1,
    unit: "count",
    attempt: 3,
  });
  expect(
    timelineExport(sessionTimeline(s, key, "active"), key).points[0],
  ).toMatchObject({ value: 24000, unit: "ms" });
  e.sourceSessionIds.pop();
  expect(m.points).toHaveLength(31);
  expect(e.limitations.join()).toContain("No trend estimate");
});
it("overlapping points remain reachable by keyboard and session selector with exact source detail", async () => {
  const user = userEvent.setup(),
    s = fictionalTimeline().sessions;
  render(<SessionTimeline sessions={s} context={contextKey(s[0])} />);
  const point = screen.getByRole("button", { name: /fictional-point-01:/ });
  point.focus();
  fireEvent.keyDown(point, { key: "Enter" });
  const detail = screen.getByRole("region", {
    name: "Selected session details",
  });
  expect(within(detail).getByText("fictional-point-01")).toBeInTheDocument();
  expect(
    within(detail).getByText(/exact source: 24000 ms/),
  ).toBeInTheDocument();
  await user.selectOptions(
    screen.getByLabelText("Selected plotted session"),
    "fictional-point-04",
  );
  expect(
    within(detail).getByText(/unfinished.*Repeat attempt 6/),
  ).toBeInTheDocument();
  await user.click(screen.getByText("Plot data table"));
  expect(
    within(
      screen.getByRole("region", { name: "Plot source values" }),
    ).getAllByRole("row"),
  ).toHaveLength(POINTS_PER_PAGE + 1);
});
it("point paging preserves full-context scales and metric changes reset the page", async () => {
  const user = userEvent.setup(),
    s = fictionalTimeline().sessions;
  render(<SessionTimeline sessions={s} context={contextKey(s[0])} />);
  const axes = () =>
    [
      ...screen
        .getByRole("group", { name: /Observed active time by/ })
        .querySelectorAll("text"),
    ]
      .map((x) => x.textContent)
      .join("|");
  const first = axes();
  await user.click(screen.getByRole("button", { name: "Next plot points" }));
  expect(screen.getByText("Plot page 2 of 2")).toBeInTheDocument();
  expect(axes()).toBe(first);
  expect(screen.getByLabelText("Selected plotted session")).toHaveValue(
    "fictional-point-24",
  );
  await user.selectOptions(screen.getByLabelText("Plot value"), "hints");
  expect(screen.getByText("Plot page 1 of 2")).toBeInTheDocument();
  expect(screen.getByLabelText("Selected plotted session")).toHaveValue(
    "fictional-point-00",
  );
});
it("unknown pause never renders zero and exploration disables hints without hiding activity", async () => {
  const user = userEvent.setup(),
    s = fictionalTimeline().sessions;
  const view = render(
    <SessionTimeline sessions={s} context={contextKey(s[32])} />,
  );
  await user.selectOptions(screen.getByLabelText("Plot value"), "pause");
  expect(screen.getByText(/Missing values are unknown/)).toBeInTheDocument();
  expect(screen.queryByRole("group")).toBeNull();
  view.unmount();
  render(<SessionTimeline sessions={s} context={contextKey(s[33])} />);
  expect(
    screen.getByRole("option", { name: "Hints in completed sessions" }),
  ).toBeDisabled();
  expect(
    screen.getByRole("button", { name: /fictional-exploration:/ }),
  ).toBeInTheDocument();
});
it("review filters reset plot state and actual export includes every selected page without importing or changing records", async () => {
  const user = userEvent.setup(),
    review = fictionalTimeline(),
    snapshot = JSON.stringify(review),
    spy = vi.spyOn(local, "download").mockImplementation(() => {});
  render(<SessionReview review={review} onClose={() => {}} />);
  expect(screen.queryByLabelText("Plot value")).toBeNull();
  await user.selectOptions(
    screen.getByLabelText("Puzzle context"),
    contextKey(review.sessions[0]),
  );
  await user.click(screen.getByRole("button", { name: "Next plot points" }));
  await user.click(screen.getByRole("button", { name: "Export plot data" }));
  expect(spy.mock.calls[0][0]).toMatchObject({
    records: 32,
    sourceSessionIds: review.sessions.slice(0, 32).map((s) => s.id),
  });
  fireEvent.change(screen.getByLabelText("From date (UTC)"), {
    target: { value: "2026-10-16" },
  });
  expect(
    screen.getByText(/Showing 2 points on page 1 of 1/),
  ).toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: "Reset review filters" }),
  );
  expect(screen.queryByLabelText("Plot value")).toBeNull();
  expect(JSON.stringify(review)).toBe(snapshot);
  spy.mockRestore();
});
