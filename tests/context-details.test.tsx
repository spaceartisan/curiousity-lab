import { expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionReview } from "../src/insights/SessionReview";
import {
  contextKey,
  reviewSummary,
  emptyFilters,
} from "../src/insights/review";
import { fictionalReview } from "./fixtures/review";
import { CLOCK_ALGORITHM } from "../src/storage/clock-context";
it("keeps technical provenance closed, accessible and exact while short titles separate first/repeat contexts", async () => {
  const user = userEvent.setup(),
    source = fictionalReview();
  source.sessions = source.sessions.slice(0, 4);
  const snapshot = structuredClone(source),
    summary = reviewSummary(source.sessions, emptyFilters());
  render(<SessionReview review={source} onClose={() => {}} />);
  const cards = screen.getAllByRole("article");
  expect(cards).toHaveLength(2);
  for (const card of cards) {
    expect(within(card).getByRole("heading", { level: 4 })).toHaveTextContent(
      "Sudoku · 9x9:Classic",
    );
    const details = card.querySelector("details")!;
    expect(details.open).toBe(false);
    const toggle = within(card).getByText("Context details", { exact: true });
    await user.click(toggle);
    expect(details.open).toBe(true);
    expect(
      within(details).getByText("fictional-sudoku-a", { exact: true }),
    ).toBeVisible();
    expect(
      within(details).getByText(
        "Clock context unrecorded; UTC accuracy unverified",
        { exact: true },
      ),
    ).toBeVisible();
    await user.click(toggle);
    expect(details.open).toBe(false);
  }
  expect(source).toEqual(snapshot);
  expect(reviewSummary(source.sessions, emptyFilters())).toEqual(summary);
});
it("distinguishes matching short titles with source-bound context choices and exposes clock/presentation limitations", async () => {
  const user = userEvent.setup(),
    source = fictionalReview();
  const base = source.sessions[0];
  source.sessions = [
    base,
    {
      ...base,
      id: "synthetic-observed-clock",
      clock: {
        version: 1,
        algorithm: CLOCK_ALGORITHM,
        coverage: "partial",
        timeZone: "UTC",
        timeZoneChanged: true,
        wallClockShift: true,
        observationGap: true,
      },
    },
  ];
  render(<SessionReview review={source} onClose={() => {}} />);
  const select = screen.getByLabelText("Puzzle context");
  const options = within(select).getAllByRole("option").slice(1);
  expect(options[0].textContent).not.toBe(options[1].textContent);
  await user.selectOptions(select, contextKey(source.sessions[1]));
  const card = screen.getByRole("article");
  await user.click(within(card).getByText("Context details", { exact: true }));
  expect(
    within(card).getByText(
      /Local clock observations partial; zone UTC .*clock shift observed/,
    ),
  ).toBeVisible();
  expect(
    within(card).getByText("Presentation settings unrecorded", { exact: true }),
  ).toBeVisible();
  expect(
    within(card).getByText("App version", { exact: true }).nextElementSibling,
  ).toHaveTextContent(base.appVersion);
  expect(
    within(card).getByText("Content version", { exact: true })
      .nextElementSibling,
  ).toHaveTextContent(base.contentVersion);
  await user.click(
    within(card).getByRole("button", { name: "Review this context" }),
  );
  expect(select).toHaveValue(contextKey(source.sessions[1]));
});
