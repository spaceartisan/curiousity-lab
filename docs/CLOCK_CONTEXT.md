# Local clock observations

With optional activity history enabled, new attempts retain `clock` version 1 and algorithm `wall-monotonic-v1`. This is bounded local context, not a verified clock-quality score. It does not change puzzle difficulty or show the player additional prompts.

| Field             | Meaning                                                                                                                                                                    |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `coverage`        | `from-start` for an observed fresh attempt; `partial` for old/mid-attempt collection or an unfinished draft reopened after browser reload/restore.                         |
| `timeZone`        | Browser-reported zone at collection start, or `null` if unavailable. Not location or a fingerprint.                                                                        |
| `timeZoneChanged` | A later observed zone differed or became available/unavailable. It does not identify the cause.                                                                            |
| `wallClockShift`  | Consecutive wall and monotonic elapsed readings differed by more than 2,000 ms, or the monotonic reading regressed/was invalid. No claim about which clock was correct.    |
| `observationGap`  | A consecutive monotonic or forward wall interval exceeded 90,000 ms. This can reflect suspension, a clock adjustment or other unobserved time. It is not a measured pause. |

Raw wall/monotonic readings are kept only in the runtime observer; no reading arrays, continuous trajectory or server contact is retained. Observations use the existing activity-clock boundaries and one-second sampling. Long idle/hidden intervals do not become active time. A shift with zero accrued time can still mark its bound unfinished attempt. Home-screen intervals and samples bound to another attempt cannot enter that record.

## Continuity and consent

Browser closure leaves a discontinuity that cannot be checked against the previous monotonic clock. The next opened unfinished draft therefore has partial clock coverage. Stored flags persist, while completed sessions and finalized drafts stay unchanged. Imports without this optional field remain valid and unknown; invalid fields, types, extra keys and oversized/unsafe zone text are rejected. Restoring on another browser does not rewrite original source metadata or invent an installation identity.

History-off removes this optional draft field along with timing context. Changing history consent starts new attempt identity under the existing policy. Clearing activity history removes it from current drafts and retained recovery drafts. Necessary game progress and creations remain available.

## Review and exports

`local-context-review-6` groups recorded clock context separately from unknown, partial or changed conditions. A wall-clock shift contributes to the time consistency warning without correcting `startedAt` or `endedAt`. Chronology still uses source UTC timestamps, whose absolute accuracy remains unverified. No observed shift does not prove accurate UTC.

JSON and CSV retain the exact optional context. `local-session-points-4` exports per-point original observations or `null` for unknown context. Explicitly selected local Insights preparation includes validated copies; Companion preparation continues to exclude these details. Private activity upload remains unavailable.

Installation/task normalization, server-received timestamps, matched reference forms, cloud reports and real device review remain future work. This pass does not complete the architecture.
