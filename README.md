# Curiosity Lab

A calm, adult-respectful collection of puzzles, music, and microscopy. One React / TypeScript / Vite codebase builds three independently scoped app entries:

- **[Play](https://spaceartisan.github.io/curiousity-lab/play/)** — local puzzles and saved creations.
- **[Companion](https://spaceartisan.github.io/curiousity-lab/companion/)** — companion overview; code-only family connection; activity sharing pending.
- **[Insights](https://spaceartisan.github.io/curiousity-lab/insights/)** — context-preserving local export review; code-only family connection; activity sharing pending.

These URLs become live when the Pages workflow deploys successfully. The repository URL deliberately retains its existing spelling, `curiousity-lab`; product branding is **Curiosity Lab**.

## Current release · v0.8.0

This is a **local prototype**, implementing Phase 0 and the first playable slices of Phase 1. Owner Google sign-in and code-only parent invitations are available after enabling Anonymous Auth and publishing the included Firebase rules. Activity sharing remains disabled. No personal records, emails, service credentials, or private design document are published here.

Play includes:

- Reproducible, unique-solution Sudoku in 9×9, 6×6, and 4×4 grids, pencil notes, undo, hints, optional checking, and saved progress. Both current tiers are verified solvable with naked singles; Classic has fewer givens. These are provisional game difficulty tiers, not clinical measures.
- Two curated Word Connections packs and four versioned Word Search boards: Quiet garden, Kitchen table, At the workbench and By the water. Found letters stay marked, hints locate an actual first letter, and keyboard navigation, same-board replay and new-board cycling are available. Original garden saves retain their board and progress.
- Free piano with symbolic melody saving, four original phrase exercises, four melody comparisons with alternating answer positions, and three rhythm patterns. Staff, note-pattern and by-ear views, comfortable/slower playback, in-game sound/volume controls and separate new/repeated attempts are available. Rhythm feedback follows relative spacing at the player's pace with adjustable flexibility and no failure score; raw tap times are never stored. Piano recordings survive mode changes. Web Audio sound is off by default and starts only after a gesture.
- A laboratory workbench with two original fictional specimen cards, direct microscope exploration, skippable stages and optional side-by-side comparison of the two licensed CDC source images. Notes, observations and digital view settings are kept separately for each slide across switching and reload. Notebook saves are filed once per attempt, with unlimited separate repeat explorations and correct source IDs on revisit. Existing notebook entries and drafts remain valid. Hematology, the larger image pack and independent specialist review are pending.
- My Creations, light/dark themes, larger text, JSON backup/restore with a review step and three durable undo copies, CSV session export, and explicit deletion controls.
- IndexedDB progress saves separated by app role. Optional activity history starts off; it stays on this device. With it off, active-time/hint/undo summaries are not accumulated. Game state necessary for save/resume is still stored.

Companion and Insights open directly to their own views. Fictional examples are clearly labeled and only appear when requested. Neither app reads Play's browser database. Insights can explicitly inspect a selected Play backup **in memory**, without uploading or persisting it.

## Firebase account setup

You can create the dedicated Spark/Firestore project now. Follow [the Firebase setup guide](docs/FIREBASE_SETUP.md) for Google sign-in, the public web configuration, security rules, and owner-generated invitations. The registered `curiousity-lab` public web project is now the default. No repository variable is required. An optional `FIREBASE_WEB_CONFIG` variable overrides it; set it to `local-only` to disable account connections. Parents do not need to sign in for local play.

## Develop

Node 22.12+ (CI uses Node 24).

```sh
npm ci
npm run dev
```

Open `/curiousity-lab/play/`, `/curiousity-lab/companion/`, or `/curiousity-lab/insights/` on the Vite server. For the exact production/offline build:

```sh
npm run check
npm run preview
```

The build base is `/curiousity-lab/`. If the repository is renamed or moved to a custom domain, update `vite.config.ts`, `scripts/build-pwa.mjs`, documentation and validation expectations together. Do not change an installed app's identity casually.

## Checks and deployment

`npm run test:rules` runs 22 emulator security scenarios plus an encrypted synthetic backup recovery drill (Java 21+ and age required). CI gates deployment on these tests as well as browser checks. `npm run check` runs the game, persistence, consent, and component tests, strict TypeScript, the production build, and structural PWA/provenance validation. The GitHub workflow then runs Chromium desktop/phone smoke tests (including offline microscopy), captures screenshots in its **browser-evidence** artifact, and deploys only when validation passes.

**One-time repository setup:** In GitHub, open **Settings → Pages → Source → GitHub Actions**. If the first deploy fails because Pages is disabled, enable this setting and rerun the failed deploy job; no source push is needed.

For browser tests locally (requires Playwright's browser installation): `npx playwright install chromium`, then `npm run build && npm run test:e2e`. Screenshots and traces are ignored by Git and retained in CI artifacts. See [validation status](docs/VALIDATION.md) for what has actually been run.

## Privacy and release boundaries

This app supports enjoyable exploration; it is not a diagnostic instrument or disease score. No remote activity collection, analytics tracking, camera, microphone, passive sensing, or public leaderboard is included. Public visitors are local-only.

The included Firestore rules support owner-only family setup, unpredictable single-use invitation codes, hidden anonymous parent identities, atomic membership creation and owner device revocation. Parents need no email or password. Unpaired visitors cannot enumerate families or read/write activity. Sign-in/pairing never uploads existing guest saves. Named Firebase apps separate role login keys, and Firestore uses memory-only caching. Play now offers optional, account-bound local preparation choices with separate Insights details and coarse Companion summaries. Older history requires individual selection. Only new recorded sessions while the same account is approved are eligible for future preparation; loading, reconnecting and switching accounts do not enroll existing history. No activity is uploaded. A later release must obtain fresh upload consent after automatic independent backup and tested recovery are ready. Same-origin apps may share browser infrastructure; role scopes alone do not guarantee independent operating-system installations.

**Do not treat v0.8.0 as the connected family-production launch.** Private sync, family dashboards, automatic independent encrypted backups with tested recovery, full accessibility review, and actual-device installations/audio checks remain launch gates. See [implementation roadmap](docs/ROADMAP.md).

See [backup and recovery](docs/BACKUP_RECOVERY.md) for device-local undo, the encrypted archive tools, synthetic monthly drills and the remaining real-backup setup. No production export, new credential or billing change is included.

The opt-in weekly private-release workflow, retention and daily freshness checks are prepared. Follow the [owner-only connection guide](docs/BACKUP_SETUP.md) to activate them; parents have no backup setup steps.

## Image credits

The first pack uses individual public-domain CDC PHIL records, credited in the viewer and [image provenance](public/media/provenance.json). The source images are bundled, not hotlinked. CDC does not endorse this app.

- PHIL 26402: CDC / Dr. Libero Ajello, unidentified fungal structures.
- PHIL 10041: CDC / Segrid McAllister; photograph Janice Haney Carr, digitally colorized bacterial SEM.

Labels were cross-checked with the source captions and images; independent subject-matter review is pending. No identification quiz is enabled. Digital zoom adds no new optical detail. Source captions describe the source image, not a real patient or local specimen.
