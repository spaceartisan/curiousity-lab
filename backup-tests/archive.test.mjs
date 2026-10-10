import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Timestamp, GeoPoint } from "firebase-admin/firestore";
import {
  canonical,
  encode,
  decode,
  createArchive,
  validateArchive,
  packArchive,
  unpackArchive,
  encryptArchive,
  decryptArchive,
} from "../scripts/backup/archive.mjs";
import {
  captureArchive,
  restoreEmulator,
} from "../scripts/backup/firestore.mjs";
const metadata = {
  projectId: "demo-curiosity-backup",
  appVersion: "0.5.0",
  createdAt: "2026-10-10T00:00:00.000Z",
};
const fixture = () =>
  createArchive(
    [
      {
        path: "synthetic/one",
        data: encode({
          schemaVersion: 1,
          appVersion: "0.5.0",
          contentVersion: "1",
          activeMs: 60000,
          nested: {
            text: "Fictional notebook",
            list: [null, true, NaN, Infinity, -Infinity, -0],
          },
          time: new Timestamp(100, 123456789),
          location: new GeoPoint(32, -84),
          bytes: Buffer.from([0, 255]),
        }),
      },
    ],
    metadata,
  );
test("canonical archive preserves typed values and validates complete inventory", () => {
  const archive = unpackArchive(packArchive(fixture()));
  assert.deepEqual(archive, fixture());
  assert.equal(archive.manifest.documentCount, 1);
  assert.deepEqual(archive.manifest.collections, { synthetic: 1 });
  const data = decode(archive.records[0].data);
  assert.equal(data.time.nanoseconds, 123456789);
  assert.equal(data.location.latitude, 32);
  assert.deepEqual(data.bytes, Buffer.from([0, 255]));
  assert.ok(Number.isNaN(data.nested.list[2]));
  assert.ok(Object.is(data.nested.list[5], -0));
});
test("record tampering and manifest tampering are both rejected", () => {
  const records = fixture();
  records.records[0].path = "synthetic/altered";
  assert.throws(() => validateArchive(records));
  const manifest = fixture();
  manifest.manifest.documentCount = 9;
  assert.throws(() => validateArchive(manifest));
});
test("recomputed hashes still cannot hide incorrect counts or schema inventory", () => {
  const archive = fixture();
  archive.manifest.documentCount = 2;
  archive.manifestSha256 = createHash("sha256")
    .update(canonical(archive.manifest))
    .digest("hex");
  assert.throws(() => validateArchive(archive));
});
test("duplicate paths, invalid paths, unknown types and truncated archives fail closed", () => {
  const record = fixture().records[0];
  assert.throws(() => createArchive([record, record], metadata));
  assert.throws(() =>
    createArchive([{ ...record, path: "synthetic/../one" }], metadata),
  );
  assert.throws(() => decode({ type: "unrecognized" }));
  assert.throws(() => unpackArchive(packArchive(fixture()).subarray(0, 20)));
});
test("directory and membership cross-references must match", () => {
  const grant = {
    schemaVersion: 1,
    familyId: "family",
    subjectId: "subject",
    role: "play",
    status: "active",
  };
  const records = [
    { path: "families/family", data: encode({ schemaVersion: 1 }) },
    { path: "accountDirectory/player", data: encode(grant) },
    { path: "families/family/members/player", data: encode(grant) },
  ];
  assert.equal(createArchive(records, metadata).manifest.documentCount, 3);
  records[2].data = encode({ ...grant, subjectId: "other" });
  assert.throws(() => createArchive(records, metadata));
});
test("two-pass export rejects concurrent record changes instead of producing an archive", async () => {
  let read = 0;
  const ref = {
    path: "synthetic/one",
    get: async () => ({ exists: true, data: () => ({ value: ++read }) }),
    listCollections: async () => [],
  };
  const db = {
    listCollections: async () => [{ listDocuments: async () => [ref] }],
  };
  await assert.rejects(captureArchive(db, metadata), /changed/);
});
test("restore cannot target production, remote emulators or populated destinations", async () => {
  await assert.rejects(
    restoreEmulator({ projectId: "production" }, fixture(), {
      projectId: "production",
      emulatorHost: "127.0.0.1:8080",
      apply: true,
    }),
    /local demo/,
  );
  await assert.rejects(
    restoreEmulator({ projectId: "demo-test" }, fixture(), {
      projectId: "demo-test",
      emulatorHost: "example.com:8080",
      apply: true,
    }),
    /local demo/,
  );
});
const ageAvailable = spawnSync("age", ["--version"]).status === 0;
if (process.env.CI && !ageAvailable)
  throw Error("CI must install age; encryption verification cannot be skipped");
test(
  "age authenticated encryption round-trips and rejects wrong identities and damaged ciphertext",
  { skip: !ageAvailable },
  async () => {
    const directory = await mkdtemp(join(tmpdir(), "curiosity-synthetic-age-"));
    try {
      const identity = join(directory, "fixture-key"),
        wrong = join(directory, "wrong-key");
      assert.equal(spawnSync("age-keygen", ["-o", identity]).status, 0);
      assert.equal(spawnSync("age-keygen", ["-o", wrong]).status, 0);
      const recipient = spawnSync("age-keygen", ["-y", identity], {
        encoding: "utf8",
      }).stdout.trim();
      const ciphertext = encryptArchive(fixture(), recipient);
      assert.deepEqual(decryptArchive(ciphertext, identity), fixture());
      assert.throws(() => decryptArchive(ciphertext, wrong));
      const damaged = Buffer.from(ciphertext);
      damaged[damaged.length - 1] ^= 1;
      assert.throws(() => decryptArchive(damaged, identity));
      assert.ok(!ciphertext.includes(Buffer.from("Fictional notebook")));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
);
