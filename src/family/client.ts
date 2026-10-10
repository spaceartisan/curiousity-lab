import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  setPersistence,
  signInWithPopup,
  signOut,
  type Auth,
} from "firebase/auth";
import {
  doc,
  initializeFirestore,
  memoryLocalCache,
  onSnapshot,
  type Firestore,
} from "firebase/firestore";
import type { Role } from "../storage/contracts";
import { parseMembership, type Connection, type WebConfig } from "./contracts";

export interface FamilyClient {
  watch: (notify: (connection: Connection) => void) => () => void;
  signIn: (trusted: boolean) => Promise<void>;
  signOut: () => Promise<void>;
}
const clients = new Map<Role, FamilyClient>();
function makeClient(auth: Auth, db: Firestore, role: Role): FamilyClient {
  return {
    watch(notify) {
      let stopDirectory = () => {},
        stopMembership = () => {};
      const stopAuth = onAuthStateChanged(
        auth,
        (user) => {
          // Immediately discard the previous account's approval, before any read.
          stopDirectory();
          stopMembership();
          stopDirectory = () => {};
          stopMembership = () => {};
          notify({ status: user ? "checking" : "signed-out" });
          if (!user) return;
          if (!user.emailVerified) {
            notify({ status: "unapproved", uid: user.uid });
            return;
          }
          stopDirectory = onSnapshot(
            doc(db, "accountDirectory", user.uid),
            { includeMetadataChanges: true },
            (snapshot) => {
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
                  () => notify({ status: "unavailable" }),
                );
              } catch {
                notify({ status: "unapproved", uid: user.uid });
              }
            },
            () => notify({ status: "unavailable" }),
          );
        },
        () => notify({ status: "unavailable" }),
      );
      return () => {
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
    },
    async signOut() {
      await signOut(auth);
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
