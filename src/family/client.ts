import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signInAnonymously,
  signOut,
  type Auth,
} from "firebase/auth";
import {
  doc,
  collection,
  getDocFromServer,
  runTransaction,
  setDoc,
  writeBatch,
  Timestamp,
  initializeFirestore,
  memoryLocalCache,
  onSnapshot,
  query,
  orderBy,
  limit,
  updateDoc,
  type Firestore,
} from "firebase/firestore";
import {
  createCode,
  hashCode,
  invitationLink,
  type ParentRole,
  type Invitation,
  type FamilyDevice,
} from "./invitations";
import type { Role } from "../storage/contracts";
import { validRecord, type ActivityRecord } from "../activity/records";
import {
  validGift,
  validNote,
  type FamilyNote,
  type Gift,
  type SharingState,
} from "../activity/family-data";
import { parseMembership, type Connection, type WebConfig } from "./contracts";

export interface FamilyClient {
  watch: (notify: (connection: Connection) => void) => () => void;
  signIn: (trusted: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  createInvitation: (role: ParentRole) => Promise<Invitation>;
  connect: (code: string) => Promise<void>;
  watchDevices: (
    familyId: string,
    notify: (devices: FamilyDevice[]) => void,
    fail: () => void,
  ) => () => void;
  revokeDevice: (familyId: string, uid: string) => Promise<void>;
  cancelInvitation: (hash: string) => Promise<void>;
  /** Play: copy finished activity to the family. Returns the ids confirmed. */
  uploadActivity: (
    familyId: string,
    records: ActivityRecord[],
  ) => Promise<string[]>;
  setSharing: (familyId: string, on: boolean) => Promise<void>;
  watchSharing: (
    familyId: string,
    notify: (s: SharingState | null) => void,
    fail: () => void,
  ) => () => void;
  watchActivity: (
    familyId: string,
    notify: (r: ActivityRecord[]) => void,
    fail: () => void,
  ) => () => void;
  addNote: (familyId: string, note: FamilyNote) => Promise<void>;
  watchNotes: (
    familyId: string,
    notify: (n: FamilyNote[]) => void,
    fail: () => void,
  ) => () => void;
  sendGift: (familyId: string, gift: Gift) => Promise<void>;
  watchGifts: (
    familyId: string,
    notify: (g: Gift[]) => void,
    fail: () => void,
  ) => () => void;
  openGift: (familyId: string, giftId: string) => Promise<void>;
}
const clients = new Map<Role, FamilyClient>();
function makeClient(auth: Auth, db: Firestore, role: Role): FamilyClient {
  async function ownerGrant() {
    const user = auth.currentUser;
    if (!user?.emailVerified || user.isAnonymous || role !== "insights")
      throw Error("Sign in with Google first.");
    const snapshot = await getDocFromServer(
      doc(db, "accountDirectory", user.uid),
    );
    const grant = parseMembership(snapshot.data());
    if (grant.role !== "insights" || grant.status !== "active")
      throw Error("Your family connection is not active.");
    return grant;
  }
  async function ensureOwner() {
    const user = auth.currentUser;
    if (!user?.emailVerified || user.isAnonymous)
      throw Error("Use your Google account for family setup.");
    const directory = doc(db, "accountDirectory", user.uid);
    await runTransaction(db, async (transaction) => {
      const existing = await transaction.get(directory);
      if (existing.exists()) {
        const grant = parseMembership(existing.data());
        if (grant.role !== "insights" || grant.status !== "active")
          throw Error("This account is already assigned to another app.");
        return;
      }
      const grant = {
        schemaVersion: 1,
        familyId: user.uid,
        subjectId: `${user.uid}_subject`,
        role: "insights",
        status: "active",
      };
      transaction.set(doc(db, "families", user.uid), {
        schemaVersion: 1,
        ownerUid: user.uid,
        subjectId: grant.subjectId,
      });
      transaction.set(directory, grant);
      transaction.set(
        doc(db, "families", user.uid, "members", user.uid),
        grant,
      );
    });
  }
  return {
    watch(notify) {
      let authGeneration = 0,
        directoryGeneration = 0;
      let stopDirectory = () => {},
        stopMembership = () => {};
      const stopAuth = onAuthStateChanged(
        auth,
        (user) => {
          const generation = ++authGeneration;
          // Immediately discard the previous account's approval, before any read.
          stopDirectory();
          stopMembership();
          stopDirectory = () => {};
          stopMembership = () => {};
          notify({ status: user ? "checking" : "signed-out" });
          if (!user) return;
          if (
            !user.emailVerified &&
            !(user.isAnonymous && role !== "insights")
          ) {
            notify({ status: "unapproved", uid: user.uid });
            return;
          }
          stopDirectory = onSnapshot(
            doc(db, "accountDirectory", user.uid),
            { includeMetadataChanges: true },
            (snapshot) => {
              if (generation !== authGeneration) return;
              const directoryVersion = ++directoryGeneration;
              stopMembership();
              stopMembership = () => {};
              // Cached snapshots never certify access, including after revocation.
              notify({ status: "checking" });
              if (snapshot.metadata.fromCache) return;
              if (!snapshot.exists()) {
                notify({ status: "unapproved", uid: user.uid });
                return;
              }
              try {
                const directory = parseMembership(snapshot.data());
                if (directory.status === "revoked") {
                  notify({ status: "revoked", uid: user.uid });
                  return;
                }
                if (directory.role !== role) {
                  notify({ status: "wrong-role", uid: user.uid });
                  return;
                }
                stopMembership = onSnapshot(
                  doc(db, "families", directory.familyId, "members", user.uid),
                  { includeMetadataChanges: true },
                  (member) => {
                    if (
                      generation !== authGeneration ||
                      directoryVersion !== directoryGeneration
                    )
                      return;
                    if (member.metadata.fromCache) {
                      notify({ status: "checking" });
                      return;
                    }
                    try {
                      const grant = parseMembership(member.data());
                      if (grant.status === "revoked") {
                        notify({ status: "revoked", uid: user.uid });
                        return;
                      }
                      if (
                        grant.role !== role ||
                        grant.familyId !== directory.familyId ||
                        grant.subjectId !== directory.subjectId
                      )
                        throw Error("Grant mismatch");
                      notify({
                        status: "approved",
                        uid: user.uid,
                        membership: grant,
                      });
                    } catch {
                      notify({ status: "unapproved", uid: user.uid });
                    }
                  },
                  () => {
                    if (
                      generation === authGeneration &&
                      directoryVersion === directoryGeneration
                    )
                      notify({ status: "unavailable" });
                  },
                );
              } catch {
                notify({ status: "unapproved", uid: user.uid });
              }
            },
            () => {
              if (generation === authGeneration)
                notify({ status: "unavailable" });
            },
          );
        },
        () => notify({ status: "unavailable" }),
      );
      return () => {
        authGeneration++;
        stopAuth();
        stopDirectory();
        stopMembership();
      };
    },
    async signIn(trusted) {
      await setPersistence(
        auth,
        trusted ? browserLocalPersistence : browserSessionPersistence,
      );
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      await signInWithPopup(auth, provider);
      if (role === "insights") await ensureOwner();
    },
    async createInvitation(parentRole) {
      const grant = await ownerGrant();
      const code = createCode(),
        hash = await hashCode(code),
        expiresAt = Date.now() + 23 * 60 * 60 * 1000;
      await setDoc(doc(db, "invitations", hash), {
        schemaVersion: 1,
        familyId: grant.familyId,
        subjectId: grant.subjectId,
        role: parentRole,
        status: "pending",
        claimedBy: "",
        expiresAt: Timestamp.fromMillis(expiresAt),
      });
      return {
        code,
        hash,
        role: parentRole,
        expiresAt,
        link: invitationLink(parentRole, code),
      };
    },
    async connect(code) {
      if (role === "insights") throw Error("Use Google to manage your family.");
      const hash = await hashCode(code);
      await setPersistence(auth, browserLocalPersistence);
      if (auth.currentUser && !auth.currentUser.isAnonymous)
        throw Error("Disconnect this account before using a connection code.");
      if (!auth.currentUser) await signInAnonymously(auth);
      const uid = auth.currentUser!.uid;
      await runTransaction(db, async (transaction) => {
        const invitation = doc(db, "invitations", hash);
        const snapshot = await transaction.get(invitation);
        if (!snapshot.exists()) throw Error("Ask for a new connection code.");
        const invite = snapshot.data();
        if (invite.role !== role)
          throw Error(
            `This code is for ${invite.role === "play" ? "Play" : "Companion"}. Open that app to connect.`,
          );
        if (
          invite.status !== "pending" ||
          invite.expiresAt.toMillis() <= Date.now()
        )
          throw Error("Ask for a new connection code.");
        const grant = {
          schemaVersion: 1,
          familyId: invite.familyId,
          subjectId: invite.subjectId,
          role,
          status: "active",
          invitationHash: hash,
        };
        // The rules require all three writes together and reject any second claimant.
        transaction.update(invitation, { status: "claimed", claimedBy: uid });
        transaction.set(doc(db, "accountDirectory", uid), grant);
        transaction.set(
          doc(db, "families", invite.familyId, "members", uid),
          grant,
        );
      });
    },
    watchDevices(familyId, notify, fail) {
      return onSnapshot(
        collection(db, "families", familyId, "members"),
        { includeMetadataChanges: true },
        (snapshot) => {
          if (snapshot.metadata.fromCache) return;
          try {
            notify(
              snapshot.docs.map((member) => ({
                uid: member.id,
                ...parseMembership(member.data()),
              })),
            );
          } catch {
            fail();
          }
        },
        fail,
      );
    },
    async revokeDevice(familyId, uid) {
      const grant = await ownerGrant();
      if (grant.familyId !== familyId || uid === auth.currentUser!.uid)
        throw Error("Choose a parent device.");
      const ref = doc(db, "families", familyId, "members", uid);
      const snapshot = await getDocFromServer(ref);
      if (!snapshot.exists() || snapshot.data().role === "insights")
        throw Error("Choose a parent device.");
      const batch = writeBatch(db);
      batch.update(ref, { status: "revoked" });
      batch.update(doc(db, "accountDirectory", uid), { status: "revoked" });
      await batch.commit();
    },
    async cancelInvitation(hash) {
      await ownerGrant();
      const batch = writeBatch(db);
      batch.update(doc(db, "invitations", hash), { status: "revoked" });
      await batch.commit();
    },
    async signOut() {
      await signOut(auth);
    },
    async uploadActivity(familyId, records) {
      const uid = auth.currentUser?.uid;
      if (!uid) throw Error("Not connected");
      const done: string[] = [];
      for (const r of records) {
        if (!validRecord(r)) continue;
        // Same id, same content: a retry after a lost acknowledgement is harmless.
        // Firestore rejects undefined fields, so drop them first.
        const clean = JSON.parse(JSON.stringify(r)) as ActivityRecord;
        await setDoc(doc(db, "families", familyId, "activity", r.id), {
          ...clean,
          uid,
        });
        done.push(r.id);
      }
      return done;
    },
    async setSharing(familyId, on) {
      const uid = auth.currentUser?.uid;
      if (!uid) throw Error("Not connected");
      await setDoc(doc(db, "families", familyId, "sharing", "state"), {
        v: 1,
        on,
        at: new Date().toISOString(),
        uid,
      });
    },
    watchSharing(familyId, notify, fail) {
      return onSnapshot(
        doc(db, "families", familyId, "sharing", "state"),
        (snap) => notify(snap.exists() ? (snap.data() as SharingState) : null),
        fail,
      );
    },
    watchActivity(familyId, notify, fail) {
      return onSnapshot(
        query(
          collection(db, "families", familyId, "activity"),
          orderBy("at"),
          limit(10000),
        ),
        (snap) =>
          notify(
            snap.docs
              .map((d) => d.data())
              .filter(validRecord) as ActivityRecord[],
          ),
        fail,
      );
    },
    async addNote(familyId, note) {
      const uid = auth.currentUser?.uid;
      if (!uid) throw Error("Not connected");
      await setDoc(doc(db, "families", familyId, "notes", note.id), {
        ...note,
        uid,
      });
    },
    watchNotes(familyId, notify, fail) {
      return onSnapshot(
        query(
          collection(db, "families", familyId, "notes"),
          orderBy("at"),
          limit(2000),
        ),
        (snap) =>
          notify(
            snap.docs.map((d) => d.data()).filter(validNote) as FamilyNote[],
          ),
        fail,
      );
    },
    async sendGift(familyId, gift) {
      const uid = auth.currentUser?.uid;
      if (!uid) throw Error("Not connected");
      await setDoc(doc(db, "families", familyId, "gifts", gift.id), {
        ...gift,
        uid,
      });
    },
    watchGifts(familyId, notify, fail) {
      return onSnapshot(
        query(
          collection(db, "families", familyId, "gifts"),
          orderBy("at"),
          limit(500),
        ),
        (snap) =>
          notify(snap.docs.map((d) => d.data()).filter(validGift) as Gift[]),
        fail,
      );
    },
    async openGift(familyId, giftId) {
      await updateDoc(doc(db, "families", familyId, "gifts", giftId), {
        status: "opened",
        openedAt: new Date().toISOString(),
      });
    },
  };
}
export function familyClient(config: WebConfig, role: Role): FamilyClient {
  const existing = clients.get(role);
  if (existing) return existing;
  // Named apps give each installed role its own Firebase Auth persistence key.
  const app = initializeApp(config, `curiosity-lab-${role}`);
  const db = initializeFirestore(app, { localCache: memoryLocalCache() });
  const client = makeClient(getAuth(app), db, role);
  clients.set(role, client);
  return client;
}
