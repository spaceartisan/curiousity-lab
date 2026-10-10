import {
  encode,
  canonical,
  createArchive,
  validateArchive,
  decode,
} from "./archive.mjs";
export async function collectRecords(db, budget = { remaining: 20000 }) {
  const records = [];
  async function visit(parent) {
    const collections = await parent.listCollections();
    for (const collection of collections) {
      // listDocuments includes absent parents which still have subcollections.
      for (const ref of await collection.listDocuments()) {
        if (budget.remaining-- <= 0)
          throw Error("Backup document-fetch budget exhausted");
        const snapshot = await ref.get();
        if (snapshot.exists) {
          if (records.length >= 10000)
            throw Error("Backup exceeds supported size");
          records.push({
            path: ref.path,
            data: encode(snapshot.data(), db.projectId),
          });
        }
        await visit(ref);
      }
    }
  }
  await visit(db);
  return records.toSorted((a, b) => a.path.localeCompare(b.path));
}
export async function captureArchive(db, metadata) {
  const budget = { remaining: 20000 };
  const first = await collectRecords(db, budget),
    second = await collectRecords(db, budget);
  if (canonical(first) !== canonical(second))
    throw Error("Database changed during export; retry after writes stop");
  return createArchive(second, {
    ...metadata,
    consistency: "two-pass-equal-inventory",
  });
}
export async function restoreEmulator(
  db,
  archive,
  { projectId, emulatorHost, apply = false },
) {
  validateArchive(archive);
  // Production restore is deliberately absent; recovery is staged first.
  if (
    !/^demo-[a-z0-9-]+$/.test(projectId) ||
    !/^(127\.0\.0\.1|localhost):[0-9]+$/.test(emulatorHost || "") ||
    db.projectId !== projectId ||
    process.env.FIRESTORE_EMULATOR_HOST !== emulatorHost
  )
    throw Error("Restore only supports a local demo emulator");
  if (!apply) return { documentCount: archive.records.length, applied: false };
  if ((await collectRecords(db)).length)
    throw Error("Restore requires an empty emulator database");
  for (let start = 0; start < archive.records.length; start += 400) {
    const batch = db.batch();
    for (const record of archive.records.slice(start, start + 400))
      batch.create(
        db.doc(record.path),
        decode(record.data, (path) => db.doc(path)),
      );
    await batch.commit();
  }
  const restored = await collectRecords(db);
  if (canonical(restored) !== canonical(archive.records))
    throw Error("Restored inventory does not match backup");
  return { documentCount: restored.length, applied: true };
}
