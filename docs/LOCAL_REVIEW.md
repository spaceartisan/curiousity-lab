# Local Insights review

Open a Play JSON backup explicitly in Insights. Existing bounded schema-v1 validation applies; an invalid import leaves an existing review intact. The selected backup stays in memory only. Closing or reloading removes it, and importing another backup resets filters. It is never merged into Insights or Companion storage and never uploaded.

## Grouping and interpretation

Contexts separate game, mode, puzzle ID, content version, app version, source and first/repeated exposure. Repeat attempts retain their original attempt numbers in the raw table. Date filters include both endpoints and use the UTC calendar day of session `endedAt`, including timestamps carrying another offset.

Each group reports recorded sessions and UTC days, outcome counts, active-time range and hints divided by completed sessions. Unfinished hints are excluded from this denominator. Piano and laboratory exploration has no accuracy or performance score. Fewer than three records or days gets a sparse-history notice; no trend is estimated at any sample size. Multiple sessions within a player/day are correlated rather than independent participants.

Schema-v1 does not record audio, notation, input method, pauses, clock quality or reference-set equivalence. The same puzzle/mode/version does not establish equivalent presentation or human difficulty. History-off and absent records mean unknown play, not zero. Reversed start/end or active time exceeding elapsed time is flagged without altering original values. Engagement cannot establish enjoyment, cognition or health.

## Source and derived exports

Full-source CSV preserves all imported session fields; filtered CSV scopes the same fields to the current selection. The raw table includes IDs, original timestamps, exact active milliseconds, attempts, hints, undo, source and outcomes. Summaries and records have independent twelve-entry pages. The context selector initially lists 200 contexts; any paged summary can select its own exact context.

Summary JSON uses `analysisVersion: local-context-review-1`, records the selection/filter and source-session IDs, and includes interpretation limitations. It is derived and can be recomputed; it does not replace the source JSON. CSV uses the existing quoted/formula-safe exporter. A review cannot enable activity sharing or change Firestore permissions.
