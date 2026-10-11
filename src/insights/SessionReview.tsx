import { SessionTimeline } from "./SessionTimeline";
import { timingLabel } from "../storage/timing";
import { presentationLabel } from "../storage/presentation";
import { useMemo, useState } from "react";
import type { LocalState } from "../storage/contracts";
import { download, sessionsCsv } from "../storage/local";
import {
  activityNames,
  ANALYSIS_VERSION,
  contextKey,
  contextLabel,
  emptyFilters,
  filterSessions,
  reviewSummary,
  summarizeContexts,
  type ReviewFilters,
} from "./review";
const PAGE = 12;
function durationRange(minutes: [number, number]) {
  const seconds = minutes[1] < 1;
  const factor = seconds ? 60 : 1;
  return `${(minutes[0] * factor).toFixed(1)}–${(minutes[1] * factor).toFixed(1)} ${seconds ? "seconds" : "minutes"}`;
}
export function SessionReview({
  review,
  onClose,
}: {
  review: LocalState;
  onClose: () => void;
}) {
  const [filters, setFilters] = useState(emptyFilters),
    [page, setPage] = useState(1),
    [groupPage, setGroupPage] = useState(1);
  const selected = useMemo(
    () => filterSessions(review.sessions, filters),
    [review.sessions, filters],
  );
  const summaries = useMemo(() => summarizeContexts(selected), [selected]);
  const contexts = useMemo(
    () =>
      [
        ...new Map(
          review.sessions
            .filter((s) => filters.game === "all" || s.game === filters.game)
            .map((s) => [contextKey(s), contextLabel(s)]),
        ).entries(),
      ].sort((a, b) => a[1].localeCompare(b[1])),
    [review.sessions, filters.game],
  );
  function change(patch: Partial<ReviewFilters>) {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
    setGroupPage(1);
  }
  const pages = Math.max(1, Math.ceil(selected.length / PAGE)),
    groups = Math.max(1, Math.ceil(summaries.length / PAGE));
  return (
    <section className="session-review" aria-label="Imported activity review">
      <p>
        {review.sessions.length} recorded sessions · {review.creations.length}{" "}
        creations · Local guest source
      </p>
      <button onClick={onClose}>Close imported review</button>
      <h3>Review recorded sessions</h3>
      <p>
        This is puzzle activity, not a medical assessment. Sleep, hearing,
        practice and puzzle difficulty can affect results. Active time does not
        establish enjoyment.
      </p>
      <p className="notice">
        Setting observations may be unrecorded, partial or mixed. A sound-on
        setting does not prove audible playback. Explicit pause time is observed
        only while the activity is visible; background, idle and closed time are
        excluded. Older pause time, input method and clock quality are
        unrecorded. Matching puzzle and version does not establish equivalent
        presentation. Play without activity history is absent, not zero
        activity.
      </p>
      <div className="review-filters">
        <label>
          Activity
          <select
            aria-label="Review activity"
            value={filters.game}
            onChange={(e) =>
              change({
                game: e.target.value as ReviewFilters["game"],
                context: "all",
              })
            }
          >
            <option value="all">All activities</option>
            {Object.entries(activityNames).map(([key, name]) => (
              <option key={key} value={key}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Puzzle context
          <select
            aria-label="Puzzle context"
            value={filters.context}
            onChange={(e) => change({ context: e.target.value })}
          >
            <option value="all">All contexts — separate summaries</option>
            {contexts
              .filter(
                (entry, index) => index < 200 || entry[0] === filters.context,
              )
              .map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
          </select>
        </label>
        <label>
          Repeat exposure
          <select
            aria-label="Repeat exposure"
            value={filters.exposure}
            onChange={(e) =>
              change({ exposure: e.target.value as ReviewFilters["exposure"] })
            }
          >
            <option value="all">First and repeat — separate summaries</option>
            <option value="first">First attempts</option>
            <option value="repeat">Repeat attempts</option>
          </select>
        </label>
        <label>
          From date (UTC)
          <input
            aria-label="From date (UTC)"
            type="date"
            value={filters.from}
            onChange={(e) => change({ from: e.target.value })}
          />
        </label>
        <label>
          Through date (UTC)
          <input
            aria-label="Through date (UTC)"
            type="date"
            value={filters.to}
            onChange={(e) => change({ to: e.target.value })}
          />
        </label>
        <button
          onClick={() => {
            setFilters(emptyFilters());
            setPage(1);
            setGroupPage(1);
          }}
        >
          Reset review filters
        </button>
      </div>
      {filters.from && filters.to && filters.from > filters.to ? (
        <p role="alert">
          The through date is earlier than the from date. Choose a valid date
          range.
        </p>
      ) : null}
      <p role="status">
        {selected.length} of {review.sessions.length} recorded sessions in this
        view · {summaries.length} separate contexts.
      </p>
      <SessionTimeline
        key={`${filters.context}:${filters.game}:${filters.from}:${filters.to}:${filters.exposure}`}
        sessions={selected}
        context={filters.context}
      />
      <h3>Separate context summaries</h3>
      <p>
        Each summary keeps the same puzzle, activity, mode, content version, app
        version, source, first/repeat exposure and observed presentation
        settings and timing observation coverage together. Counts describe saved
        sessions; days are UTC dates. Repeat practice can affect results.
        Sessions within a day or puzzle may be related; they are not independent
        participants. No trend is estimated.
      </p>
      {contexts.length > 200 ? (
        <p>
          For long exports, use “Review this context” on a summary card to
          select any context.
        </p>
      ) : null}
      {!selected.length ? (
        <p>
          No recorded sessions match these filters. Change the filters or reset
          the view.
        </p>
      ) : (
        <>
          <div className="review-contexts">
            {summaries
              .slice((groupPage - 1) * PAGE, groupPage * PAGE)
              .map((s) => (
                <article
                  key={s.key}
                  className="review-context"
                  aria-label={s.label}
                >
                  <h4>{s.label}</h4>
                  <button onClick={() => change({ context: s.key })}>
                    Review this context
                  </button>
                  <p>
                    {s.n} recorded {s.n === 1 ? "session" : "sessions"} across{" "}
                    {s.days} UTC {s.days === 1 ? "day" : "days"}.
                  </p>
                  <p>
                    Completed: {s.counts.completed} of {s.n} · Explored:{" "}
                    {s.counts.explored} · Unfinished: {s.counts.unfinished}
                  </p>
                  <p>
                    Observed active time: {durationRange(s.activeMinutesRange)}.
                  </p>
                  <p>
                    {s.pausedMinutesRange
                      ? `Observed foreground pause: ${durationRange(s.pausedMinutesRange)} (${s.pauseRecords} recorded sessions).`
                      : "Paused time is unavailable."}
                  </p>
                  {s.exploration ? (
                    <p>
                      Exploration and creation: no accuracy or performance
                      score.
                    </p>
                  ) : s.completedHints ? (
                    <p>
                      Hints per completed session:{" "}
                      {s.completedHints.perSession.toFixed(2)} (
                      {s.completedHints.total} hints / {s.completedHints.n}{" "}
                      completed sessions). Observed range:{" "}
                      {s.completedHints.range[0]}–{s.completedHints.range[1]}.
                    </p>
                  ) : (
                    <p>
                      No completed sessions; hints per completed session is
                      unavailable.
                    </p>
                  )}
                  {s.n < 3 || s.days < 3 ? (
                    <p className="muted">
                      Sparse records: {s.n} sessions and {s.days} days. These do
                      not establish a change over time.
                    </p>
                  ) : null}
                  {s.timeIssues ? (
                    <p>
                      Time consistency warning: {s.timeIssues} records have
                      active plus recorded pause time exceeding elapsed time or
                      an end before the start. Source values are preserved.
                    </p>
                  ) : null}
                </article>
              ))}
          </div>
          {groups > 1 ? (
            <nav className="actions" aria-label="Context summary pages">
              <button
                disabled={groupPage === 1}
                onClick={() => setGroupPage((p) => p - 1)}
              >
                Previous summaries
              </button>
              <span>
                Summary page {groupPage} of {groups}
              </span>
              <button
                disabled={groupPage === groups}
                onClick={() => setGroupPage((p) => p + 1)}
              >
                Next summaries
              </button>
            </nav>
          ) : null}
          <h3>Raw session records</h3>
          <p>
            Original source values, newest end time first. This table scrolls
            horizontally when needed.
          </p>
          <div
            className="table-wrap review-table"
            role="region"
            aria-label="Raw recorded sessions"
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  {[
                    "Session / source timestamps",
                    "Activity / versions",
                    "Puzzle / mode",
                    "Attempt",
                    "Active / foreground pause",
                    "Hints / undo",
                    "Outcome / source",
                    "Presentation settings",
                  ].map((x) => (
                    <th scope="col" key={x}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selected.slice((page - 1) * PAGE, page * PAGE).map((s) => (
                  <tr key={s.id}>
                    <td>
                      {s.id}
                      <br />
                      Start: {s.startedAt}
                      <br />
                      End: {s.endedAt}
                    </td>
                    <td>
                      {activityNames[s.game]}
                      <br />
                      app {s.appVersion}
                      <br />
                      {s.contentVersion}
                    </td>
                    <td>
                      {s.puzzleId}
                      <br />
                      {s.mode}
                    </td>
                    <td>{s.attempt === 1 ? "First" : `Repeat ${s.attempt}`}</td>
                    <td>
                      {(s.activeMs / 60000).toFixed(1)} min
                      <br />
                      {s.activeMs} ms active
                      <br />
                      {s.timing
                        ? `${s.timing.pausedMs} ms foreground pause`
                        : "Pause unrecorded"}
                      <br />
                      {timingLabel(s.timing)}
                    </td>
                    <td>
                      {s.hints} / {s.undos}
                    </td>
                    <td>
                      {s.outcome}
                      <br />
                      {s.source}
                    </td>
                    <td>{presentationLabel(s.presentation)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 ? (
            <nav className="actions" aria-label="Raw session pages">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous records
              </button>
              <span>
                Record page {page} of {pages}
              </span>
              <button
                disabled={page === pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next records
              </button>
            </nav>
          ) : null}
        </>
      )}
      <p className="muted">
        Analysis version: {ANALYSIS_VERSION}. Summaries are recalculated from
        this backup; original records are unchanged.
      </p>
      <div className="actions">
        <button
          onClick={() =>
            download(
              sessionsCsv(review),
              "curiosity-lab-reviewed-sessions.csv",
              "text/csv",
            )
          }
        >
          Export reviewed CSV
        </button>
        <button
          onClick={() =>
            download(
              sessionsCsv({ ...review, sessions: selected }),
              "curiosity-lab-filtered-sessions.csv",
              "text/csv",
            )
          }
        >
          Export filtered CSV
        </button>
        <button
          onClick={() =>
            download(
              reviewSummary(review.sessions, filters),
              "curiosity-lab-review-summary.json",
            )
          }
        >
          Export review summary
        </button>
      </div>
    </section>
  );
}
