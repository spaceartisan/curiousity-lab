# Family sharing: Play → Companion and Insights (v0.33.0)

## What gets shared

When Mom finishes something in Play, it becomes one small **activity record**, for example:

| Field | Example |
|---|---|
| `at` | `2026-10-11T19:03:12Z` (when it ended) |
| `seconds` | `412` (rough time spent) |
| `activity` | `bench`, `name-that-piece`, `killer`, `countdown`, … |
| `item` / `title` | `fowl-cholera` / “Sudden deaths in the flock (Poultry farm)” |
| `outcome` | `correct`, `incorrect`, `solved`, `revealed`, `finished` or `stopped` |
| `detail` | up to 16 small fields, e.g. `{ meet: "ear", clues: 0 }` or `{ tests: 5, called: "Pasteurella multocida" }` |
| `app`, `tz` | Play version and time zone |

Notes she types in the lab, her scores and boards in progress are **not** shared. Records go only to her own family.

Records are kept in Play's own IndexedDB store, `curiosity-lab-activity`, while **activity history** is on. The older games still file their sessions too. Those are converted into the same shape when they are shared.

## Consent: asked once, then automatic

When Play is connected to the family, its home screen asks once: *“Share your puzzles and music with the family?”*

- **Yes** turns on activity history, then shares everything recorded so far and everything afterwards. Records are sent when she finishes something, every minute while Play is open, and when the device comes back online. Uploads are idempotent (the record id is the document id), so retries never duplicate.
- **Not now** shares nothing.

Either answer can be changed in **Settings → Sharing with the family**. The choice is stored on her device and mirrored to `families/{f}/sharing/state`, so Companion and Insights can say when sharing is off. Clearing history on Play removes only the local copy. Shared copies can be deleted by the owner.

## Companion (Dad)

- **This week:** seven days, each with a dot sized by minutes. Tap a day to see what she did and how it went, in plain words (“got it”, “had a go”, “finished”).
- **Highlights:** the best moments of the week, such as recognizing a piece from the score, identifying a bench unknown, or solving one of Carroll's ladders.
- **Something to talk about:** gentle openers drawn from what she actually did. They never quiz her.
- **A quick note:** how the day went. Notes are visible to Companion and Insights, never to Play.
- **Send something to Mom:** a piece of music, a lab case, a quotation or just a message, with your name. It waits on her home screen. *Listen* opens the music room on that piece and *Open the case* opens the bench on that case. You can see when she has opened it.

## Insights (owner)

All figures are descriptive: counts, shares and medians. There are no composite scores.

- **Engagement:** last 4 weeks at a glance; a 12-week calendar of minutes per day; minutes per week by area; time of day; activity mix and typical sitting length.
- **Trends on comparable tasks:** one chart per task type, so like is compared with like. They cover Name That Piece by ear or from the score, bench identification and tests ordered, differential agreement, Killer Sudoku minutes by difficulty, Countdown exact hits, Letter Hive share, ladder steps over the shortest, and cryptogram reveals. Weeks with fewer than 3 tries are hollow points. A dashed line marks a Play update.
- **Memory signals:** how Name That Piece and bench cases went the first time versus when the same item came back (same day, within a week, later); the same item more than once in one day; and each repeated item's meetings in order, with the days between them. These describe what happened. They cannot separate remembering from recognizing or enjoying.
- **Notes and sending:** the shared notes timeline, your own notes, and the same *Send something*.
- **Raw records:** every shared record, filterable, with CSV and JSON download.
- **View a fictional example** fills both apps with a made-up family, so you can explore them without real data. Nothing is saved in that mode.

## Firestore layout and rules

```
families/{familyId}/activity/{recordId}   Play creates (own uid); identical re-writes allowed; owner may delete
families/{familyId}/notes/{noteId}        Companion (author "companion") or owner (author "insights") create; author/owner delete
families/{familyId}/gifts/{giftId}        Companion/owner create (status "sent"); Play may only mark opened
families/{familyId}/sharing/state         Play writes {v,on,at,uid}
```

Readers are the owner and active Companion members. Play reads only gifts and its own sharing state. Every shape is validated in the rules and covered by `security-tests/sharing.test.mjs` (`npm run test:rules`).

**After pulling this version, paste `firebase/firestore.rules` into Firebase Console → Firestore → Rules and Publish.** Without the new rules, Play's uploads are refused, Companion and Insights say that shared activity couldn't be loaded, and local play carries on unaffected.
