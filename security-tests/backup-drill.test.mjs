import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore, Timestamp, GeoPoint } from "firebase-admin/firestore";
import {
  captureArchive,
  restoreEmulator,
} from "../scripts/backup/firestore.mjs";
import {
  encryptArchive,
  decryptArchive,
  canonical,
} from "../scripts/backup/archive.mjs";
const projectId = "demo-curiosity-backup-drill";
test("synthetic encrypted Firestore backup decrypts, restores all nested collections, and verifies representative records", async () => {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  assert.match(host || "", /^(127\.0\.0\.1|localhost):\d+$/);
  const clear = async () => {
    const response = await fetch(
      `http://${host}/emulator/v1/projects/${projectId}/databases/(default)/documents`,
      { method: "DELETE" },
    );
    assert.ok(response.ok);
  };
  await clear();
  const app = initializeApp({ projectId }, "synthetic-backup-drill"),
    db = getFirestore(app);
  const directory = await mkdtemp(join(tmpdir(), "curiosity-emulator-age-"));
  try {
    const grant = {
      schemaVersion: 1,
      familyId: "synthetic-family",
      subjectId: "synthetic-subject",
      role: "play",
      status: "active",
    };
    await db
      .doc("families/synthetic-family")
      .set({ schemaVersion: 1, status: "active" });
    await db.doc("accountDirectory/synthetic-player").set(grant);
    await db
      .doc("families/synthetic-family/members/synthetic-player")
      .set(grant);
    // Both subject and intermediate branch deliberately lack parent documents.
    const path =
      "families/synthetic-family/subjects/synthetic-subject/sessions/synthetic-session";
    await db
      .doc(path)
      .set({
        schemaVersion: 1,
        appVersion: "0.5.0",
        contentVersion: "1",
        hints: 2,
        time: new Timestamp(100, 999999999),
        location: new GeoPoint(32, -84),
        bytes: Buffer.from([1, 2]),
        reference: db.doc("families/synthetic-family"),
        nested: { list: [true, null, "fictional"] },
      });
    await db
      .doc("missing-parent/synthetic/children/synthetic-child")
      .set({ schemaVersion: 1, value: "fictional" });
    const archive = await captureArchive(db, {
      projectId,
      appVersion: "0.5.0",
      createdAt: new Date().toISOString(),
    });
    assert.equal(archive.manifest.documentCount, 5);
    const identity = join(directory, "ephemeral-fixture-key");
    assert.equal(spawnSync("age-keygen", ["-o", identity]).status, 0);
    const recipient = spawnSync("age-keygen", ["-y", identity], {
      encoding: "utf8",
    }).stdout.trim();
    const restoredArchive = decryptArchive(
      encryptArchive(archive, recipient),
      identity,
    );
    assert.equal(canonical(restoredArchive), canonical(archive));
    await assert.rejects(
      restoreEmulator(db, restoredArchive, {
        projectId,
        emulatorHost: host,
        apply: true,
      }),
      /empty/,
    );
    await clear();
    assert.deepEqual(
      await restoreEmulator(db, restoredArchive, {
        projectId,
        emulatorHost: host,
      }),
      { documentCount: 5, applied: false },
    );
    assert.equal((await db.doc(path).get()).exists, false);
    assert.deepEqual(
      await restoreEmulator(db, restoredArchive, {
        projectId,
        emulatorHost: host,
        apply: true,
      }),
      { documentCount: 5, applied: true },
    );
    const restored = (await db.doc(path).get()).data();
    assert.equal(restored.hints, 2);
    assert.equal(restored.time.nanoseconds, 999999999);
    assert.equal(restored.reference.path, "families/synthetic-family");
    assert.deepEqual(restored.bytes, Buffer.from([1, 2]));
    assert.equal(
      (
        await db.doc("missing-parent/synthetic/children/synthetic-child").get()
      ).data().value,
      "fictional",
    );
  } finally {
    await clear();
    await db.terminate();
    await deleteApp(app);
    await rm(directory, { recursive: true, force: true });
  }
});
