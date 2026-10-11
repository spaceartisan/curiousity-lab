// Play's local activity log (IndexedDB). Records stay here and, with consent, are copied to the family.
import { openDB, type IDBPDatabase } from "idb";
import type { ActivityRecord } from "./records";

interface Stored extends ActivityRecord {
  /** Set once the family copy is confirmed. */
  uploaded?: boolean;
}

let dbPromise: Promise<IDBPDatabase> | undefined;
function db() {
  dbPromise ??= openDB("curiosity-lab-activity", 1, {
    upgrade(d) {
      d.createObjectStore("records", { keyPath: "id" });
    },
  });
  return dbPromise;
}

export async function saveRecord(r: ActivityRecord) {
  await (await db()).put("records", { ...r, uploaded: false } satisfies Stored);
}

export async function allRecords(): Promise<ActivityRecord[]> {
  const rows = (await (await db()).getAll("records")) as Stored[];
  return rows
    .map(({ uploaded: _uploaded, ...r }) => r)
    .sort((a, b) => a.at.localeCompare(b.at));
}

export async function pendingRecords(): Promise<ActivityRecord[]> {
  const rows = (await (await db()).getAll("records")) as Stored[];
  return rows
    .filter((r) => !r.uploaded)
    .map(({ uploaded: _uploaded, ...r }) => r);
}

export async function markUploaded(ids: string[]) {
  const d = await db();
  const tx = d.transaction("records", "readwrite");
  for (const id of ids) {
    const row = (await tx.store.get(id)) as Stored | undefined;
    if (row) await tx.store.put({ ...row, uploaded: true });
  }
  await tx.done;
}

export async function clearRecords() {
  await (await db()).clear("records");
}
