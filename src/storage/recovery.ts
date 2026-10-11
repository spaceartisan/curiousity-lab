import { withoutRecordedHistory } from "./presentation";
import { openDB } from "idb";
import { validateState, type LocalState, type Role } from "./contracts";
import { loadState, saveState } from "./local";

export interface RecoveryCopy {
  schemaVersion: 1;
  savedAt: string;
  state: LocalState;
}
const database = (role: Role) =>
  openDB(`curiosity-lab:v1:${role}:recovery`, 1, {
    upgrade(db) {
      db.createObjectStore("copies", { keyPath: "id", autoIncrement: true });
    },
  });
let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(task: () => Promise<T>) {
  const job = queue.catch(() => undefined).then(task);
  queue = job;
  return job;
}
export function preserveRecovery(state: LocalState): Promise<void> {
  const snapshot = structuredClone(state);
  validateState(snapshot, snapshot.installationRole);
  return serialize(async () => {
    const db = await database(snapshot.installationRole);
    try {
      const tx = db.transaction("copies", "readwrite");
      await tx.store.add({
        schemaVersion: 1,
        savedAt: new Date().toISOString(),
        state: snapshot,
      } satisfies RecoveryCopy);
      const keys = await tx.store.getAllKeys();
      for (const key of keys.slice(0, -3)) await tx.store.delete(key);
      await tx.done;
    } finally {
      db.close();
    }
  });
}
export async function recoveryCopies(role: Role): Promise<RecoveryCopy[]> {
  await queue.catch(() => undefined);
  const db = await database(role);
  try {
    const copies: RecoveryCopy[] = await db.getAll("copies");
    for (const copy of copies) {
      if (
        copy.schemaVersion !== 1 ||
        !Number.isFinite(Date.parse(copy.savedAt))
      )
        throw Error("Invalid recovery copy");
      validateState(copy.state, role);
    }
    return copies.reverse();
  } finally {
    db.close();
  }
}
export function clearRecovery(role: Role): Promise<void> {
  return serialize(async () => {
    const db = await database(role);
    try {
      await db.clear("copies");
    } finally {
      db.close();
    }
  });
}
export function clearRecoveryHistory(role: Role): Promise<void> {
  return serialize(async () => {
    const db = await database(role);
    try {
      const tx = db.transaction("copies", "readwrite");
      const copies = await tx.store.getAll();
      for (const copy of copies)
        await tx.store.put({
          ...copy,
          state: withoutRecordedHistory(copy.state),
        });
      await tx.done;
    } finally {
      db.close();
    }
  });
}
export async function replaceWithRecovery(
  next: LocalState,
  current?: LocalState,
): Promise<void> {
  validateState(next, next.installationRole);
  const previous = current || (await loadState(next.installationRole));
  if (previous.installationRole !== next.installationRole)
    throw Error("Wrong app");
  // A failed checkpoint blocks replacement; the current save is never sacrificed.
  await preserveRecovery(previous);
  await saveState(next);
}
export async function parseBackup(file: File, role: Role): Promise<LocalState> {
  if (file.size > 10_000_000) throw Error("Backup is too large");
  const parsed: unknown = JSON.parse(await file.text());
  validateState(parsed, role);
  return parsed;
}
export const saveCounts = (state: LocalState) => ({
  progress: Object.keys(state.drafts).length,
  creations: state.creations.length,
  activities: state.sessions.length,
});
