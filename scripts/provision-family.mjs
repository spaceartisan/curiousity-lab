import { readFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// Owner-operated CLI only. Never bundled or exposed as a web endpoint.
const [file, flag] = process.argv.slice(2);
if (!file || (flag && flag !== "--apply"))
  throw Error(
    "Usage: npm run family:provision -- /absolute/private-plan.json [--apply]",
  );
const filePath = resolve(file);
if (!relative(process.cwd(), filePath).startsWith(".."))
  throw Error("Keep the private provisioning plan outside the repository.");
if (
  process.env.FIRESTORE_EMULATOR_HOST ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST
)
  throw Error("Production provisioning refuses emulator overrides.");
const plan = JSON.parse(await readFile(filePath, "utf8"));
if (
  !plan ||
  !/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(plan.projectId) ||
  !/^[A-Za-z0-9_-]{16,100}$/.test(plan.familyId) ||
  !/^[A-Za-z0-9_-]{16,100}$/.test(plan.subjectId) ||
  !Array.isArray(plan.members) ||
  plan.members.length < 1 ||
  plan.members.length > 10 ||
  new Set(plan.members.map((m) => m.uid)).size !== plan.members.length
)
  throw Error("Invalid private provisioning plan");
for (const m of plan.members) {
  if (
    !m ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(m.uid) ||
    typeof m.expectedEmail !== "string" ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m.expectedEmail) ||
    !["play", "companion", "insights"].includes(m.role) ||
    !["active", "revoked"].includes(m.status)
  )
    throw Error("Invalid member in private provisioning plan");
}
const app = initializeApp({
  credential: applicationDefault(),
  projectId: plan.projectId,
});
const db = getFirestore(app);
const identities = await Promise.all(
  plan.members.map((m) => getAuth(app).getUser(m.uid)),
);
for (let i = 0; i < identities.length; i++) {
  const identity = identities[i],
    member = plan.members[i];
  if (
    !identity.emailVerified ||
    identity.disabled ||
    identity.email?.toLowerCase() !== member.expectedEmail.toLowerCase()
  )
    throw Error(
      "Identity verification failed. Review UIDs and expected emails privately.",
    );
}
await db.runTransaction(async (transaction) => {
  const refs = plan.members.flatMap((m) => [
    db.doc(`accountDirectory/${m.uid}`),
    db.doc(`families/${plan.familyId}/members/${m.uid}`),
  ]);
  const existing = await transaction.getAll(...refs);
  for (const snapshot of existing) {
    if (
      snapshot.exists &&
      (snapshot.data().familyId !== plan.familyId ||
        snapshot.data().subjectId !== plan.subjectId)
    )
      throw Error(
        "Existing approval points to another household/subject. Refusing reassignment.",
      );
  }
  if (flag !== "--apply") return;
  for (let i = 0; i < plan.members.length; i++) {
    const m = plan.members[i];
    const data = {
      schemaVersion: 1,
      familyId: plan.familyId,
      subjectId: plan.subjectId,
      role: m.role,
      status: m.status,
    };
    transaction.set(refs[i * 2], data);
    transaction.set(refs[i * 2 + 1], data);
  }
});
console.log(
  flag === "--apply"
    ? `Applied ${plan.members.length} verified account approvals atomically.`
    : `Validated ${plan.members.length} identities and existing approvals. No writes. Add --apply to provision.`,
);
