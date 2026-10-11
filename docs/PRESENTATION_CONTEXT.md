# Optional presentation observations

Activity history still defaults off. With it on, a new attempt observes theme and text size. Music additionally observes the Sound setting, exact volume range, actual staff/note-pattern/by-ear/rhythm-pattern view, pace and rhythm-feedback flexibility when applicable. These are small finite sets, not event streams; no keystrokes, tap timestamps, microphone recordings or device fingerprints are collected.

## Coverage and changes

A new attempt with history already enabled starts with `coverage: from-start`. Resuming an older draft without metadata, enabling history mid-puzzle or resuming after clearing history starts `partial`. This describes setting-observation coverage, not complete gameplay telemetry. Settings changed while another screen is open are observed when the game is next opened. Changes during an active game accumulate in canonical sets and volume min/max; their order, timestamps and time spent under each setting are unavailable. Never interpret the final settings as the whole attempt.

The rhythm view is recorded as rhythm-pattern regardless of any retained staff preference. Flexibility is relevant only to rhythm attempts. Music sound settings do not establish that playback occurred, successfully started or was heard: output, browser/OS/device volume and hearing remain unknown. A zero volume is explicitly muted. No music score or causal presentation comparison is added.

## Lifecycle and compatibility

Finalized session observations never change when a player browses another view. Same-puzzle replay and mode/content changes begin a fresh context rather than inheriting previous observations; necessary game preferences still carry over. History withdrawal removes draft observations and stops collection while retaining filed history. Explicit Clear activity history removes sessions and optional draft context/metrics from current state and every durable recovery copy, preserving puzzle state and creations.

The optional `presentation` object is version 1 within the existing state/session schema 1. Unknown fields, unsupported enums, empty/duplicate required sets, malformed/out-of-range/reversed volumes and music context on another game fail validation. Old files remain valid and receive no inferred metadata. JSON retains the original object; CSV appends exact quoted JSON without changing the original columns. Insights local preparations accept only validated observations, while separately authorized Companion preparations contain only game/outcome/end time.

Insights uses `local-context-review-3`; canonical grouping includes coverage and every observed value/range, with absent context a separate category. This is grouping, not proof of equal human difficulty, matched reference forms or independent observations. Optional timing metadata separately records explicit foreground pauses from v0.14.0; legacy, background, idle and closed time are not imputed. See [timing collection](TIMING_COLLECTION.md). Input method, other interruptions, clock quality, received timestamps and reference equivalence remain unfinished normalized-context work. Activity uploads and Firestore permissions remain closed.
