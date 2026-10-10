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
  writeBatch,
  Timestamp,
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

// Code-only pairing: every parent has a hidden, persistent anonymous Auth identity.
const ownerUid = "owner_synthetic_0001";
const ownerSubject = "subject_synthetic_002";
const anon = (uid) =>
  env
    .authenticatedContext(uid, {
      email_verified: false,
      firebase: { sign_in_provider: "anonymous" },
    })
    .firestore();
const ownerDb = () => user(ownerUid);
const parentGrant = (hash, role = "play") => ({
  schemaVersion: 1,
  familyId: ownerUid,
  subjectId: ownerSubject,
  role,
  status: "active",
  invitationHash: hash,
});
async function seedInvite(hash, changes = {}) {
  await env.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "invitations", hash), {
      schemaVersion: 1,
      familyId: ownerUid,
      subjectId: ownerSubject,
      role: "play",
      status: "pending",
      claimedBy: "",
      expiresAt: Timestamp.fromMillis(Date.now() + 3600000),
      ...changes,
    });
  });
}
function claim(db, uid, hash, changes = {}, options = {}) {
  const batch = writeBatch(db),
    grant = { ...parentGrant(hash), ...changes };
  batch.update(doc(db, "invitations", hash), {
    status: "claimed",
    claimedBy: uid,
  });
  if (!options.omitDirectory)
    batch.set(doc(db, "accountDirectory", uid), grant);
  if (!options.omitMember)
    batch.set(doc(db, "families", grant.familyId, "members", uid), grant);
  return batch.commit();
}
test("a verified owner can atomically set up only their own family", async () => {
  const db = ownerDb(),
    batch = writeBatch(db);
  const grant = {
    schemaVersion: 1,
    familyId: ownerUid,
    subjectId: ownerSubject,
    role: "insights",
    status: "active",
  };
  batch.set(doc(db, "families", ownerUid), {
    schemaVersion: 1,
    ownerUid,
    subjectId: ownerSubject,
  });
  batch.set(doc(db, "accountDirectory", ownerUid), grant);
  batch.set(doc(db, "families", ownerUid, "members", ownerUid), grant);
  await assertSucceeds(batch.commit());
  await assertSucceeds(getDoc(doc(db, "families", ownerUid)));
  await assertSucceeds(
    getDocs(collection(db, "families", ownerUid, "members")),
  );
  await assertFails(getDoc(doc(user("stranger"), "families", ownerUid)));
});
test("owner bootstrap cannot be split, impersonate another UID or use anonymous Auth", async () => {
  const uid = "other_owner_synthetic",
    db = user(uid);
  const grant = {
    schemaVersion: 1,
    familyId: uid,
    subjectId: ownerSubject,
    role: "insights",
    status: "active",
  };
  await assertFails(
    setDoc(doc(db, "families", uid), {
      schemaVersion: 1,
      ownerUid: uid,
      subjectId: ownerSubject,
    }),
  );
  await assertFails(setDoc(doc(db, "accountDirectory", uid), grant));
  await assertFails(setDoc(doc(anon(uid), "accountDirectory", uid), grant));
  await assertFails(setDoc(doc(db, "accountDirectory", ownerUid), grant));
});
test("only owner can issue role-specific expiring invitations; no raw code is stored", async () => {
  const data = {
    schemaVersion: 1,
    familyId: ownerUid,
    subjectId: ownerSubject,
    role: "companion",
    status: "pending",
    claimedBy: "",
    expiresAt: Timestamp.fromMillis(Date.now() + 3600000),
  };
  await assertSucceeds(
    setDoc(doc(ownerDb(), "invitations", "a".repeat(64)), data),
  );
  await assertFails(
    setDoc(doc(user("stranger"), "invitations", "b".repeat(64)), data),
  );
  await assertFails(
    setDoc(doc(anon("new-device"), "invitations", "b".repeat(64)), data),
  );
  for (const change of [
    { role: "insights" },
    { subjectId: "different_subject_001" },
    { expiresAt: Timestamp.fromMillis(Date.now() + 25 * 3600000) },
    { rawCode: "secret" },
  ])
    await assertFails(
      setDoc(doc(ownerDb(), "invitations", "b".repeat(64)), {
        ...data,
        ...change,
      }),
    );
  await assertFails(setDoc(doc(ownerDb(), "invitations", "123456"), data));
});
test("a parent can redeem a code atomically, read only their grants and never list invitations", async () => {
  const uid = "parent_device_0001",
    db = anon(uid),
    hash = "c".repeat(64);
  await seedInvite(hash);
  await assertSucceeds(getDoc(doc(db, "invitations", hash)));
  await assertSucceeds(claim(db, uid, hash));
  await assertSucceeds(getDoc(doc(db, "accountDirectory", uid)));
  await assertSucceeds(getDoc(doc(db, "families", ownerUid, "members", uid)));
  await assertFails(getDocs(collection(db, "invitations")));
  await assertFails(getDocs(collection(db, "families", ownerUid, "members")));
  await assertFails(getDoc(doc(db, "accountDirectory", ownerUid)));
  await assertFails(getDoc(doc(db, "families", ownerUid)));
});
test("used, expired and cancelled codes cannot be redeemed or read by another device", async () => {
  for (const [hash, changes] of [
    ["c".repeat(64), null],
    ["d".repeat(64), { expiresAt: Timestamp.fromMillis(Date.now() - 10000) }],
    ["e".repeat(64), { status: "revoked" }],
  ]) {
    if (changes) await seedInvite(hash, changes);
    const db = anon("second_device_0001");
    await assertFails(getDoc(doc(db, "invitations", hash)));
    await assertFails(claim(db, "second_device_0001", hash));
  }
});
test("code redemption cannot change roles, subjects, family, claimant or omit either grant", async () => {
  const uid = "attacker_device_001",
    db = anon(uid),
    hash = "f".repeat(64);
  await seedInvite(hash);
  for (const changes of [
    { role: "insights" },
    { role: "companion" },
    { subjectId: "different_subject_001" },
    { familyId: otherFamily },
    { invitationHash: "c".repeat(64) },
    { status: "revoked" },
    { unexpected: true },
  ])
    await assertFails(claim(db, uid, hash, changes));
  await assertFails(claim(db, uid, hash, {}, { omitDirectory: true }));
  await assertFails(claim(db, uid, hash, {}, { omitMember: true }));
  await assertFails(claim(db, "impersonated_device", hash));
  await assertFails(claim(user(uid), uid, hash));
  await assertFails(
    updateDoc(doc(db, "invitations", hash), {
      status: "claimed",
      claimedBy: uid,
    }),
  );
  await assertFails(
    setDoc(doc(db, "accountDirectory", uid), parentGrant(hash)),
  );
});
test("two devices racing the same invitation produce exactly one grant", async () => {
  const hash = "1".repeat(64);
  await seedInvite(hash);
  const results = await Promise.allSettled([
    claim(anon("race_device_0001"), "race_device_0001", hash),
    claim(anon("race_device_0002"), "race_device_0002", hash),
  ]);
  if (results.filter((result) => result.status === "fulfilled").length !== 1)
    throw Error("Invitation was not single-use");
});
test("owner revocation is atomic, permanent for that identity and cannot change a role", async () => {
  const uid = "parent_device_0001",
    db = ownerDb();
  await assertFails(
    updateDoc(doc(db, "accountDirectory", uid), { status: "revoked" }),
  );
  const batch = writeBatch(db);
  batch.update(doc(db, "accountDirectory", uid), { status: "revoked" });
  batch.update(doc(db, "families", ownerUid, "members", uid), {
    status: "revoked",
  });
  await assertSucceeds(batch.commit());
  await assertSucceeds(getDoc(doc(anon(uid), "accountDirectory", uid)));
  await assertFails(
    getDoc(doc(anon(uid), "families", ownerUid, "members", uid)),
  );
  await assertFails(
    updateDoc(doc(db, "accountDirectory", uid), { role: "insights" }),
  );
  await assertFails(
    updateDoc(doc(db, "accountDirectory", uid), { status: "active" }),
  );
  const hash = "2".repeat(64);
  await seedInvite(hash);
  await assertFails(claim(anon(uid), uid, hash));
});
test("parents cannot revoke devices, move families or reassign their own grant", async () => {
  const hash = "3".repeat(64),
    uid = "parent_device_0003",
    db = anon(uid);
  await seedInvite(hash);
  await assertSucceeds(claim(db, uid, hash));
  await assertFails(
    updateDoc(doc(db, "accountDirectory", uid), { status: "revoked" }),
  );
  await assertFails(
    updateDoc(doc(db, "accountDirectory", uid), { familyId: otherFamily }),
  );
  await assertFails(deleteDoc(doc(db, "accountDirectory", uid)));
  await assertFails(
    getDoc(
      doc(
        db,
        "families",
        ownerUid,
        "subjects",
        ownerSubject,
        "sessions",
        "synthetic",
      ),
    ),
  );
  await assertFails(
    setDoc(
      doc(
        db,
        "families",
        ownerUid,
        "subjects",
        ownerSubject,
        "sessions",
        "synthetic",
      ),
      { synthetic: true },
    ),
  );
});
test("owner may cancel an unused invitation without granting access", async () => {
  const hash = "4".repeat(64);
  await seedInvite(hash);
  await assertSucceeds(
    updateDoc(doc(ownerDb(), "invitations", hash), { status: "revoked" }),
  );
  await assertFails(
    claim(anon("cancel_device_0001"), "cancel_device_0001", hash),
  );
});

test("a removed owner cannot leave usable invitations behind", async () => {
  const hash = "5".repeat(64);
  await seedInvite(hash);
  await env.withSecurityRulesDisabled(async (context) => {
    await updateDoc(doc(context.firestore(), "accountDirectory", ownerUid), {
      status: "revoked",
    });
  });
  try {
    await assertFails(
      getDoc(doc(anon("inactive_owner_device"), "invitations", hash)),
    );
    await assertFails(
      claim(anon("inactive_owner_device"), "inactive_owner_device", hash),
    );
    await assertFails(
      getDocs(collection(ownerDb(), "families", ownerUid, "members")),
    );
  } finally {
    await env.withSecurityRulesDisabled(async (context) => {
      await updateDoc(doc(context.firestore(), "accountDirectory", ownerUid), {
        status: "active",
      });
    });
  }
});
