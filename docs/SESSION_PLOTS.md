# Local individual-session plots

Insights plots only an explicitly chosen context in a selected Play backup. It never combines puzzles, modes, versions, exposure categories, observed settings or timing coverage into one series. Imported records remain in memory, are not modified, merged into role storage or uploaded, and disappear on close/reload. Matching context is a grouping rule, not validated human difficulty or a reference challenge.

## Values and denominators

- Active time: every selected saved session's original `activeMs`.
- Foreground pause: only selected records with timing metadata. Observed zero is plotted; unknown is omitted, never replaced with zero. Partial timing still describes only the observed portion.
- Hints: original hint counts in completed puzzle sessions only. Unfinished and explored attempts are excluded. Piano and laboratory exploration have no performance plot; the hint option is unavailable there.

Every metric shows plotted/selected record counts, excluded count/reason and selected UTC day count. A record is not an independent participant; repeated sessions within a puzzle/day can be related. No regression, smoothing, connecting line, mean confidence interval, health/enjoyment score, extrapolation or clinical warning is generated. Existing time-consistency warnings preserve inconsistent source values rather than repairing/excluding them.

## Axes and selection

The horizontal axis is actual session end time normalized to UTC, sorted by timestamp then stable ID. Original offset-bearing timestamps are retained in details and exports. Device clocks are unverified; temporal positions do not establish a longitudinal change. One-time/tied records receive a bounded two-minute viewing domain; valid Date endpoints are respected.

The vertical axis starts at zero and uses the maximum selected original value, with a nonzero domain for all-zero data. Duration axes use seconds under one minute and minutes otherwise; source details/table/export retain exact milliseconds. Count axes use hints. Bounds and units derive from all eligible records in the selected context and stay fixed across twenty-four-point pages. Changing the metric/filter can change the domain, and resets the page/selection.

Circle = completed, square = explored, triangle = unfinished. Overlapping observations are not jittered or collapsed; each remains reachable with the session selector and source table. Points support keyboard Enter/Space selection, and the selected point has a focus-colored outline. Selection/page changes reveal the chosen marker horizontally without jumping the document vertically. A resize observer keeps it visible when font/viewport sizes change; manual scrolling is still available. The plot has a labeled scroll region and grows with the app’s Larger text setting and browser text sizing; horizontal scrolling stays within the plot, with surrounding controls reflowing. The data table has its own labeled scroll region.

## Reproducible export

`Export plot data` produces JSON with `plotVersion: local-session-points-2`, canonical context, selected metric, every selected/plotted/excluded source ID, counts, time/value domains, exact metric units and values, original and UTC timestamps, outcomes, attempts, hints/undo and limitations. It includes every eligible page, not only visible points. The existing raw CSV/JSON and `local-context-review-4` summary remain available; their aggregation algorithm is unchanged.

Source clocks, missing optional context, unresolved normalized identity/input fields, correlated practice and unmatched reference forms remain limitations. No new activity collection or Firestore permission is introduced. Private cloud sync, shared reports, independently reviewed content and actual-device/production gates remain unfinished.
