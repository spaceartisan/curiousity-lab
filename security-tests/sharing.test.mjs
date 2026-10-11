import { before, after, test } from "node:test";
import { readFile } from "node:fs/promises";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  setDoc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

// Family sharing: Play adds activity, Companion and the owner read it, notes and gifts flow back.
let env;
const owner = "owner_sharing_00001";
const familyId = owner;
const subjectId = "subject_sharing_0001";
const otherFamily = "owner_sharing_00002";
const grant = (role, status = "active", family = familyId) => ({
  schemaVersion: 1,
  familyId: family,
  subjectId,
  role,
  status,
});
const anon = (uid) =>
  env
    .authenticatedContext(uid, { email_verified: false, firebase: { sign_in_provider: "anonymous" } })
    .firestore();
const google = (uid) =>
  env.authenticatedContext(uid, { email_verified: true, firebase: { sign_in_provider: "google.com" } }).firestore();
const mom = () => anon("mom_sharing");
const dad = () => anon("dad_sharing");
const you = () => google(owner);
const record = (id, uid = "mom_sharing", extra = {}) => ({
  v: 1,
  id,
  at: "2026-10-12T15:04:00.000Z",
  seconds: 140,
  tz: "America/New_York",
  app: "0.33.0",
  activity: "bench",
  item: "circling-sheep",
  title: "Ewes walking in circles (Sheep farm)",
  outcome: "correct",
  detail: { tests: 4, organism: "listeria" },
  uid,
  ...extra,
});
const activity = (db, id) => doc(db, "families", familyId, "activity", id);

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-curiosity-lab",
    firestore: { host: "127.0.0.1", port: 8080, rules: await readFile("firebase/firestore.rules", "utf8") },
  });
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "families", familyId), { schemaVersion: 1, ownerUid: owner, subjectId });
    for (const [uid, g] of [
      [owner, grant("insights")],
      ["mom_sharing", grant("play")],
      ["dad_sharing", grant("companion")],
      ["revoked_mom", grant("play", "revoked")],
      ["stranger_play", grant("play", "active", otherFamily)],
      ["stranger_companion", grant("companion", "active", otherFamily)],
    ]) {
      await setDoc(doc(db, "accountDirectory", uid), g);
      await setDoc(doc(db, "families", g.familyId, "members", uid), g);
    }
  });
});
after(async () => {
  if (env) await env.cleanup();
});

test("Play adds its own well-formed activity; an identical retry is harmless", async () => {
  await assertSucceeds(setDoc(activity(mom(), "rec_aaaaaaaa1"), record("rec_aaaaaaaa1")));
  await assertSucceeds(setDoc(activity(mom(), "rec_aaaaaaaa1"), record("rec_aaaaaaaa1")));
});

test("activity can never be changed, misattributed, malformed or written by other roles", async () => {
  await assertFails(setDoc(activity(mom(), "rec_aaaaaaaa1"), record("rec_aaaaaaaa1", "mom_sharing", { outcome: "incorrect" })));
  await assertFails(setDoc(activity(mom(), "rec_bbbbbbbb1"), record("rec_bbbbbbbb1", "dad_sharing")));
  await assertFails(setDoc(activity(mom(), "rec_bbbbbbbb2"), record("rec_bbbbbbbb3")));
  await assertFails(setDoc(activity(mom(), "rec_bbbbbbbb4"), record("rec_bbbbbbbb4", "mom_sharing", { activity: "banking" })));
  await assertFails(setDoc(activity(mom(), "rec_bbbbbbbb5"), record("rec_bbbbbbbb5", "mom_sharing", { email: "x@y.z" })));
  await assertFails(setDoc(activity(mom(), "rec_bbbbbbbb6"), record("rec_bbbbbbbb6", "mom_sharing", { seconds: 999999 })));
  await assertFails(setDoc(activity(dad(), "rec_bbbbbbbb7"), record("rec_bbbbbbbb7", "dad_sharing")));
  await assertFails(setDoc(activity(you(), "rec_bbbbbbbb8"), record("rec_bbbbbbbb8", owner)));
  await assertFails(setDoc(activity(anon("revoked_mom"), "rec_bbbbbbbb9"), record("rec_bbbbbbbb9", "revoked_mom")));
  await assertFails(setDoc(activity(anon("stranger_play"), "rec_bbbbbbbc1"), record("rec_bbbbbbbc1", "stranger_play")));
  await assertFails(deleteDoc(activity(mom(), "rec_aaaaaaaa1")));
  await assertFails(deleteDoc(activity(dad(), "rec_aaaaaaaa1")));
});

test("Companion and the owner read activity; Play, strangers and visitors cannot", async () => {
  await assertSucceeds(getDoc(activity(dad(), "rec_aaaaaaaa1")));
  await assertSucceeds(getDocs(collection(dad(), "families", familyId, "activity")));
  await assertSucceeds(getDocs(collection(you(), "families", familyId, "activity")));
  await assertFails(getDocs(collection(mom(), "families", familyId, "activity")));
  await assertFails(getDocs(collection(anon("stranger_companion"), "families", familyId, "activity")));
  await assertFails(getDocs(collection(env.unauthenticatedContext().firestore(), "families", familyId, "activity")));
  await assertFails(getDocs(collection(google("someone_else"), "families", familyId, "activity")));
});

test("the owner may remove a record", async () => {
  await assertSucceeds(deleteDoc(activity(you(), "rec_aaaaaaaa1")));
});

const note = (id, author, uid, extra = {}) => ({
  v: 1,
  id,
  at: "2026-10-12T20:00:00.000Z",
  author,
  name: author === "companion" ? "Dad" : "Me",
  text: "Good day; she told the story about the dairy lab.",
  uid,
  ...extra,
});
test("Dad and the owner write notes as themselves; Play and strangers cannot read or write them", async () => {
  const n = (db, id) => doc(db, "families", familyId, "notes", id);
  await assertSucceeds(setDoc(n(dad(), "note_dad_0001"), note("note_dad_0001", "companion", "dad_sharing")));
  await assertSucceeds(setDoc(n(you(), "note_you_0001"), note("note_you_0001", "insights", owner)));
  await assertFails(setDoc(n(dad(), "note_dad_0002"), note("note_dad_0002", "insights", "dad_sharing")));
  await assertFails(setDoc(n(mom(), "note_mom_0001"), note("note_mom_0001", "companion", "mom_sharing")));
  await assertFails(setDoc(n(dad(), "note_dad_0001"), note("note_dad_0001", "companion", "dad_sharing", { text: "edited" })));
  await assertSucceeds(getDocs(collection(dad(), "families", familyId, "notes")));
  await assertSucceeds(getDocs(collection(you(), "families", familyId, "notes")));
  await assertFails(getDocs(collection(mom(), "families", familyId, "notes")));
  await assertFails(getDocs(collection(anon("stranger_companion"), "families", familyId, "notes")));
  await assertFails(deleteDoc(n(dad(), "note_you_0001")));
  await assertSucceeds(deleteDoc(n(dad(), "note_dad_0001")));
});

const gift = (id, from, uid, extra = {}) => ({
  v: 1,
  id,
  at: "2026-10-12T20:00:00.000Z",
  from,
  fromName: from === "companion" ? "Dad" : "Will",
  kind: "piece",
  item: "clair-de-lune",
  title: "Clair de lune",
  message: "Thought of you.",
  status: "sent",
  uid,
  ...extra,
});
test("gifts: Dad and the owner send, Play reads and may only mark one opened", async () => {
  const g = (db, id) => doc(db, "families", familyId, "gifts", id);
  await assertSucceeds(setDoc(g(dad(), "gift_dad_0001"), gift("gift_dad_0001", "companion", "dad_sharing")));
  await assertSucceeds(setDoc(g(you(), "gift_you_0001"), gift("gift_you_0001", "insights", owner)));
  await assertFails(setDoc(g(mom(), "gift_mom_0001"), gift("gift_mom_0001", "companion", "mom_sharing")));
  await assertFails(setDoc(g(dad(), "gift_dad_0002"), gift("gift_dad_0002", "companion", "dad_sharing", { status: "opened" })));
  await assertFails(setDoc(g(dad(), "gift_dad_0003"), gift("gift_dad_0003", "companion", "dad_sharing", { kind: "link" })));
  await assertSucceeds(getDocs(collection(mom(), "families", familyId, "gifts")));
  await assertFails(getDocs(collection(anon("stranger_play"), "families", familyId, "gifts")));
  await assertFails(updateDoc(g(mom(), "gift_dad_0001"), { message: "changed" }));
  await assertSucceeds(updateDoc(g(mom(), "gift_dad_0001"), { status: "opened", openedAt: "2026-10-13T09:00:00.000Z" }));
  await assertFails(updateDoc(g(mom(), "gift_dad_0001"), { status: "sent" }));
  await assertFails(updateDoc(g(dad(), "gift_you_0001"), { status: "opened", openedAt: "2026-10-13T09:00:00.000Z" }));
});

test("sharing state: Play turns it on or off; Companion and the owner can see it", async () => {
  const s = (db) => doc(db, "families", familyId, "sharing", "state");
  const state = (on, uid = "mom_sharing") => ({ v: 1, on, at: "2026-10-12T15:00:00.000Z", uid });
  await assertSucceeds(setDoc(s(mom()), state(true)));
  await assertSucceeds(setDoc(s(mom()), state(false)));
  await assertFails(setDoc(s(dad()), state(true, "dad_sharing")));
  await assertFails(setDoc(s(mom()), { ...state(true), note: "x" }));
  await assertFails(setDoc(doc(mom(), "families", familyId, "sharing", "other"), state(true)));
  await assertSucceeds(getDoc(s(dad())));
  await assertSucceeds(getDoc(s(you())));
  await assertFails(getDoc(s(anon("stranger_companion"))));
});

test("legacy subject paths stay closed to every role", async () => {
  for (const db of [mom(), dad(), you()])
    await assertFails(getDocs(collection(db, "families", familyId, "subjects", subjectId, "sessions")));
});
