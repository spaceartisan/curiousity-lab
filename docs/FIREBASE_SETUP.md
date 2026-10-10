# Firebase setup — v0.2.0 connection pilot

You can create the database now. This release supports account sign-in and trusted approval checks; **activity upload and family dashboards are not enabled yet**. Keep the initial test to your own account and synthetic data. Continue playing locally while connected features are built.

## 1. Create a dedicated project

1. Open [Firebase Console](https://console.firebase.google.com/) and create a new project for Curiosity Lab, for example `curiosity-lab-family` (choose an available ID).
2. Keep the **Spark** plan. Google Analytics can stay disabled. No credit card, Cloud Functions, Storage, or paid backup feature is required for this setup.
3. Under **Build → Firestore Database**, create the **Standard edition**, default `(default)` database, in **Production mode**. Choose a suitable US location; location cannot be casually changed later. Do not choose test mode or Realtime Database.
4. Under **Build → Authentication**, click Get started. Enable **Google** under Sign-in method and select a project support email. Under **Settings → Authorized domains**, add `spaceartisan.github.io`. Domain only: no `https://` and no repository path. Add `localhost` only if testing locally.
5. Under **Project settings → General**, register a **Web app** (`</>` icon), with a label such as “Curiosity Lab”. Firebase Hosting is unnecessary; GitHub Pages hosts the site.

## 2. Share the public web configuration

Copy the web app's `firebaseConfig` object from Project settings. Send me its **apiKey, authDomain, projectId, and appId** so I can check the configuration. These identify the public web app; the Firestore rules, authenticated identity, and trusted approval enforce privacy.

**Do not send a service-account JSON, private key, password, access token, or your parents' personal details.** Those are not needed to build the website.

For GitHub Actions, store this single JSON object as a **repository variable** named `FIREBASE_WEB_CONFIG`, under **Settings → Secrets and variables → Actions → Variables**:

```json
{
  "apiKey": "YOUR_WEB_API_KEY",
  "authDomain": "YOUR_PROJECT.firebaseapp.com",
  "projectId": "YOUR_PROJECT",
  "appId": "YOUR_WEB_APP_ID"
}
```

Use the exact four values from Firebase. The workflow exposes only this public configuration through `VITE_FIREBASE_CONFIG`. Empty variable builds a local-only app. After changing it, run the workflow using **Actions → Validate and publish Curiosity Lab → Run workflow**; another source push is unnecessary. For local development, copy `.env.example` to `.env.local` and fill the same JSON value.

## 3. Publish the tested rules

In Firestore's **Rules** tab, replace the existing rules with [firebase/firestore.rules](../firebase/firestore.rules) and Publish. Alternatively, in a trusted local checkout:

```sh
npx firebase login
npx firebase deploy --only firestore:rules --project YOUR_PROJECT_ID
```

There is no automatic production Firebase deployment in CI. This setup permits only a verified account to read its **own** approval directory and scoped membership. Browser writes, private activity reads, family listing, and public tenant creation remain denied. Insights is not allowed to create its own administrator grant. No pairing-code collection exists.

## 4. Test your account and approve it

After the configured site deploys, open **Insights → Settings → Family connection → Sign in with Google**. It will say the account has not been approved. Expand **Account ID for administrator setup**. Your UID is also visible in Authentication's Users tab.

For this pilot, approve only your own verified account. In Firestore's Data tab, create two documents with the following identical fields. Generate independent opaque IDs for family and subject; UUIDs are suitable. Keep the IDs private and retain them for the later sync setup.

| Field           | Firestore type | Value                       |
| --------------- | -------------- | --------------------------- |
| `schemaVersion` | number         | `1`                         |
| `familyId`      | string         | your generated family UUID  |
| `subjectId`     | string         | your generated subject UUID |
| `role`          | string         | `insights`                  |
| `status`        | string         | `active`                    |

Document paths:

1. `accountDirectory/YOUR_AUTH_UID`
2. `families/YOUR_FAMILY_UUID/members/YOUR_AUTH_UID`

Do not put emails or names in those documents. Both paths use your exact Auth UID. The two grants must agree. An approved Insights account remains wrong-role in Play/Companion; there is no role picker or automatic role escalation.

For repeatable trusted provisioning, the repository includes an owner-operated CLI. Use Google Application Default Credentials on a trusted machine; never commit/download credentials into this repository. Put a plan **outside** the repository, then first run:

```sh
npm run family:provision -- /absolute/private-plan.json
```

The plan has this structure (replace all placeholders privately):

```json
{
  "projectId": "YOUR_PROJECT_ID",
  "familyId": "YOUR_FAMILY_UUID",
  "subjectId": "YOUR_SUBJECT_UUID",
  "members": [
    {
      "uid": "YOUR_AUTH_UID",
      "expectedEmail": "YOUR_VERIFIED_EMAIL",
      "role": "insights",
      "status": "active"
    }
  ]
}
```

The default invocation verifies identity/email and existing assignments with **no writes**. Add `--apply` to write the two matching approvals atomically. It refuses unverified/disabled accounts, emulator overrides, private plans inside the repository, and silent reassignment to another family/subject. Never run it for someone without first verifying their intended account. Console writes and this CLI use owner privileges; Firestore browser rules do not authorize them.

## 5. Check the connection

- Insights shows “Your account is approved for this app.” No puzzle/history upload occurs.
- Try the same account in Play: its connection must be rejected for that role. All local puzzles still work.
- Change both documents' `status` to `revoked`: its connection is removed. Signing out/reloading clears displayed approval. This release uses memory-only Firestore caching, not persisted private records.
- Sign out: the role's Firebase login is removed, while existing local guest saves remain usable. The three named Firebase apps use separate role Auth keys. Browser origin storage remains shared infrastructure; actual-device installation must still be verified.

## Remaining before family sharing

Consent, explicit selection of preexisting local records, UID/family/subject-bound offline outbox, deduplicated uploads, separately authorized Companion summaries, analyst data tools, automatic encrypted independent backup and tested restore, and actual-device usability must be completed before enrolling the family for connected use.

## References

- [Google sign-in for the web](https://firebase.google.com/docs/auth/web/google-signin)
- [Firestore rules emulator tests](https://firebase.google.com/docs/firestore/security/test-rules-emulator)
- [Firebase pricing plans](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans)

Settings were checked against Firebase's official documentation on 2026-10-10.
