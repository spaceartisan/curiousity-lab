import { before, after, test } from "node:test";
import { readFile } from "node:fs/promises";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
let env;
const familyId = "family_synthetic_0001";
const otherFamily = "family_synthetic_0002";
const subjectId = "subject_synthetic_001";
const grant = (role, status = "active") => ({
  schemaVersion: 1,
  familyId,
  subjectId,
  role,
  status,
});
const user = (uid, verified = true) =>
  env.authenticatedContext(uid, { email_verified: verified }).firestore();
before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-curiosity-lab",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: await readFile("firebase/firestore.rules", "utf8"),
    },
  });
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const [uid, role, status] of [
      ["mom", "play", "active"],
      ["dad", "companion", "active"],
      ["analyst", "insights", "active"],
      ["revoked", "play", "revoked"],
    ]) {
      await setDoc(doc(db, "accountDirectory", uid), grant(role, status));
      await setDoc(
        doc(db, "families", familyId, "members", uid),
        grant(role, status),
      );
    }
    await setDoc(
      doc(
        db,
        "families",
        familyId,
        "subjects",
        subjectId,
        "sessions",
        "synthetic",
      ),
      { synthetic: true },
    );
    await setDoc(
      doc(
        db,
        "families",
        familyId,
        "subjects",
        subjectId,
        "companionSummaries",
        "synthetic",
      ),
      { synthetic: true },
    );
    await setDoc(doc(db, "families", otherFamily, "members", "mom"), {
      ...grant("play"),
      familyId: otherFamily,
    });
  });
});
after(async () => {
  if (env) await env.cleanup();
});
test("anonymous visitors cannot read or write even a guessed own directory", async () => {
  const db = env.unauthenticatedContext().firestore();
  await assertFails(getDoc(doc(db, "accountDirectory", "mom")));
  await assertFails(
    setDoc(doc(db, "accountDirectory", "guest"), grant("insights")),
  );
});
test("unverified identities cannot read an approval", async () => {
  await assertFails(getDoc(doc(user("mom", false), "accountDirectory", "mom")));
});
test("verified identities may inspect only their own directory", async () => {
  await assertSucceeds(getDoc(doc(user("mom"), "accountDirectory", "mom")));
  await assertFails(getDoc(doc(user("dad"), "accountDirectory", "mom")));
});
test("a verified stranger can receive not-found for their own approval without private data", async () => {
  const snapshot = await assertSucceeds(
    getDoc(doc(user("stranger"), "accountDirectory", "stranger")),
  );
  if (snapshot.exists()) throw Error("Unexpected grant");
  await assertFails(
    getDoc(doc(user("stranger"), "families", familyId, "members", "stranger")),
  );
});
test("no account may enumerate account directories, families or memberships", async () => {
  for (const path of [
    ["accountDirectory"],
    ["families"],
    ["families", familyId, "members"],
  ])
    await assertFails(getDocs(collection(user("analyst"), ...path)));
});
test("all approved roles can read only their own scoped membership", async () => {
  for (const uid of ["mom", "dad", "analyst"]) {
    await assertSucceeds(
      getDoc(doc(user(uid), "families", familyId, "members", uid)),
    );
    await assertFails(
      getDoc(doc(user(uid), "families", familyId, "members", "stranger")),
    );
  }
});
test("same UID cannot inspect a membership in another family", async () => {
  await assertFails(
    getDoc(doc(user("mom"), "families", otherFamily, "members", "mom")),
  );
});
test("revocation closes membership access but lets owner see revoked status", async () => {
  await assertSucceeds(
    getDoc(doc(user("revoked"), "accountDirectory", "revoked")),
  );
  await assertFails(
    getDoc(doc(user("revoked"), "families", familyId, "members", "revoked")),
  );
});
test("guessed and reused short codes have no read or write authority", async () => {
  const db = user("stranger");
  for (const code of ["000000", "123456", "999999"]) {
    await assertFails(getDoc(doc(db, "pairingCodes", code)));
    await assertFails(
      setDoc(doc(db, "pairingCodes", code), { uid: "stranger" }),
    );
  }
});
test("even approved analyst cannot bootstrap tenants, grants or own role from browser", async () => {
  const db = user("analyst");
  await assertFails(
    setDoc(doc(db, "families", otherFamily), { owner: "analyst" }),
  );
  await assertFails(
    setDoc(doc(db, "accountDirectory", "new-member"), grant("play")),
  );
  await assertFails(
    updateDoc(doc(db, "families", familyId, "members", "analyst"), {
      role: "play",
    }),
  );
  await assertFails(deleteDoc(doc(db, "accountDirectory", "analyst")));
});
test("subject records, raw sessions, events, summaries, consent and creations remain closed in setup release", async () => {
  for (const uid of ["mom", "dad", "analyst", "stranger"]) {
    const db = user(uid);
    for (const kind of [
      "sessions",
      "events",
      "companionSummaries",
      "consentEvents",
      "creations",
    ]) {
      const path = [
        "families",
        familyId,
        "subjects",
        subjectId,
        kind,
        "synthetic",
      ];
      await assertFails(getDoc(doc(db, ...path)));
      await assertFails(setDoc(doc(db, ...path), { synthetic: true }));
    }
    await assertFails(
      getDoc(doc(db, "families", familyId, "subjects", subjectId)),
    );
  }
});
