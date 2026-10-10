# Backup and recovery · v0.5.0

## What works now

In each app's Settings, choosing a JSON backup opens a review of local progress, creations and recorded activities. Nothing changes until **Restore this backup** is pressed. Before replacement, the app must successfully save a recovery copy of the current local state. A failure to save that copy blocks replacement. The three newest pre-restore copies can be reviewed and restored to undo a replacement. They persist across reloads and remain separated by app role.

Schema-v1 JSON backups retain their existing format. Sharing choices, account grants and prepared records are not exported or imported. Imported or restored activity never enters automatic sharing preparation; it requires individual historical selection. Clearing activity history also removes history from recovery copies. Removing all local data removes that app's recovery copies. A downloaded file remains yours to delete separately.

These are device-local undo copies, not independent backups. They cannot survive a lost device or cleared browser storage. Download JSON to a separate location if you want a portable copy.

## Independent database archive tooling

The owner-operated Node scripts are outside the browser bundle and use privileged, read-only Firestore access. No production export has been run by the agent, no production credentials have been collected, and no private backup destination has been configured.

Implemented:

- Recursive enumeration of all default-database collections, including subcollections underneath absent parent documents.
- A two-pass comparison of complete document inventories. A detected change aborts the export; no partial archive is accepted. At most 10,000 documents and 20,000 document fetches are supported per export. Collection enumeration also uses API quota; monitor actual usage.
- Typed preservation of maps, arrays, strings, booleans, nulls, numeric special values, byte buffers, timestamp seconds/nanoseconds without conversion through JavaScript Date, geographic points and same-project/default-database document references. Unsupported values and foreign-project references fail closed.
- Canonical JSON, collection counts, record schema-version inventory, application/content versions, database/project identifiers, manifest hash and record checksum. Account-directory entries must agree with family membership and family roots. This checks archive structure and selected cross-references; it does not prove every future application schema or migration is supported.
- Gzip compression and age X25519 public-recipient encryption entirely in process. Only ciphertext is written, outside the source repository, with restrictive file permissions and no overwrite. Failure messages do not print document data, identifiers or SDK error bodies.
- Decrypt/validate/dry-run/import tools restricted to a **local demo Firestore emulator**. The destination must be empty; existing records are never overwritten. Restored inventory and representative typed records are checked.

A matching two-pass inventory is a consistency check, not a transactional point-in-time snapshot. A production launch must establish an export watermark or controlled write-free window and test actual-source completeness. Firebase Auth accounts, IAM, provider settings and security rules are not included in the document archive; they need their own recovery plan. The code repository preserves the static game/content assets separately.

### Synthetic recovery drill

Pages deployment is gated on archive corruption tests, wrong-key/damaged-ciphertext rejection, and an actual encrypted synthetic database export/decrypt/restore against the emulator. Fictional fixtures include grants, a session, absent parents, timestamps, byte buffers and a document reference.

`.github/workflows/backup-drill.yml` repeats these tests monthly and supports a manual run. It uses read-only repository permissions and pinned actions. Every decryption identity in this drill is generated for fictional fixtures inside the runner and deleted afterwards. **It does not back up the family's database and never has the production decryption key.** Check workflow results; the presence of YAML alone proves nothing.

Local `npm run check` runs archive-format tests. Encryption tests require `age` and `age-keygen`; locally they report a skip if absent. CI must install age and refuses to skip encryption verification. `npm run test:rules` now includes the encrypted emulator drill, so both age and Java 21 are required.

## Trusted manual runbook

Do not send an offline decryption identity, service-account JSON or access token into a chat or the public repository. Generate and retain the real age identity on a trusted owner machine, with a second offline recovery copy. Only the corresponding public recipient is used by an export runner. Follow the [age installation and usage guide](https://github.com/FiloSottile/age).

The export CLI uses Application Default Credentials. Its Google identity must have narrowly scoped read access to the dedicated project; never use a project-owner credential as the normal backup identity. Prefer short-lived OIDC/WIF credentials when the automatic job is connected.

```sh
npm run backup:export -- curiousity-lab PUBLIC_AGE_RECIPIENT /absolute/private-location/snapshot.age
```

The output must be outside this repository and must not already exist. The script does not upload it or claim recovery has passed. Archive format, keys, credentials and dataset limits must be checked in a secure owner environment before relying on a real snapshot.

For recovery, use a trusted machine, a local emulator, the offline identity and an isolated directory. This CLI keeps decrypted JSON in memory; it never writes it to a plaintext file. First validate/dry-run, then apply to an empty emulator:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run backup:restore -- /private/snapshot.age /offline/identity.agekey demo-curiosity-recovery
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 npm run backup:restore -- /private/snapshot.age /offline/identity.agekey demo-curiosity-recovery --apply
```

Compare collection counts, membership relationships, representative activity, content versions and document references. References are rebound to the isolated destination's same document paths. A partial emulator failure is not a successful recovery: clear the isolated emulator and restart. Do not repoint the family app or import to production without a separately reviewed recovery procedure.

## Remaining launch gate

Automatic weekly **real** backups are not enabled. Connecting them still requires:

1. A dedicated private backup repository or explicitly approved equivalent, with constrained write credentials that cannot change application source.
2. Verified Spark-compatible Google read access, preferably OIDC/WIF. Do not enable billing or substitute a long-lived key without the owner's decision. Firebase's managed export service requires billing; this tooling uses document reads instead. See [Firebase managed export requirements](https://firebase.google.com/docs/firestore/manage-data/export-import).
3. The offline-held real age key and its public recipient, with controlled verification of a real encrypted archive.
4. Twelve weekly plus twelve monthly archives, a deletion inventory, successful timestamp/hash audit and failure/staleness notification after eight days.
5. A tested consistency policy and account-recovery procedure, including re-pairing a lost anonymous parent identity.

Private activity uploads remain disabled until a verified recent independent archive exists and a controlled real-data recovery has succeeded. Local recovery and synthetic drills are progress toward that gate, not a claim that the gate is complete.
