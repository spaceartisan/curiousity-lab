import {
  initializeApp,
  applicationDefault,
  deleteApp,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFile } from "node:fs/promises";
import { captureArchive } from "./firestore.mjs";
import { encryptArchive } from "./archive.mjs";
import { BackupRemote, checkFresh } from "./remote.mjs";
let app, db;
try {
  const remote = new BackupRemote(
    process.env.BACKUP_REPOSITORY,
    process.env.BACKUP_REPOSITORY_TOKEN,
    process.env.GITHUB_REPOSITORY,
  );
  if (process.argv[2] === "health") {
    checkFresh(await remote.inventory());
    console.log(
      "A recent encrypted archive is recorded. This does not certify recovery.",
    );
  } else {
    if (
      process.argv[2] !== "export" ||
      process.env.BACKUP_CONSISTENCY_APPROVED !== "two-pass-reviewed" ||
      process.env.FIRESTORE_EMULATOR_HOST ||
      process.env.FIREBASE_AUTH_EMULATOR_HOST ||
      process.env.BACKUP_PROJECT_ID !== "curiousity-lab"
    )
      throw Error("Launch configuration incomplete");
    await remote.inventory();
    const appVersion = JSON.parse(
      await readFile(new URL("../../package.json", import.meta.url), "utf8"),
    ).version;
    app = initializeApp({
      projectId: process.env.BACKUP_PROJECT_ID,
      credential: applicationDefault(),
    });
    db = getFirestore(app);
    const createdAt = new Date().toISOString();
    const archive = await captureArchive(db, {
      projectId: process.env.BACKUP_PROJECT_ID,
      createdAt,
      appVersion,
    });
    await remote.publish(
      encryptArchive(archive, process.env.BACKUP_AGE_RECIPIENT),
      createdAt,
      appVersion,
      archive.manifestSha256,
    );
    console.log(
      "Encrypted archive uploaded and ciphertext checksum verified. Offline recovery still requires verification.",
    );
  }
} catch {
  console.error(
    "Backup job failed. Inspect configuration and private destination; no new successful backup is claimed.",
  );
  process.exitCode = 1;
} finally {
  if (db) await db.terminate();
  if (app) await deleteApp(app);
}
