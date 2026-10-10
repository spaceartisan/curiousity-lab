import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { webcrypto } from "node:crypto";
import type { Connection } from "../src/family/contracts";
const harness = vi.hoisted(() => ({
  auth: {
    currentUser: null as null | {
      uid: string;
      emailVerified: boolean;
      isAnonymous: boolean;
    },
  },
  anonymous: vi.fn(),
  read: vi.fn(),
  set: vi.fn(),
  update: vi.fn(),
  write: vi.fn(),
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
  getAuth: () => harness.auth,
  signInAnonymously: harness.anonymous,
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
  getDocFromServer: harness.read,
  setDoc: harness.write,
  Timestamp: { fromMillis: (value: number) => ({ toMillis: () => value }) },
  runTransaction: async (
    _db: unknown,
    callback: (transaction: {
      get: typeof harness.read;
      set: typeof harness.set;
      update: typeof harness.update;
    }) => Promise<void>,
  ) =>
    callback({ get: harness.read, set: harness.set, update: harness.update }),
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
  harness.authChange = null;
  harness.auth.currentUser = null;
  vi.stubGlobal("crypto", webcrypto);
  harness.anonymous.mockImplementation(async () => {
    harness.auth.currentUser = {
      uid: "parent_device_001",
      emailVerified: false,
      isAnonymous: true,
    };
  });
  harness.popup.mockImplementation(async () => {
    harness.auth.currentUser = {
      uid: "owner_synthetic_001",
      emailVerified: true,
      isAnonymous: false,
    };
  });
});
afterEach(() => vi.unstubAllGlobals());
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
    expect(harness.persistence).toHaveBeenLastCalledWith(
      harness.auth,
      "session",
    );
    await client.signIn(true);
    expect(harness.persistence).toHaveBeenLastCalledWith(harness.auth, "local");
    expect(harness.init).toHaveBeenCalledWith(
      expect.anything(),
      "curiosity-lab-play",
    );
    await client.signOut();
    expect(harness.signOut).toHaveBeenCalled();
  });
});

it("anonymous parent identities use the same fresh grant checks without requiring email", async () => {
  const { states } = await setup();
  harness.authChange?.({
    uid: "parent-device",
    emailVerified: false,
    isAnonymous: true,
  });
  const directory = harness.listeners.get("accountDirectory/parent-device")!;
  directory.notify(snapshot(grant));
  harness.listeners
    .get(`families/${grant.familyId}/members/parent-device`)!
    .notify(snapshot(grant));
  expect(states.at(-1)?.status).toBe("approved");
});
it("queued snapshots from an old account or revoked directory cannot restore approval", async () => {
  const { states } = await setup();
  const directory = harness.listeners.get("accountDirectory/mom")!;
  directory.notify(snapshot(grant));
  const member = harness.listeners.get(
    `families/${grant.familyId}/members/mom`,
  )!;
  directory.notify(snapshot({ ...grant, status: "revoked" }));
  member.notify(snapshot(grant));
  expect(states.at(-1)?.status).toBe("revoked");
  harness.authChange?.(null);
  directory.notify(snapshot(grant));
  member.notify(snapshot(grant));
  expect(states.at(-1)?.status).toBe("signed-out");
});

async function pairingClient(role: "play" | "insights" = "play") {
  const { familyClient } = await import("../src/family/client");
  return familyClient(
    {
      apiKey: "synthetic",
      appId: "synthetic",
      projectId: "synthetic",
      authDomain: "synthetic.firebaseapp.com",
    },
    role,
  );
}
it("invalid pasted codes perform no sign-in, persistence change or transaction", async () => {
  const client = await pairingClient();
  await expect(client.connect("123456")).rejects.toThrow("Paste the complete");
  expect(harness.persistence).not.toHaveBeenCalled();
  expect(harness.anonymous).not.toHaveBeenCalled();
  expect(harness.read).not.toHaveBeenCalled();
});
it("code connection persists a hidden identity and commits the exact three scoped writes", async () => {
  const client = await pairingClient();
  harness.read.mockResolvedValueOnce(
    snapshot({
      ...grant,
      role: "play",
      status: "pending",
      expiresAt: { toMillis: () => Date.now() + 3600000 },
    }),
  );
  await client.connect("0".repeat(32));
  expect(harness.persistence).toHaveBeenCalledWith(harness.auth, "local");
  expect(harness.anonymous).toHaveBeenCalledOnce();
  expect(harness.popup).not.toHaveBeenCalled();
  expect(harness.update).toHaveBeenCalledWith(
    expect.stringMatching(/^invitations\/[a-f0-9]{64}$/),
    { status: "claimed", claimedBy: "parent_device_001" },
  );
  expect(harness.set).toHaveBeenCalledTimes(2);
  const writes = harness.set.mock.calls;
  expect(writes[0][0]).toBe("accountDirectory/parent_device_001");
  expect(writes[1][0]).toBe(
    `families/${grant.familyId}/members/parent_device_001`,
  );
  expect(writes[0][1]).toEqual(writes[1][1]);
  expect(writes[0][1]).toMatchObject({
    ...grant,
    invitationHash: expect.stringMatching(/^[a-f0-9]{64}$/),
  });
});
it("a code for the other role cannot create memberships", async () => {
  const client = await pairingClient();
  harness.read.mockResolvedValueOnce(
    snapshot({
      ...grant,
      role: "companion",
      status: "pending",
      expiresAt: { toMillis: () => Date.now() + 3600000 },
    }),
  );
  await expect(client.connect("0".repeat(32))).rejects.toThrow(
    "This code is for Companion",
  );
  expect(harness.set).not.toHaveBeenCalled();
  expect(harness.update).not.toHaveBeenCalled();
});
it("Google owner setup creates their family and matching grants without manual approval", async () => {
  const client = await pairingClient("insights");
  harness.read.mockResolvedValueOnce(snapshot(undefined));
  await client.signIn(true);
  expect(harness.set).toHaveBeenCalledTimes(3);
  const writes = harness.set.mock.calls;
  expect(writes[0][0]).toBe("families/owner_synthetic_001");
  expect(writes[1][0]).toBe("accountDirectory/owner_synthetic_001");
  expect(writes[2][0]).toBe(
    "families/owner_synthetic_001/members/owner_synthetic_001",
  );
  expect(writes[1][1]).toEqual(writes[2][1]);
  expect(writes[1][1]).toMatchObject({
    role: "insights",
    familyId: "owner_synthetic_001",
    status: "active",
  });
});
