# v0.11.0

- Added an optional 9×9 Hidden singles collection: three original frozen boards, deterministic variations, unique solutions and a documented solving-technique ceiling. Every board requires hidden singles and can finish without guessing.
- Preserved the original 4×4/6×6/9×9 Relaxed and Classic generator outputs, save identities and historical content versions. New challenges use `sudoku-hidden-singles-1` with canonical restore validation.
- Added Show a step without filling; Hint explains a real deduction or truthfully corrects an existing mismatched entry. Assistance stays local and records no activity with history off.
- Number placements prune peer pencil notes; Undo restores cells and notes together. Explanations add no undo move. Added unlimited same-board replay with separate immutable attempt records.
- Added larger selected-square context, explicit selector names, row-edge keyboard focus and Home/End navigation. Number trays and action buttons reflow with enlarged text; 9×9 digits stay within small cells.

# v0.10.0

- Added dedicated Lab Notebook/Melodies collection views with local search across titles, notes, observations and known source titles, saved-date ordering and bounded twelve-entry pages.
- Added notebook image previews with attribution links, preserved multiline notes and unavailable-source entries. Removal targets one entry after the existing in-app confirmation; pagination clamps after deletion.
- Added a direct laboratory notebook shortcut and truthful continuity based only on explicit notebook reopens. Original saved dates, IDs and notes remain unchanged; old schema-v1 entries need no migration.
- Added optional, validated last-viewed metadata to local notebook entries and JSON backups. Reopening does not enable activity collection or upload anything.
- Added inline melody sound/volume/Stop controls; toggles and browsing never autoplay, and leaving the collection stops audio.

# v0.9.0

- Expanded Word Connections from two to eight original themed packs; retained the original boards, legacy puzzle IDs and historical content versions.
- Added progressive category/one-word/four-word help, undo of the last solved group during play, optional deterministic shuffle, selected-word summary, keyboard Escape and same-board replay.
- Completed attempts are filed once and remain finished; replay creates another ID/attempt, while shuffling keeps selection and the current attempt. There are no lives, penalties or timed limits.
- Strengthened restore validation for actual group titles, remaining words, unique selections/solved groups and bounded presentation order. New packs use stable authored IDs and `connections-2` content metadata.

# v0.8.0

- Added two authored, versioned fictional laboratory specimen cards, direct microscope exploration and optional, skippable specimen/observation/comparison stages. Stories explicitly distinguish their fictional sample from the real CDC teaching image.
- Added a responsive comparison of separate credited source images; no claim of matching fields, calibrated magnification, identification or diagnosis.
- Preserved separate notes, observations and view settings when switching slides and reloading. Added “Not sure”, repeat exploration and one notebook save per finished attempt; changes to presentation do not create new attempts.
- Fixed notebook revisit IDs to match the actual asset, preserved legacy IDs/content versions, and attached workflow/free-exploration context to new notebook entries and session modes. Existing exports and restores remain schema-v1 compatible.
- The collection remains two images. Hematology, independent specialist review, family activity uploads/reporting and real-device launch checks are unfinished.

# v0.7.0

- Expanded Music Studio to four original phrase exercises, four melody comparisons and three rhythm patterns with stable puzzle IDs and content versions.
- Added staff/note-pattern/by-ear views, adjustable playback pace, in-game sound and live playback volume controls, candidate previews, actual-position phrase hints and explicit repeat/new-exercise controls.
- Fixed rhythm replay to create a new attempt; persisted beat-count progress without saving raw tap times. Relative-spacing feedback has gentle/extra-flexible options and no score or failure outcome.
- Preserved legacy music saves and piano recordings across mode changes. Display/pace changes do not restart a completed attempt. Added audio-unlock cancellation, zero-volume silence, reduced-motion visual playback and phone-size keyboard targets.

# v0.6.0

- Added three curated offline Word Search boards alongside the unchanged original garden board, with distinct puzzle IDs and content versions.
- Added durable found-letter markings, actual-position hints, arrow/Home/End keyboard navigation, selection cancellation, separate same-puzzle replay and new-puzzle cycling.
- Kept original garden save data and schema-v1 exports compatible; validated board-bound unique found words. Replay preserves separate attempt IDs and history-off behavior.
- Kept 48-pixel letter targets in a contained scrollable board and made headers/word lists wrap with larger text.

# v0.5.0

- Backup follow-up: prepared opt-in weekly encrypted private-release archives, twelve weekly/twelve monthly retention, checksum-gated publication, deletion audit and daily eight-day freshness failures. Added owner-only setup and narrowly restricted Google federation script. No production setup or real backup was performed.

- Added local JSON restore previews and durable copies of the three newest pre-restore saves, with undo, quota-failure handling and deletion coverage.
- Kept restored history out of automatic sharing preparation and preserved schema-v1 exports.
- Added typed canonical Firestore archive tooling, authenticated age encryption, checksum/count/grant validation and emulator-only recovery.
- Added an encrypted synthetic recovery drill to the deployment gate and a monthly synthetic workflow. Real backups and private uploads remain disabled.

# v0.4.0

- Added account-bound local sharing preparation with separate Insights and Companion payloads, explicit historical selection, optional future records and deletion controls.
- Connected home-screen status to the role-specific family connection.

# v0.3.0

- Added owner Google setup, code-only anonymous parent pairing, expiring single-use invitations and device revocation.
- Fixed Companion and Insights header line breaks.

# v0.2.1

- Connected the owner-provided public `curiousity-lab` web configuration by default across all three apps.
- Kept Analytics, Storage, messaging and activity uploads disabled.
- Preserved optional configuration overrides and added explicit `local-only` mode.

# v0.2.0

- Corrected selected-tab contrast in light and dark themes and hidden skip-link capture positioning.
- Added optional Google account setup with per-role login keys, trusted-device persistence choice, server-confirmed approval, revocation and wrong-role handling.
- Added account-directory/member read rules; all private activity reads and browser writes remain denied.
- Added trusted provisioning CLI, Firebase setup guide, optional CI web config, and emulator security gate.
- Preserved v0.1.0 local saves and kept uploads disabled.

# Changelog

## 0.1.0 — 2026-10-10

First local prototype: three dedicated PWA entries with their own manifests, icons, and service-worker scopes. Added Sudoku, Word Connections, Word Search, synthesized music and melody saving, a two-image offline microscopy workbench and Lab Notebook, local progress/creations, optional activity summaries, light/dark themes, text-size controls, backup/restore and CSV export. Companion and Insights have honest disconnected states and opt-in fictional examples. Insights can review a selected Play backup in memory.

Added unique-solution Sudoku and interaction/persistence/privacy tests, strict build/provenance checks, production CSP, deny-all Firestore placeholder, and GitHub Pages CI with Chromium desktop/phone tests and screenshot artifacts. Cloud sync, family authorization, full content packs, actual-device review and automatic encrypted backups remain on the staged roadmap.
