# Implementation roadmap

## v0.1.0 — Local first slice

Three role-specific entries, manifests, PNG icons, non-overlapping service workers, responsive interface, playable Sudoku/word/music/laboratory activities, durable local saves, optional history, source-preserving exports, and test/deploy pipeline.

This is intentionally the start of the staged design. Demo dashboards are not connected family summaries. Images are a two-specimen starter, not the required final 8–12 specimen collection. No cloud security completion or production readiness is implied.

## Next: finish Phase 1 and usability review

- Review screenshots and use the app on actual phone/tablet devices; verify 200% text/zoom, VoiceOver/keyboard paths, touch targets, separate home-screen installs, and Web Audio on iOS/Android.
- Expand and independently review the image pack, with per-image license/provenance and optional hematology images. Optional specimen cards, direct exploration, comparison and per-slide note continuity arrived in v0.8.0; the dedicated notebook browser and explicit last-reopened continuity arrived in v0.10.0. Refine the workbench with player feedback.
- Review and grow word/music content with player feedback. Word-search variety arrived in v0.6.0; music exercise variety, real rhythm attempts, score/pattern/ear views and in-game guidance arrived in v0.7.0. Word Connections expanded to eight packs with progressive assistance, in-progress undo and same-board replay in v0.9.0. Actual-device accessibility and independent word/music-content review remain.
- Sudoku hidden-single calibration, explanatory steps and same-board replay arrived in v0.11.0. Independently review its usability and expand verified advanced techniques/preferences later; preserve deterministic content versions and migrations.
- Expand undo/skip/help consistency and make conflict/backup recovery explicit; test browser crash and storage-quota failure paths.

## v0.2.0 — Phase 2a: account connection foundation

Selected-control contrast corrected. Optional Google sign-in in Settings; per-role Firebase Auth namespaces; server-only approval checks using memory cache; trusted owner provisioning with identity/email verification; setup guide and environment-driven public config; positive/negative emulator tests. All browser activity reads/writes remain closed. No guest enrollment or data upload occurs.

## v0.3.0 — Code-only family pairing

Owner self-service Google setup; separate single-use, expiring invitations for Play and Companion; persistent hidden parent identities with no email/password prompts; atomic role/subject-bound redemption; owner device listing and revocation; dedicated connection screen for invitation links. No activity upload or guest-history merge. See the setup guide for the required Anonymous provider and production rules update. This replaces the previous parent email/provisioning flow at the owner’s request.

## v0.4.0 — Local sharing preparation and connected home states

Always-on role connection status reaches the home screens. Play has separate local preparation choices for Insights details and coarse Companion moments, personal-device storage confirmation, explicit individual historical selection and optional future records. Prepared copies are bound to project, UID, family, subject and role; session/recipient IDs deduplicate retries. Switching or reconnecting accounts never enrolls preexisting history. Disabling a recipient removes its pending copies; clearing history/local data removes preparations across previous local accounts. No upload path or new Firestore activity permissions exist. Fresh consent is required in a later upload release.

## v0.5.0 — Safe local restore and encrypted recovery drills

JSON restore previews changes and requires confirmation in the app. The previous save is kept before replacement, with the three newest undo copies retained locally. Restored history cannot enter automatic sharing preparation; local deletion includes undo copies. Privileged archive tooling recursively exports the default Firestore database, validates typed records/checksums/counts/selected grant cross-references, compresses and encrypts before writing ciphertext. Production restore is absent; recovery tooling only stages an empty local demo emulator. CI and a monthly synthetic workflow verify authenticated decryption and actual emulator recovery. Weekly encrypted private-release uploads, retention and daily staleness checks are implemented but opt-in. Owner configuration of private storage/credentials, verified notification delivery, source consistency and controlled real-source recovery remain required before uploads.

## v0.6.0 — Word-search variety and accessible replay

Four fixed, versioned boards preserve the original garden save while adding row/column and diagonal themes. Found letters remain visible after reload; hints derive from actual board paths. Roving keyboard focus supports arrows, Home/End, Enter/Space and Escape. Replay this puzzle starts a separate attempt on the same board; Another puzzle cycles themes. Letter targets remain at least 48 pixels with contained horizontal scrolling on small screens, and text wrapping is checked at 200% in CI. Family sync and real backup setup remain separate launch gates.

## v0.7.0 — Music exercise variety and truthful replay

Four original phrase exercises, four melody comparisons and three rhythm patterns replace the single-example flows while retaining free piano and old saves. In-game sound/volume, staff/pattern/ear views, slower playback and candidate previews support different ways to play. Rhythm progress survives reload; repeat/new buttons create separate attempt IDs. Ephemeral relative-spacing feedback adapts to player pace and optional extra flexibility; it produces no timing score, failure or persistent tap trace. Changing views/pace does not restart a completed attempt. Piano recordings survive switching activities. Actual iOS/Android audio, VoiceOver and independent notation/content review remain unverified. This does not complete the architecture document; laboratory expansion, private sync/reporting and production launch gates remain.

## v0.8.0 — Optional specimen-to-notebook journey

Two original fictional specimen cards frame the existing real teaching images, with explicit source/sample separation. The player can enter the microscope directly, skip/revisit any stage, compare separate full-source images with attribution, choose “Not sure” and save a blank or annotated notebook page. Per-slide notes/view settings survive switching/reload. Finished view changes do not create another attempt; explicit repeats do, without limits. Notebook revisits now bind the actual specimen ID and preserve legacy source identity. New local records distinguish workbench/free exploration and workflow content versions. The two-image starter, absent hematology, dedicated notebook continuity, independent scientific review, real device accessibility and private sync/reporting remain unfinished.

## v0.9.0 — Word Connections variety and assistance

Eight fixed, authored packs retain the first two boards and old `connections-0`/`connections-1` identities. Six new boards have stable authored IDs and content version `connections-2`. Category/one-word/four-word hints, in-progress group undo, shuffle, keyboard selection/Escape and same-board replay support different ways to play. All progress/presentation is local and offline; completed attempts remain immutable and replay starts a separate attempt. Saved data validates actual board membership and unique selections. Independent language/ambiguity review, puzzle preference feedback, full document work and device/production gates remain.

## v0.10.0 — Saved collections and notebook continuity

My Creations has dedicated notebook/melody views, local text search, saved-date ordering and twelve-entry pagination. Notebook cards preview known cached source images and preserve old notes when an image is unavailable. A laboratory shortcut opens the notebook directly. Successful explicit reopens add a validated optional last-viewed timestamp, retaining saved dates, entry IDs, original notes and legacy workflow identity. Last-reopened cues never infer examination from a mere save or future timestamp. Melody playback has deliberate sound/volume/Stop controls. Filters/search remain ephemeral UI state; no cloud data flow is added. Full image expansion, device/content review, family sync/reporting and production gates remain.

## v0.11.0 — Sudoku techniques and explanatory assistance

A voluntary 9×9 Hidden singles challenge has three original boards with deterministic variations. Unique solutions, hidden-single necessity and no-guessing completion are verified separately. Original Relaxed/Classic generators and save identities remain unchanged. Explanations select a square without filling; filling hints explain deductions or existing-entry correction. Peer pencil-note cleanup undoes with the move. Same-board replay preserves content while creating distinct attempts. Larger selected-square context and row/column selectors supplement the small grid; keyboard boundaries and enlarged text reflow improve control. Human difficulty calibration, advanced rules, actual-device accessibility and full-document sync/reporting/production work remain.

## Phase 2b — Optional approved family sync

Dedicated user-owned Firebase project, owner Google Auth and invitation-approved anonymous parent identities, subject grants, consent, offline outbox, idempotent reconciliation, account-cache purge, and positive/negative emulator tests. Unpaired visitors cannot read/write private activity. Never silently enroll guest records into another person's data. Companion summaries must be separately authorized rather than hidden raw-event reads.

## Phase 3 — Context-aware reporting

Versioned records, attempt/replay labels, comparable-task filters, missingness and uncertainty, explicit assistance/device context, raw explorer, and consented companion highlights. No disease score or automated decline alarms.

## Phase 4 — Production launch gates

Independent encrypted automatic backup, tested decryption and restore, account recovery, revocation, deletion, image/accessibility review, device installation/audio testing, and explicit family agreement. Keep paid services off until separately authorized.

## v0.12.0 — Local context review foundation

Insights reviews an explicitly selected backup in memory, separates recorded contexts and first/repeat exposure, filters UTC end dates, paginates summaries and raw records, and exports source-preserving CSV plus a versioned derived summary. Completed-session hint denominators exclude unfinished attempts; piano/laboratory exploration has no performance score. Missing history/context and correlated same-player/day records remain explicit limitations, with no trend or clinical inference. This is partial Phase 3 work: consented private cloud sync, matched presentation forms, shared reports/plots and production recovery remain unfinished.

## v0.13.0 — Consented presentation provenance

New local attempts record bounded theme/text and music presentation-setting observations only with activity history enabled. Changes survive offline resume and remain distinct from missing/partial settings; completed source sessions stay immutable. JSON/CSV, validated local Insights preparation and context-separated review retain this provenance. Clear-history also purges optional draft context from durable undo copies. The remaining normalized identity/input/pause/clock fields, reference challenges, private sync, shared reporting and production/device gates are unfinished.

## v0.14.0 — Accurate local timing boundaries

Close active intervals before idle-window extension, pause/visibility transitions, navigation, attempt changes and filing. Fractional final intervals survive fast completion; explicit pauses count only visible selected activity with history enabled. Optional timing algorithm/coverage and pause values survive schema-v1 backups, CSV and validated local Insights preparation; legacy/partial collection stays distinct in review. History clearing removes optional timing from current and recovery drafts. Hidden, idle and closed time are not inferred as pauses. Clock verification, normalized identities/input, private sync, shared reports and all production/device gates remain unfinished.

## v0.15.0 — Genuine local session plots

One explicitly selected context now has chronological source points for active time, known foreground pause or hints in completed puzzle sessions, with outcome/repeat details, keyboard selection, table alternatives, fixed full-context axes across twenty-four-point pages and a reproducible all-page JSON export. Overlapping observations remain individual records; missing pause stays unknown and exploration has no performance score. This advances Phase 3 without any trend estimate or cloud upload. Full normalized context, matched reference forms, private sync/shared reports, remaining game/content work and production/device gates remain unfinished.

## v0.16.0 — Consented game input observations

With local activity history enabled, visible unpaused game controls retain only a bounded set of touch/mouse/pen/keyboard categories. Fresh attempts capture from start; legacy and mid-attempt collection stays partial. No observed category differs from old unknown input. Context review and plots separate these categories and coverage; offline exports and validated local preparation preserve them. No key values, coordinates, continuous gestures, device fingerprint or cloud path is added. Normalized install/clock/task identity, remaining game/content work, family sync/shared reports and production/device gates remain unfinished.

## v0.17.0 — Voluntary larger Sudoku squares

The actual Sudoku grid now has an optional large-square view with contained scrolling and selected-square reveal via keyboard/row/column controls. Necessary display state survives offline resume, new puzzles and replay while preserving puzzle rules and progress. Optional presentation observations retain square-size changes and missing/partial context. This advances Phase 1 usability; advanced solving tiers/preferences, independent device/content review, normalized identity/clock/task context, private sync/shared reports and production recovery remain unfinished.

## v0.18.0 — Word Search undo and help

In-progress undo uses the existing ordered found-word list, preserving original saves and puzzle identity. Found-letter highlights derive from all remaining words, including crossing paths. Brief help explains unlimited play, actual-path hints, undo and same-board replay. Optional history counts successful undo; history-off keeps only necessary progress. Completed attempts cannot be undone. This advances the common game usability requirements; remaining game/content work, normalized identity/clock/task context, private sync/shared reports and production/device gates remain unfinished.

## v0.19.0 — Adult challenge and optional guidance

Chosen 9×9 Challenging puzzles require candidate elimination beyond singles and locked candidates alone. Three original boards have independently unique solutions, verified naked-pair necessity within this solver, and deterministic variations. Requested hints explain actual logical deductions; no explanation or answer is shown automatically. Routine Sudoku and word instructions are compact and full help stays closed. Existing difficulty choices, saves and replay identities remain. Broader demanding word/music content, player feedback and human calibration, content/device review, normalized context, private sync/shared reporting and production recovery remain unfinished.

## v0.20.0 — Chosen Word Connections wordplay

Four original Challenging boards add compound words, phrases, homophones and overlapping meanings alongside eight unchanged Classic boards. Confirmed choices start separate attempts; replay and another puzzle stay within the chosen collection. Full help stays closed, categories appear only on request or after solving, and plausible alternate groups receive honest feedback. Optional history distinguishes wordplay mode and versioned content; history-off retains necessary progress only. This advances demanding word content. Broader music/lab content, independent word and family-device review, human difficulty calibration, normalized context, private sync/shared reports and production recovery remain unfinished. The full document is not complete.

## v0.21.0 — Chosen melody matching challenge

Four original five-note Challenging comparisons retain the same contour and endpoints across both choices while changing one interior note. Separate chosen collections cycle independently, preserve original content/IDs and free-piano recordings, and retain staff, note-pattern and by-ear presentation. Optional hints identify the actual difference; longer controls help stays closed. New versioned task mode separates difficulty in local history without changing previously filed records. Broader phrase/rhythm and lab content, human calibration, independent media/device review, normalized context, private sync/shared reports and production recovery remain unfinished. The full document is not complete.
