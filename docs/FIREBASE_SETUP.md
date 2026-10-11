# Firebase setup — v0.3.0 code-only invitations

The owner signs in with Google in Insights. Mom and Dad do not need email, Google accounts, passwords, account IDs, or console access. The owner texts an invitation; each parent opens the link and taps **Connect**, or pastes its code into their app. Authentication and membership happen behind the scenes. Pairing alone uploads nothing. Activity is shared only after Mom answers yes on Play. See [family sharing](FAMILY_SHARING.md).

## One-time Firebase project setup

The registered `curiousity-lab` public web configuration is already included in `firebase/web-config.json`. Keep the Spark plan. Analytics remains disabled. GitHub Pages hosts the apps; Firebase Hosting, Cloud Functions, Storage and a billing upgrade are not required for pairing.

In [Firebase Console](https://console.firebase.google.com/project/curiousity-lab/overview):

1. **Build → Firestore Database:** create the Standard edition, default `(default)` database in Production mode if it does not exist. Do not use Realtime Database or test mode.
2. **Build → Authentication → Sign-in method:** enable **Google** (already completed) and **Anonymous**. Anonymous sign-in supplies a hidden identity for each parent's device; it does not open access to family activity.
3. **Authentication → Settings → Authorized domains:** ensure `spaceartisan.github.io` is present (already completed). Add `localhost` only for local testing.
4. **Firestore Database → Rules:** replace the rules with the complete contents of [firebase/firestore.rules](../firebase/firestore.rules), then click **Publish**. The previous v0.2.x rules deliberately reject all invitation writes and must be replaced for pairing to work.

Alternatively, from a trusted local checkout:

```sh
npx firebase login
npx firebase deploy --only firestore:rules --project curiousity-lab
```

CI publishes the web apps, but does **not** publish production Firebase rules. This repository does not contain an administrator credential. Do not enable Identity Platform automatic anonymous-account cleanup for paired parent devices: deleting their hidden identities would require new invitations.

## Your normal setup

1. Open [Insights](https://spaceartisan.github.io/curiousity-lab/insights/), choose **Connect your family**, and sign in with Google. Your own private family and Insights membership are created together. No console UID provisioning is needed for a new family.
2. Select **Create Mom’s code** or **Create Dad’s code**.
3. Select **Copy invitation** and paste it into your text message. The link opens the correct app with the code filled in. The parent taps **Connect**. If they already have the app open, they can paste the code under Settings → Family connection.
4. The connection appears under **Connected devices**. Their app remembers its hidden identity on that device. Local play stays available offline.

Invitations expire after 23 hours and can be used once. They contain a random 128-bit code, not a six-digit login. The complete text includes a link to minimize typing. Only its SHA-256 hash is stored in Firestore; the raw code is held in memory while displaying/copying it. The link carries the code in a fragment, and the app removes it immediately. The code is not placed in query strings, service-worker caches, analytics, logs or local storage.

**Cancel invitation** invalidates an unused invitation. Reloading the owner screen discards the displayed raw code; create a fresh invitation if needed. Previously issued invitations remain valid until claimed, cancelled or expired.

## Replacement devices and removal

Use **Remove connection** in Insights to revoke a parent device. Revocation updates both grants atomically. A revoked identity cannot reactivate itself, change its role or move families. For a replacement phone/tablet, send a new invitation. To reconnect the same browser after removal, choose **Disconnect this device**, then use the new invitation; this creates a fresh hidden identity.

Clearing browser/site storage, changing browsers, losing a device or deleting its Auth identity requires a new invitation. Browser tabs and installed PWAs can share or separate storage depending on the operating system; verify actual devices. No parent email/password recovery screen is required. Auth persistence is separated by the three named role apps. Firestore data uses memory-only caching; cached grants never certify approval.

## Permissions

- Verified owners can create **only their own** family, create role-specific invitations for it, inspect its connected memberships and revoke parent devices.
- Parents can atomically claim a valid, unexpired invitation and create only their own matching directory and membership. The invitation, directory and membership must commit together. Simultaneous claims yield one winner. No self-selected role or subject is trusted.
- An unpaired anonymous identity can inspect its own empty directory and a valid invitation whose unpredictable hash it possesses. It cannot list invitations, families, memberships, other accounts or private activity.
- Signed-out visitors cannot read/write these records.
- Since v0.33.0: Play members create activity records and the sharing state for their own family. The owner and Companion read activity and notes, write notes and send gifts. Play may mark a gift opened. Everything else stays closed. See [family sharing](FAMILY_SHARING.md).

The code-only flow supersedes v0.2.x's email/Google requirement for parent identities and manually approved parent UIDs, following the owner's requested provider-managed setup. The older `family:provision` CLI is a legacy trusted-admin tool, not the normal setup path. Legacy manually provisioned memberships using arbitrary family IDs are not automatically migrated into self-service families; do not delete/reassign existing production records to bypass that boundary.

## Optional configuration override

An empty `FIREBASE_WEB_CONFIG` repository variable uses the committed public project. To disable all cloud connections, set it to `local-only`. A different project can be supplied as a JSON object with `apiKey`, `authDomain`, `projectId`, and `appId`. Rerun the Pages workflow after a variable change. Never supply a service-account key or private credential as web configuration.

## Updating rules

Whenever `firebase/firestore.rules` changes (most recently in v0.33.0 for activity, notes, gifts and sharing), paste the whole file into **Firestore Database → Rules** and click **Publish**. Then run `npm run test:rules` locally to exercise the same rules in the emulator.

## References

- [Firebase anonymous authentication](https://firebase.google.com/docs/auth/web/anonymous-auth)
- [Google sign-in](https://firebase.google.com/docs/auth/web/google-signin)
- [Atomic writes and getAfter validation](https://firebase.google.com/docs/firestore/manage-data/transactions)
- [Firestore rules emulator tests](https://firebase.google.com/docs/firestore/security/test-rules-emulator)
