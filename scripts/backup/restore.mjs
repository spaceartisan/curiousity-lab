import { readFile } from "node:fs/promises";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { decryptArchive } from "./archive.mjs";
import { restoreEmulator } from "./firestore.mjs";
const [file, identity, projectId, flag] = process.argv.slice(2);
let app, db;
try {
  if (!file || !identity || !projectId || (flag && flag !== "--apply"))
    throw Error("Usage");
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  if (
    !/^demo-[a-z0-9-]+$/.test(projectId) ||
    !/^(127\.0\.0\.1|localhost):[0-9]+$/.test(host || "")
  )
    throw Error("Only local demo emulator supported");
  const archive = decryptArchive(await readFile(file), identity);
  app = initializeApp({ projectId });
  db = getFirestore(app);
  await restoreEmulator(db, archive, {
    projectId,
    emulatorHost: host,
    apply: flag === "--apply",
  });
  console.log(
    flag === "--apply"
      ? "Emulator restore verified."
      : "Archive validated. Dry run only; nothing was written.",
  );
} catch {
  console.error(
    "Restore failed. Validate the archive, offline identity and empty local demo emulator. No successful recovery is claimed.",
  );
  process.exitCode = 1;
} finally {
  if (db) await db.terminate();
  if (app) await deleteApp(app);
}
