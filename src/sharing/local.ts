import { openDB, deleteDB } from "idb";
import { validPresentation } from "../storage/presentation";
import type { Session } from "../storage/contracts";
import type { FamilyContext } from "../family/useFamilyConnection";
export interface SharingScope {
  projectId: string;
  uid: string;
  familyId: string;
  subjectId: string;
  role: "play";
}
export interface SharingChoices {
  insights: boolean;
  companion: boolean;
  future: boolean;
  trusted: boolean;
}
export interface SharingPlan {
  schemaVersion: 1;
  scope: SharingScope;
  choices: SharingChoices;
  futureSince: string;
}
export interface PreparedRecord {
  schemaVersion: 1;
  scope: SharingScope;
  id: string;
  channel: "insights" | "companion";
  selectedAt: string;
  selection: "explicit-history" | "future";
  // Companion payload deliberately excludes quantitative metrics and raw notes.
  payload:
    | Session
    | { game: Session["game"]; outcome: Session["outcome"]; endedAt: string };
}
export function sharingScope(context: FamilyContext): SharingScope | null {
  const c = context.connection;
  if (
    !context.projectId ||
    c.status !== "approved" ||
    c.membership.role !== "play" ||
    c.membership.status !== "active"
  )
    return null;
  return {
    projectId: context.projectId,
    uid: c.uid,
    familyId: c.membership.familyId,
    subjectId: c.membership.subjectId,
    role: "play",
  };
}
export const scopeKey = (scope: SharingScope) =>
  JSON.stringify([
    scope.projectId,
    scope.uid,
    scope.familyId,
    scope.subjectId,
    scope.role,
  ]);
const prefix = "curiosity-lab:v1:sharing:";
const registry = () =>
  openDB("curiosity-lab:v1:sharing-index", 1, {
    upgrade(db) {
      db.createObjectStore("scopes");
    },
  });
async function database(scope: SharingScope) {
  const index = await registry();
  try {
    await index.put("scopes", scopeKey(scope), scopeKey(scope));
  } finally {
    index.close();
  }
  return openDB(prefix + scopeKey(scope), 1, {
    upgrade(db) {
      db.createObjectStore("plan");
      db.createObjectStore("pending", { keyPath: "id" });
    },
  });
}
let queue: Promise<unknown> = Promise.resolve();
function serialize<T>(task: () => Promise<T>): Promise<T> {
  const job = queue.catch(() => undefined).then(task);
  queue = job;
  return job.then((result) => {
    if (typeof window !== "undefined")
      window.dispatchEvent(new Event("curiosity-preparation-changed"));
    return result;
  });
}
function sessionPayload(session: Session): Session {
  // Copy only defined summary fields, never arbitrary imported properties.
  const {
    id,
    schemaVersion,
    appVersion,
    contentVersion,
    game,
    puzzleId,
    startedAt,
    endedAt,
    activeMs,
    hints,
    undos,
    outcome,
    mode,
    attempt,
    source,
    presentation,
  } = session;
  return {
    id,
    schemaVersion,
    appVersion,
    contentVersion,
    game,
    puzzleId,
    startedAt,
    endedAt,
    activeMs,
    hints,
    undos,
    outcome,
    mode,
    attempt,
    source,
    ...(presentation && validPresentation(presentation, game)
      ? { presentation: structuredClone(presentation) }
      : {}),
  };
}
export async function readPreparation(
  scope: SharingScope,
): Promise<{ plan: SharingPlan | null; records: PreparedRecord[] }> {
  await queue.catch(() => undefined);
  const db = await database(scope);
  try {
    return {
      plan: (await db.get("plan", "current")) || null,
      records: await db.getAll("pending"),
    };
  } finally {
    db.close();
  }
}
export function saveChoices(
  scope: SharingScope,
  choices: SharingChoices,
): Promise<void> {
  return serialize(async () => {
    if (
      (choices.insights || choices.companion || choices.future) &&
      !choices.trusted
    )
      throw Error("Choose a personal device before preparing records.");
    const db = await database(scope);
    try {
      const tx = db.transaction(["plan", "pending"], "readwrite");
      await tx.objectStore("plan").put(
        {
          schemaVersion: 1,
          scope,
          choices,
          futureSince: new Date().toISOString(),
        } satisfies SharingPlan,
        "current",
      );
      const records: PreparedRecord[] = await tx
        .objectStore("pending")
        .getAll();
      for (const record of records)
        if (!choices.trusted || !choices[record.channel])
          await tx.objectStore("pending").delete(record.id);
      await tx.done;
    } finally {
      db.close();
    }
  });
}
export function prepareSessions(
  scope: SharingScope,
  sessions: Session[],
  selection: PreparedRecord["selection"],
): Promise<void> {
  return serialize(async () => {
    const db = await database(scope);
    try {
      const tx = db.transaction(["plan", "pending"], "readwrite"),
        pending = tx.objectStore("pending");
      const plan = (await tx.objectStore("plan").get("current")) as
        SharingPlan | undefined;
      if (
        !plan?.choices.trusted ||
        (selection === "future" && !plan.choices.future)
      ) {
        await tx.done;
        return;
      }
      if (scopeKey(plan.scope) !== scopeKey(scope))
        throw Error("Account scope mismatch");
      for (const session of sessions) {
        if (
          session.outcome === "unfinished" ||
          (selection === "future" &&
            (!Number.isFinite(Date.parse(session.startedAt)) ||
              Date.parse(session.startedAt) < Date.parse(plan.futureSince)))
        )
          continue;
        for (const channel of ["insights", "companion"] as const) {
          if (!plan.choices[channel]) continue;
          const id = JSON.stringify([session.id, channel]);
          if (await pending.get(id)) continue;
          const record: PreparedRecord = {
            schemaVersion: 1,
            scope,
            id,
            channel,
            selection,
            selectedAt: new Date().toISOString(),
            payload:
              channel === "insights"
                ? sessionPayload(session)
                : {
                    game: session.game,
                    outcome: session.outcome,
                    endedAt: session.endedAt,
                  },
          };
          await pending.add(record);
        }
      }
      await tx.done;
    } finally {
      db.close();
    }
  });
}
export function stopPreparation(scope: SharingScope): Promise<void> {
  return serialize(async () => {
    const db = await database(scope);
    try {
      const tx = db.transaction(["plan", "pending"], "readwrite");
      await tx.objectStore("plan").clear();
      await tx.objectStore("pending").clear();
      await tx.done;
    } finally {
      db.close();
    }
  });
}
// No network adapter or automatic upload exists here. A later release must
// obtain a fresh affirmative sharing choice after backup/restore acceptance.

export function clearAllPreparations(): Promise<void> {
  return serialize(async () => {
    const index = await registry();
    try {
      const keys: string[] = await index.getAll("scopes");
      for (const key of keys) await deleteDB(prefix + key);
      await index.clear("scopes");
    } finally {
      index.close();
    }
  });
}
