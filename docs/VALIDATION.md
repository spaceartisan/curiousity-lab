# v0.10.0 validation

Locally: 100 unit/component tests passed, including nine new collection cases for immutable search/filter/order, explicit last-reopen/future-time handling, legacy and malformed timestamp validation, dedicated notebook navigation/reset, missing-source and search-empty preservation, original saved-date/ID retention on revisit, pagination and canceled/confirmed single-entry removal, no-autoplay/live volume/Stop behavior, and schema-v1 backup metadata round-trip. Thirteen archive/remote cases passed with the age-only test skipped locally. TypeScript, build and scoped PWA/provenance validation passed.

CI gates deployment on 100 unit/component tests, fourteen archive/remote tests with age, twenty-two Firestore security cases plus the encrypted emulator recovery drill, and thirty-eight desktop/phone browser scenarios. The new scenario imports a clearly fictional legacy notebook backup through actual restore preview, then tests direct notebook navigation, offline cached previews, pagination, unavailable-source removal, search/order, original note/view restoration, last-reopened persistence, history-off exclusion and 320-pixel/200% text layouts for notebook and melody views. Check this commit's workflow result for actual completion.

Last-viewed metadata records an explicit local notebook reopen, never cognitive ability, emotional response or inferred microscope examination. Search/filter choices are not saved or uploaded. No private fixture or production backup/permission change is used. Chromium checks do not verify real-device audio quality, VoiceOver, independent scientific/content review or the remaining full-document launch gates.

Browser review first exposed an exact-label selector mismatch; ordering now has an explicit accessible name. The next run passed all 175 checks, but visual review found excessive card padding at doubled text size. Notebook cards and their buttons now limit horizontal padding by viewport width; the browser scenario also measures whether complete heading and button words fit their available text width. Final deployment requires that follow-up workflow to pass.

---

# v0.9.0 validation

Locally: 91 unit/component tests passed, including eight new Connections cases covering all eight packs' disjoint four-word groups and exact matching, original board/ID preservation, malformed restore rejection, deterministic shuffle/selection preservation, three progressive hint levels and undo metrics, mixed/fifth-word/Escape behavior, completion/replay IDs and content versions, eight-board cycling, legacy remount and history-off exclusion. Thirteen archive/remote cases passed with the age-only test skipped locally. TypeScript, production build and scoped PWA/provenance validation passed.

CI gates deployment on 91 unit/component tests, fourteen archive/remote tests with age, twenty-two Firestore security cases plus the encrypted emulator recovery drill, and thirty-six desktop/phone browser scenarios. The new scenario covers offline hint/undo, selection and shuffled-order reload, Enter/Escape, all eight packs, 320-pixel/200% text and 48-pixel word targets, duplicate-free completed attempts and same-board replay. The initial browser suite passed, but screenshot review found overly narrow word columns at doubled text size. The grid now collapses according to word width; the final browser scenario verifies one-column reflow at 320 pixels/200% text. Check this commit's workflow result for actual completion.

Hints count deliberate help requests, not mistakes; a mixed grouping records no penalty. Undo is available before completion; completed boards offer fresh replay rather than changing a filed session. Original two boards retain `starter-1` metadata. No family activity upload or clinical inference is added. Independent language/ambiguity review and real phone/VoiceOver checks remain; content is original authored material rather than copied daily puzzles.

---

# v0.8.0 validation

Locally: 83 unit/component tests passed, including eight new laboratory cases for authored source mapping and mode/ID separation, legacy save identity, bounded malformed restore rejection, independent per-slide notes/views, skipping every stage/blank notebook saving, credited comparison, seven separate repeat attempts, reload continuity and correct notebook-revisit IDs (including legacy second-slide entries). Thirteen archive/remote cases passed; the age-only case was skipped locally. TypeScript, production build and scoped PWA/provenance validation passed.

CI gates deployment on 83 unit/component tests, fourteen archive/remote tests with age, twenty-two Firestore security cases plus the encrypted emulator recovery drill, and thirty-four desktop/phone browser scenarios. The new scenario exercises the fictional card offline, skipped stages, keyboard zoom/pan, separate notes across switches and offline reload, cached comparison images/credits, notebook revisit, seven repeats and 320-pixel/200% text layouts. The initial browser run caught an overflowing stage label at 320 pixels with doubled text in desktop Chromium; workbench controls now wrap within their container. A second run exposed the external activity heading's unbroken word, so shared activity headings now shrink and wrap as well. Check the current commit's workflow result for actual completion.

No new image or scientific assertion is introduced. The two existing images retain their provenance and pending independent specialist review; they are explicitly separate sources, not fields from one sample or equivalent magnification. New stories are original fictional framing. No real family data, tap trace, diagnostic score or activity upload is used. Real phone/VoiceOver behavior, full image collection, dedicated notebook continuity, cloud/reporting and production recovery gates remain unfinished.

---

# v0.7.0 validation

Locally: 75 unit/component tests passed, including eleven new music/audio cases for content bounds/answer variation, relative rhythm feedback, legacy save validation, preserved piano recordings, distinct rhythm replay IDs, all four phrases, view changes after completion, deliberate sound activation, rejected audio, timer cleanup/reduced motion, nonuniform audio scheduling, live volume changes/zero and cancellation during audio unlock. Thirteen archive/remote cases passed with the age-only test skipped locally. TypeScript, production build and PWA validation passed.

CI gates deployment on 75 unit/component tests, fourteen archive/remote tests with age installed, twenty-two Firestore security cases plus the encrypted emulator recovery drill, and thirty-two desktop/phone browser scenarios. Two new scenarios cover offline rhythm resume, same-pattern replay, candidate selection, melody retention, 320-pixel/200% text layouts, and actual Chromium audio-context/oscillator instrumentation for no autoplay and Stop/Sound-off cancellation. Instrumentation is test-only; production has no test identity or audio toggle. Check this commit's workflow result for actual completion.

Browser audio scheduling is not proof of audible quality or real iPhone/Android compatibility. No microphone, recording asset or real family record is used. Raw tap timestamps remain in component memory only; resumed partial rhythms get neutral feedback when a full local timing trace is unavailable. Completed legacy sessions are untouched. Final modality/tempo/device context for longitudinal comparisons remains reporting work; no music performance trend or clinical inference is presented.

---

# v0.6.0 validation

Locally: 64 unit/component tests passed, including all four boards' dimensions and unique word paths, malformed save rejection, legacy garden resume, reverse/vertical selection, keyboard cancellation, real hints, offline-history exclusion and separate replay IDs/attempt metadata. Thirteen archive/remote tests passed with the age-only case explicitly skipped locally. TypeScript, build and PWA checks passed.

CI gates deployment on all 64 unit/component tests, 14 archive/remote tests with age installed, 22 Firestore security scenarios plus the encrypted emulator recovery drill, and 28 browser scenarios. The new desktop/phone scenario covers keyboard word selection, found-letter persistence after an offline reload, same-board replay, new-board content, 320-pixel layout with 200% text, and at-least-48-pixel letter targets. Screenshots show synthetic local gameplay; check this commit's workflow result for completion.

Real phone/tablet touch/VoiceOver behavior has not been verified by the agent. The board scrolls horizontally when enlarged; the page should not. No production backup, credential/IAM operation or activity upload was performed in this pass.

---

# v0.5.0 validation

Backup automation follow-up: six additional Node tests cover private destination restrictions, API host/redirect boundaries, twelve weekly/twelve monthly retention, missing/stale/future or altered audits, checksum-gated publication, and deletion ordering. Local archive suite: thirteen passed and the age-only test skipped; existing 56 unit/component tests and build/PWA checks passed. Google setup script passed Bash syntax checking but has not been executed against production. The opt-in weekly workflow is not evidence of an actual backup. Review this commit's CI result for encryption/emulator/browser completion.

Locally: 56 unit/component tests passed, including durable pre-restore retention, role isolation, preview/cancellation, undo, quota failure, history erasure and restore-versus-sharing isolation. Seven archive tests passed; one age encryption test was explicitly skipped because age is not installed locally. Strict TypeScript, production build and PWA checks passed. Local Java is 17, so emulator verification runs in CI with Java 21.

CI gates deployment on 56 unit tests, all eight archive tests with encryption enabled, 22 Firestore security scenarios plus the actual encrypted synthetic emulator recovery drill, and 26 Chromium desktop/phone scenarios. New browser scenarios exercise JSON preview, cancel, persistent undo, full deletion and malformed/wrong-app rejection. Review the current commit's workflow result for actual completion. Recovery screenshots use fictional data only.

The monthly synthetic workflow has no real database credentials, archive destination or production decryption key. Its schedule is configured, not evidence of a monthly run having occurred. Real automatic weekly backup remains unconfigured; no private activity permissions were opened and no real export or billing change was made. The archive's two-pass comparison is not a transactional snapshot. See the recovery runbook for launch gates and scope.

---

# v0.4.0 validation

48 unit/component tests passed locally, including ten new preparation cases for account isolation, historical selection, idempotent retries, recipient minimization, deletion and approval loss. Strict TypeScript, production build and static PWA validation passed.

CI gates deployment on all unit checks, 22 Firestore emulator scenarios and 22 desktop/phone browser scenarios. New browser cases use a synthetic transport supplied solely by Playwright interception; production has no test identity switch. They cover connected home states and local preparation persistence/deletion. Screenshots with `synthetic` in their names contain fictional test data, not live family records. Check the current commit's workflow for deployment and browser results.

The owner reports all three devices are connected. This release requires no new Firebase rules: every remote activity read/write remains denied. Local preparation is optional and never authorizes a future upload. Existing history requires explicit individual selection. Automatic backup, decryption/restore, private uploads and dashboards remain launch gates. Preparation records are separate from the guest JSON export; that export retains its schema-v1 format and does not transfer account choices or prepared copies. Activity recorded while approval is unavailable stays local and can be selected explicitly later.

---

# v0.3.0 validation

## Current checks

- 38 Vitest tests passed locally: existing games/local saves; configuration and role boundaries; fresh-server grant checks; rejection of queued snapshots after account switching or revocation; anonymous parent approval; 128-bit code generation/normalization/hashing; code-only UI and safe retry; owner invitation/device controls; persistent anonymous setup; atomic owner and parent writes; wrong-role and malformed-code rejection.
- Strict TypeScript and production multi-entry build passed. Static-only PWA caches and role identities remain unchanged.
- The Firestore emulator suite contains 22 positive/negative scenarios, including owner bootstrap isolation, invitation expiry/cancellation/replay, concurrent claims, immutable family/role/subject assignments, atomic revocation and disabled-owner invitations. Private activity remains denied.
- CI is configured to run 14 Chromium desktop/phone scenarios before deployment, including invitation links, URL-fragment removal, visible code fields, role-specific sign-in and responsive screenshots. Inspect the current commit’s workflow result for browser/deployment completion. Local Chromium launch remains blocked by the environment’s Unix-socket restriction.

## Production boundaries

No production Firebase rule deployment, anonymous sign-in or real invitation redemption was performed by the agent. The owner reports Google Auth and the authorized domain are configured; Anonymous Auth and the v0.3.0 rules must also be enabled/published. Real device Auth persistence, installed-app/browser storage sharing, clipboard behavior and recovery still require device checks.

This release implements pairing, not remote activity sharing. Existing schema-v1 guest saves remain local and are never automatically merged. Consent, account-bound outbox, summaries, backup/restore and device accessibility/audio checks remain future gates.

---

The sections below record historical validation and permissions for older releases.

# v0.2.0 validation

## Executed locally

- 27 Vitest tests: existing games, guest saves, consent/history behavior, role separation, configuration validation, server-confirmed membership, wrong-role and revoked accounts, account switching, and explicit trusted-device login persistence.
- Strict TypeScript compilation, production multi-entry build, stable manifests and static-only offline cache/provenance checks.
- 11 Firestore emulator security scenarios: anonymous/unverified denial; own approval reads; no directory/family/member listing; own membership scope; cross-family denial; revocation; no short-code authority; no browser self-grants, tenant creation or role changes; all private activity, consent and summary reads/writes remain closed.
- Production dependency audit: 0 known vulnerabilities after updating the transitive gRPC dependency through an explicit override. This package affects Node-side Firestore dependencies; browser SDK uses its web transport.
- Provisioning CLI syntax checked. No real provisioning, service-account operation or Firebase production write was performed.

## Browser and deployment gate

Eight Chromium desktop/phone scenarios cover original offline/resume/role behavior plus dark Settings, optional connection panel, selected-tab text/background colors, and screenshots. CI must pass these before deployment. Local Chromium startup is blocked by the execution environment's Unix-socket restriction, so local screenshots cannot certify browser behavior.

## Release boundary

This is a connection/approval pilot, not the completed family sync release. Existing schema-v1 guest saves are preserved. No guest record is automatically enrolled or uploaded. Firestore uses memory-only caching. Per-role Firebase Auth app names separate role login keys; same-origin browser storage is still shared infrastructure.

Real Google sign-in/provider/authorized-domain verification awaits the dedicated Firebase configuration. Consent, account-bound outbox and restore, separately authorized Companion summaries, actual private sync, automatic encrypted independent backup and tested recovery, real iPhone/Android audio and three home-screen installs, VoiceOver and full accessibility review, crash/quota recovery, and specialist microscopy review remain unverified or unimplemented.

## Prior evidence

v0.1.0: 18 local tests and six Chromium CI tests passed in run 38071544901. Its screenshot review found selected-tab contrast and skip-link capture issues; both corrections are included in v0.2.0.

## v0.2.1 configuration follow-up

The owner-provided public Firebase project configuration is now the default. Configuration resolution has a regression for the default project, blank CI variable, explicit override, and local-only mode. No Analytics, Storage or messaging service is initialized. Production Google sign-in and access approval still require provider/domain settings and trusted grants.

v0.2.0 CI completed successfully (run 38073656890): all 27 local tests, 11 emulator scenarios and eight browser tests passed; deployment succeeded. Desktop Settings and phone Music screenshots were reviewed.
