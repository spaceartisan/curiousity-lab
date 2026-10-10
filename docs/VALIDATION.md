# v0.1.0 validation

## Executed in the implementation environment

- Game-engine tests across 72 seeded Sudoku configurations (4/6/9 grids; Relaxed/Classic): deterministic reconstruction, unique solution, naked-single solvability, candidates and completion.
- Curated word grouping/search validity and straight-line selection paths.
- Active clock background, pause, and idle exclusions.
- Role-isolated IndexedDB persistence and latest-write ordering.
- Component interaction tests: save/reopen, seven unrestricted new attempts, optional history withdrawal, notebook stage skipping/save/revisit, word grouping, and symbolic melody saving without sound.
- Strict TypeScript compilation and production multi-page build.
- Structural validation of role-specific manifests/scopes/identities, static-only precache lists, no cross-role HTML caching, and image provenance.

18 local tests passed; strict TypeScript, production build, PWA/provenance validation, and production dependency audit passed (0 known production dependency vulnerabilities). Six browser smoke tests are registered for CI. No real family data is used.

## Run by GitHub Actions after the single source push

Chromium desktop and phone-sized browser smoke tests, reload persistence, offline image availability, direct Companion/Insights startup, screenshot capture, and horizontal-clipping check. These tests are configured; their result must be checked in Actions before treating them as passed.

## Not yet verified

Local visual/browser QA was unavailable in the implementation environment. CI screenshots are evidence for review, not a completed human visual review. Real iPhone/Android sound, actual multiple home-screen installs, VoiceOver, 200% zoom, browser crash/low-storage recovery, Firefox/Safari behavior, and independent microscopy specialist review are pending. No Firebase integration, emulator validation, encrypted automatic backup, or family production launch has been performed.
