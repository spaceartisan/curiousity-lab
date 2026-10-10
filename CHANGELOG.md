# v0.5.0

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
