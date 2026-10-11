import { expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionReview } from "../src/insights/SessionReview";
import {
  ANALYSIS_VERSION,
  contextKey,
  emptyFilters,
  filterSessions,
  reviewSummary,
  summarizeContexts,
} from "../src/insights/review";
import { fictionalReview } from "./fixtures/review";
import * as local from "../src/storage/local";
it("grouping separates game, mode, puzzle, both versions and first/repeat exposure without collisions", () => {
  const s = fictionalReview().sessions[0],
    key = contextKey(s);
  for (const patch of [
    { game: "search" as const },
    { mode: "other" },
    { puzzleId: "other" },
    { contentVersion: "other" },
    { appVersion: "other" },
    { attempt: 1 },
  ])
    expect(contextKey({ ...s, ...patch })).not.toBe(key);
  expect(contextKey({ ...s, attempt: 7 })).toBe(key);
  expect(contextKey({ ...s, mode: "a|b", puzzleId: "c" })).not.toBe(
    contextKey({ ...s, mode: "a", puzzleId: "b|c" }),
  );
});
it("summaries retain denominators, ranges, source IDs, exploration exclusions and clock warnings", () => {
  const state = fictionalReview(),
    snapshot = JSON.stringify(state);
  const groups = summarizeContexts(state.sessions),
    group = groups.find((g) => g.sessionIds.includes("fictional-repeat-2"))!;
  expect(group.n).toBe(3);
  expect(group.days).toBe(3);
  expect(group.counts).toEqual({ completed: 2, explored: 0, unfinished: 1 });
  expect(group.completedHints).toEqual({
    n: 2,
    total: 6,
    perSession: 3,
    range: [2, 4],
  });
  expect(group.activeMinutesRange).toEqual([2, 4]);
  for (const id of ["fictional-lab", "fictional-piano"])
    expect(
      groups.find((g) => g.sessionIds.includes(id))!.completedHints,
    ).toBeNull();
  expect(
    groups.find((g) => g.sessionIds.includes("fictional-clock"))!.timeIssues,
  ).toBe(1);
  expect(
    groups.find((g) => g.sessionIds.includes("fictional-unfinished"))!
      .sessionIds,
  ).toContain("fictional-repeat-2");
  expect(JSON.stringify(state)).toBe(snapshot);
});
it("date filtering uses inclusive UTC end dates and sorting never mutates original records", () => {
  const sessions = fictionalReview().sessions,
    snapshot = JSON.stringify(sessions),
    f = emptyFilters();
  const boundary = filterSessions(sessions, {
    ...f,
    from: "2026-10-11",
    to: "2026-10-11",
  });
  expect(boundary.map((s) => s.id)).toEqual(["fictional-utc-boundary"]);
  expect(
    filterSessions(sessions, { ...f, from: "2026-10-12", to: "2026-10-10" }),
  ).toEqual([]);
  expect(
    filterSessions(sessions, { ...f, exposure: "first" }).map((s) => s.id),
  ).toEqual(["fictional-first"]);
  expect(
    filterSessions(sessions, { ...f, game: "lab" }).map((s) => s.id),
  ).toEqual(["fictional-lab"]);
  expect(JSON.stringify(sessions)).toBe(snapshot);
});
it("derived exports are versioned and retain filter/date basis/source IDs and missing-context limits", () => {
  const sessions = fictionalReview().sessions,
    f = { ...emptyFilters(), context: contextKey(sessions[0]) };
  const report = reviewSummary(sessions, f);
  expect(report.analysisVersion).toBe(ANALYSIS_VERSION);
  expect(report.selectedSessions).toBe(3);
  expect(report.contexts[0].sessionIds).toHaveLength(3);
  expect(report.filters).toEqual(f);
  expect(report.limitations.join()).toContain("not recorded");
  expect(reviewSummary([], emptyFilters()).contexts).toEqual([]);
});
it("the review paginates records and summaries independently and resets pages on filters", async () => {
  const user = userEvent.setup(),
    review = fictionalReview();
  render(<SessionReview review={review} onClose={() => {}} />);
  expect(screen.getAllByRole("article")).toHaveLength(12);
  expect(
    within(
      screen.getByRole("region", { name: "Raw recorded sessions" }),
    ).getAllByRole("row"),
  ).toHaveLength(13);
  await user.click(screen.getByRole("button", { name: "Next records" }));
  expect(screen.getByText("Record page 2 of 2")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Next summaries" }));
  expect(screen.getByText("Summary page 2 of 2")).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText("Review activity"), "lab");
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(screen.queryByRole("button", { name: "Next records" })).toBeNull();
  expect(
    screen.getByText(/no accuracy or performance score/),
  ).toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: "Reset review filters" }),
  );
  expect(screen.getByText("Record page 1 of 2")).toBeInTheDocument();
});
it("exact context review preserves exposure separation and truthful empty/date-range states", async () => {
  const user = userEvent.setup(),
    review = fictionalReview();
  render(<SessionReview review={review} onClose={() => {}} />);
  await user.selectOptions(
    screen.getByLabelText("Puzzle context"),
    contextKey(review.sessions[0]),
  );
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(
    screen.getByText(/6 hints \/ 2 completed sessions/),
  ).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText("Repeat exposure"), "first");
  expect(screen.getByText(/No recorded sessions match/)).toBeInTheDocument();
  await user.click(
    screen.getByRole("button", { name: "Reset review filters" }),
  );
  await user.type(screen.getByLabelText("From date (UTC)"), "2026-10-12");
  await user.type(screen.getByLabelText("Through date (UTC)"), "2026-10-01");
  expect(screen.getByRole("alert")).toHaveTextContent("earlier than");
});
it("full and filtered CSV preserve original precision while summary exports are distinct", async () => {
  const spy = vi.spyOn(local, "download").mockImplementation(() => {}),
    user = userEvent.setup(),
    review = fictionalReview(),
    snapshot = JSON.stringify(review);
  render(<SessionReview review={review} onClose={() => {}} />);
  await user.selectOptions(screen.getByLabelText("Review activity"), "lab");
  await user.click(screen.getByRole("button", { name: "Export reviewed CSV" }));
  expect(spy.mock.calls[0][0]).toBe(local.sessionsCsv(review));
  await user.click(screen.getByRole("button", { name: "Export filtered CSV" }));
  expect(String(spy.mock.calls[1][0])).toContain("fictional-lab");
  expect(String(spy.mock.calls[1][0])).not.toContain("fictional-first");
  await user.click(
    screen.getByRole("button", { name: "Export review summary" }),
  );
  expect(spy.mock.calls[2][0]).toMatchObject({
    analysisVersion: ANALYSIS_VERSION,
    selectedSessions: 1,
  });
  expect(JSON.stringify(review)).toBe(snapshot);
  spy.mockRestore();
});
it("empty sources never fabricate activity, and context selection stays bounded for long exports", async () => {
  const review = fictionalReview();
  review.sessions = [];
  const view = render(<SessionReview review={review} onClose={() => {}} />);
  expect(screen.getByRole("status")).toHaveTextContent(
    "0 of 0 recorded sessions",
  );
  expect(screen.queryByRole("article")).toBeNull();
  view.unmount();
  const base = fictionalReview().sessions[0];
  review.sessions = Array.from({ length: 205 }, (_, i) => ({
    ...base,
    id: `fictional-long-${i}`,
    puzzleId: `fictional-puzzle-${i}`,
  }));
  render(<SessionReview review={review} onClose={() => {}} />);
  expect(
    within(screen.getByLabelText("Puzzle context")).getAllByRole("option"),
  ).toHaveLength(201);
  const user = userEvent.setup();
  for (let i = 0; i < 17; i++)
    await user.click(screen.getByRole("button", { name: "Next summaries" }));
  await user.click(
    screen.getAllByRole("button", { name: "Review this context" })[0],
  );
  expect(screen.getByRole("status")).toHaveTextContent(
    "1 of 205 recorded sessions",
  );
});
