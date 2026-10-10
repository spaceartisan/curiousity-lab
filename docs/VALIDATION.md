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
