import { openDB } from "idb";
import {
  emptyState,
  validateState,
  type LocalState,
  type Role,
} from "./contracts";
const database = (role: Role) =>
  openDB(`curiosity-lab:v1:${role}:guest`, 1, {
    upgrade(db) {
      db.createObjectStore("state");
    },
  });
let queue: Promise<unknown> = Promise.resolve();
export async function loadState(role: Role): Promise<LocalState> {
  const db = await database(role);
  const value = await db.get("state", "current");
  db.close();
  if (!value) return emptyState(role);
  validateState(value, role);
  return value;
}
export function saveState(state: LocalState): Promise<void> {
  const snapshot = structuredClone(state);
  const job = queue
    .catch(() => undefined)
    .then(async () => {
      const db = await database(snapshot.installationRole);
      await db.put("state", snapshot, "current");
      db.close();
    });
  queue = job;
  return job;
}
export async function clearState(role: Role) {
  await queue.catch(() => undefined);
  const db = await database(role);
  await db.clear("state");
  db.close();
}
export function download(
  value: unknown,
  filename: string,
  mime = "application/json",
) {
  const text =
    typeof value === "string" ? value : JSON.stringify(value, null, 2);
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const csvSafe = (value: unknown) =>
  '"' +
  String(value ?? "")
    .replace(/^[\s\x00-\x1f]*[=+@\-]/, "'$&")
    .replaceAll('"', '""') +
  '"';
export function sessionsCsv(state: LocalState): string {
  const keys = [
    "id",
    "game",
    "puzzleId",
    "mode",
    "attempt",
    "startedAt",
    "endedAt",
    "activeMs",
    "hints",
    "undos",
    "outcome",
    "appVersion",
    "contentVersion",
    "source",
    "presentation",
    "timing",
    "clock",
  ] as const;
  return [
    keys.join(","),
    ...state.sessions.map((s) =>
      keys
        .map((k) =>
          csvSafe(
            (k === "presentation" || k === "timing" || k === "clock") && s[k]
              ? JSON.stringify(s[k])
              : s[k],
          ),
        )
        .join(","),
    ),
  ].join("\r\n");
}
