import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Connection } from "../src/family/contracts";
const harness = vi.hoisted(() => ({
  authChange: null as null | ((user: unknown) => void),
  listeners: new Map<
    string,
    {
      notify: (value: unknown) => void;
      options: unknown;
      stop: ReturnType<typeof vi.fn>;
    }
  >(),
  persistence: vi.fn(),
  popup: vi.fn(),
  signOut: vi.fn(),
  init: vi.fn(),
}));
vi.mock("firebase/app", () => ({ initializeApp: harness.init }));
vi.mock("firebase/auth", () => ({
  getAuth: () => ({}),
  browserLocalPersistence: "local",
  browserSessionPersistence: "session",
  GoogleAuthProvider: class {
    setCustomParameters() {}
  },
  onAuthStateChanged: (_auth: unknown, callback: (user: unknown) => void) => {
    harness.authChange = callback;
    return vi.fn();
  },
  setPersistence: harness.persistence,
  signInWithPopup: harness.popup,
  signOut: harness.signOut,
}));
vi.mock("firebase/firestore", () => ({
  initializeFirestore: () => ({}),
  memoryLocalCache: () => ({}),
  doc: (_db: unknown, ...path: string[]) => path.join("/"),
  onSnapshot: (
    path: string,
    options: unknown,
    notify: (value: unknown) => void,
  ) => {
    const stop = vi.fn();
    harness.listeners.set(path, { options, notify, stop });
    return stop;
  },
}));
const grant = {
  schemaVersion: 1,
  familyId: "family_synthetic_001",
  subjectId: "subject_synthetic_001",
  role: "play",
  status: "active",
};
const snapshot = (data: unknown, fromCache = false) => ({
  metadata: { fromCache },
  exists: () => data !== undefined,
  data: () => data,
});
async function setup() {
  const { familyClient } = await import("../src/family/client");
  const client = familyClient(
    {
      apiKey: "synthetic",
      appId: "synthetic",
      projectId: "synthetic",
      authDomain: "synthetic.firebaseapp.com",
    },
    "play",
  );
  const states: Connection[] = [];
  const stop = client.watch((state) => states.push(state));
  harness.authChange?.({ uid: "mom", emailVerified: true });
  return { client, states, stop };
}
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  harness.listeners.clear();
});
describe("connection adapter", () => {
  it("requires fresh agreeing directory and membership snapshots", async () => {
    const { states } = await setup();
    const directory = harness.listeners.get("accountDirectory/mom")!;
    expect(directory.options).toEqual({ includeMetadataChanges: true });
    directory.notify(snapshot(grant, true));
    expect(states.at(-1)?.status).toBe("checking");
    expect(harness.listeners.size).toBe(1);
    directory.notify(snapshot(grant));
    const member = harness.listeners.get(
      `families/${grant.familyId}/members/mom`,
    )!;
    member.notify(snapshot(grant, true));
    expect(states.at(-1)?.status).toBe("checking");
    member.notify(snapshot(grant));
    expect(states.at(-1)?.status).toBe("approved");
    expect(
      [...harness.listeners.keys()].some((path) =>
        /subjects|sessions|creations/.test(path),
      ),
    ).toBe(false);
  });
  it("a wrong-role account never opens a membership listener", async () => {
    const { states } = await setup();
    harness.listeners
      .get("accountDirectory/mom")!
      .notify(snapshot({ ...grant, role: "insights" }));
    expect(states.at(-1)?.status).toBe("wrong-role");
    expect(harness.listeners.size).toBe(1);
  });
  it("missing and malformed approvals never enroll the account", async () => {
    const { states } = await setup();
    const listener = harness.listeners.get("accountDirectory/mom")!;
    listener.notify(snapshot(undefined));
    expect(states.at(-1)?.status).toBe("unapproved");
    listener.notify(snapshot({ ...grant, familyId: "123456" }));
    expect(states.at(-1)?.status).toBe("unapproved");
    expect(harness.listeners.size).toBe(1);
  });
  it("revocation clears previously approved UI and closes membership subscription", async () => {
    const { states } = await setup();
    const directory = harness.listeners.get("accountDirectory/mom")!;
    directory.notify(snapshot(grant));
    const member = harness.listeners.get(
      `families/${grant.familyId}/members/mom`,
    )!;
    member.notify(snapshot(grant));
    directory.notify(snapshot({ ...grant, status: "revoked" }));
    expect(member.stop).toHaveBeenCalled();
    expect(states.at(-1)?.status).toBe("revoked");
  });
  it("account change immediately discards approval and unverified accounts do no reads", async () => {
    const { states } = await setup();
    harness.listeners.get("accountDirectory/mom")!.notify(snapshot(grant));
    harness.listeners
      .get(`families/${grant.familyId}/members/mom`)!
      .notify(snapshot(grant));
    const size = harness.listeners.size;
    harness.authChange?.({ uid: "other", emailVerified: false });
    expect(states.at(-1)).toEqual({ status: "unapproved", uid: "other" });
    expect(harness.listeners.size).toBe(size);
    harness.authChange?.(null);
    expect(states.at(-1)).toEqual({ status: "signed-out" });
  });
  it("requires explicit trusted-device choice for persistent login", async () => {
    const { client } = await setup();
    await client.signIn(false);
    expect(harness.persistence).toHaveBeenLastCalledWith({}, "session");
    await client.signIn(true);
    expect(harness.persistence).toHaveBeenLastCalledWith({}, "local");
    expect(harness.init).toHaveBeenCalledWith(
      expect.anything(),
      "curiosity-lab-play",
    );
    await client.signOut();
    expect(harness.signOut).toHaveBeenCalled();
  });
});
