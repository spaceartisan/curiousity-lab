import { writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import {
  initializeApp,
  applicationDefault,
  deleteApp,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { captureArchive } from "./firestore.mjs";
import { encryptArchive } from "./archive.mjs";
import { readFile } from "node:fs/promises";
// Privileged owner-operated CLI. Never part of the browser bundle.
const [projectId, recipient, output] = process.argv.slice(2);
let app, db;
try {
  if (
    !projectId ||
    !/^[a-z][a-z0-9-]{4,60}$/.test(projectId) ||
    !output ||
    !output.endsWith(".age") ||
    !relative(process.cwd(), resolve(output)).startsWith("..")
  )
    throw Error("Usage");
  if (
    process.env.FIRESTORE_EMULATOR_HOST ||
    process.env.FIREBASE_AUTH_EMULATOR_HOST
  )
    throw Error("Production export refuses emulator overrides");
  const appVersion = JSON.parse(
    await readFile(new URL("../../package.json", import.meta.url), "utf8"),
  ).version;
  app = initializeApp({ projectId, credential: applicationDefault() });
  db = getFirestore(app);
  const archive = await captureArchive(db, {
    projectId,
    appVersion,
    createdAt: new Date().toISOString(),
  });
  const ciphertext = encryptArchive(archive, recipient);
  await writeFile(resolve(output), ciphertext, { flag: "wx", mode: 0o600 });
  console.log(
    "Encrypted backup created. No plaintext was written. Verify recovery before relying on this archive.",
  );
} catch {
  console.error(
    "Backup failed. Check the documented arguments, read-only credentials, encryption tool and output location. No successful backup is claimed.",
  );
  process.exitCode = 1;
} finally {
  if (db) await db.terminate();
  if (app) await deleteApp(app);
}
