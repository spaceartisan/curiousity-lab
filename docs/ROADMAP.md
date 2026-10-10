# Implementation roadmap

## v0.1.0 — Local first slice

Three role-specific entries, manifests, PNG icons, non-overlapping service workers, responsive interface, playable Sudoku/word/music/laboratory activities, durable local saves, optional history, source-preserving exports, and test/deploy pipeline.

This is intentionally the start of the staged design. Demo dashboards are not connected family summaries. Images are a two-specimen starter, not the required final 8–12 specimen collection. No cloud security completion or production readiness is implied.

## Next: finish Phase 1 and usability review

- Review screenshots and use the app on actual phone/tablet devices; verify 200% text/zoom, VoiceOver/keyboard paths, touch targets, separate home-screen installs, and Web Audio on iOS/Android.
- Expand and independently review the image pack, with per-image license/provenance and optional hematology images. Refine workbench interactions with player feedback.
- Add stronger reviewed music content, real rhythm replay/new-attempt semantics, improved score/ear presentation and per-game help. Word-search variations and keyboard/replay paths were added in v0.6.0; actual-device usability review remains.
- Calibrate Sudoku solving-technique tiers beyond naked singles before offering advanced difficulty. Preserve deterministic content versions and migrations.
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

## Phase 2b — Optional approved family sync

Dedicated user-owned Firebase project, owner Google Auth and invitation-approved anonymous parent identities, subject grants, consent, offline outbox, idempotent reconciliation, account-cache purge, and positive/negative emulator tests. Unpaired visitors cannot read/write private activity. Never silently enroll guest records into another person's data. Companion summaries must be separately authorized rather than hidden raw-event reads.

## Phase 3 — Context-aware reporting

Versioned records, attempt/replay labels, comparable-task filters, missingness and uncertainty, explicit assistance/device context, raw explorer, and consented companion highlights. No disease score or automated decline alarms.

## Phase 4 — Production launch gates

Independent encrypted automatic backup, tested decryption and restore, account recovery, revocation, deletion, image/accessibility review, device installation/audio testing, and explicit family agreement. Keep paid services off until separately authorized.
