# Owner-only automatic backup setup

Your parents have no steps here. The workflow is implemented but **off** until this one-time setup is completed. The connected GitHub tools cannot create a private repository, enter Actions secrets or configure Google IAM, so those account-owner operations remain yours. Never paste a private key or token into chat.

## 1. Prepare a private destination

Create `spaceartisan/curiosity-lab-backups` as a **private** repository with an initial README. Leave release immutability off so expired snapshots can be removed. Do not use the public app repository. The job checks privacy and refuses the source repository before uploading.

Create a fine-grained GitHub access token restricted to **only that backup repository**, with **Contents: read and write**, an expiry, and a rotation reminder. Add it to the **app repository's** Settings → Secrets and variables → Actions → Secrets as `BACKUP_REPOSITORY_TOKEN`. It cannot grant access to application source. A GitHub App installation token restricted to the backup repository can replace this credential later; SSH deploy keys cannot manage release attachments.

Archives are release attachments, never Git blobs. Twelve newest snapshots and the newest snapshot in each of twelve represented months are retained, with overlapping snapshots stored once. This means monthly coverage grows as real snapshots accumulate. Expiration deletes matching releases and their attachments after a new archive has uploaded with its server-reported ciphertext checksum verified. The new private release audit records deletion intent and completed release IDs/tags. Unrecognized releases and failed-upload drafts are left for owner review. Git tags can remain; they contain no archive data. Provider-side residual storage is outside this deletion mechanism.

## 2. Keep the recovery key offline

On a trusted owner computer, install [age](https://github.com/FiloSottile/age) and run `age-keygen -o /private/offline/curiosity.agekey`, choosing a real private location appropriate to your computer. Preserve a second offline copy. The output's `age1…` **public recipient** can go in Actions variables. The `AGE-SECRET-KEY-…` identity must stay offline; neither GitHub nor Firebase needs it. Do not generate the production identity in Cloud Shell or CI.

## 3. Connect read-only Google access

Open [Google Cloud Shell](https://shell.cloud.google.com/) using your owner Google account. Download or clone this app repository and run `bash scripts/backup/setup-google.sh`. Review the script first. It targets only `curiousity-lab`, refuses a billing-enabled project or an unreadable billing status, enables IAM/credentials/token-exchange APIs, and creates a dedicated read identity and OIDC trust. It does **not** enable billing, create service-account keys, configure paid managed exports or grant the backup identity Owner/Editor access.

The trust condition restricts the numeric GitHub repository/owner IDs, `main`, and this exact backup workflow. Existing provider conditions must match rather than being silently replaced. The script prints the two public Actions variable values. Check the dedicated account's **effective** permissions: it must have only the intended read role and federation binding, with no inherited or previously added write role. If the script fails because your Spark project cannot enable these APIs, stop and resolve that failure; do not upgrade billing or create a long-lived key as a workaround. This setup has not been executed against your project by the agent.

References: [Google federation setup](https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines), [Google auth action](https://github.com/google-github-actions/auth), [IAM pricing](https://cloud.google.com/iam/pricing). Firestore document reads still consume your project quota, including two inventory passes and collection enumeration.

## 4. Set the app repository's Actions variables

| Variable                      | Value                                            |
| ----------------------------- | ------------------------------------------------ |
| `BACKUP_REPOSITORY`           | `spaceartisan/curiosity-lab-backups`             |
| `BACKUP_AGE_RECIPIENT`        | Your public `age1…` recipient                    |
| `BACKUP_WIF_PROVIDER`         | First value printed by the setup script          |
| `BACKUP_SERVICE_ACCOUNT`      | Second value printed by the setup script         |
| `BACKUP_CONSISTENCY_APPROVED` | `two-pass-reviewed`, only after the review below |
| `BACKUP_ENABLED`              | `true`, only when these steps are complete       |

Before approval, confirm the current source is a low-write pairing pilot, arrange a window with no pairing/revocation writes for the first export, and verify two matching inventories include all expected collections. This policy is **not a transactional snapshot**. Before enabling activity uploads, a stronger tested watermark/write-free policy must be implemented. Review the full [recovery runbook](BACKUP_RECOVERY.md), including Auth/IAM recovery and anonymous-device re-pairing.

## 5. Verify once, then let the schedule run

In Actions, open **Private weekly database backup** → Run workflow → choose **export**. A successful run records a manifest hash, ciphertext hash, byte count and timestamp in the private release audit. It writes no plaintext document file and publishes no backup artifact in public CI. Upload verification checks the GitHub-reported attachment digest; this is not an offline decryption or recovery test.

Download that private encrypted attachment on the trusted recovery computer and perform the isolated emulator recovery in the runbook. Compare it against known real-source collections and grants. Do not send its decrypted contents into chat. Record the result in a private owner record. Activity uploads remain disabled until real recovery and the other launch gates are complete.

Once enabled, the job exports Sundays at **09:17 UTC** and checks freshness daily at **10:47 UTC**. Missing archives, malformed audits, future timestamps or age over eight days fail the freshness job. Enable your GitHub Actions failed-workflow notifications and verify a deliberate test failure reaches you; no separate email or text service is configured. GitHub schedules may be delayed or disabled by platform policy, so a check inside the same scheduler is not an independent outage monitor. Inspect failed drafts, retention failures, token expiry and quota failures. At the first activation there is no successful archive yet; a health check is expected to fail until the first verified upload.
