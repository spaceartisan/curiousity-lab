import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  BackupRemote,
  auditOf,
  checkFresh,
  privateDestination,
  retentionPlan,
  prefix,
} from "../scripts/backup/remote.mjs";
function release(id, date) {
  const tag = prefix + id;
  return {
    id,
    tag_name: tag,
    draft: false,
    body: JSON.stringify({
      format: 1,
      tag,
      createdAt: date,
      ciphertextSha256: "a".repeat(64),
      manifestSha256: "b".repeat(64),
      bytes: 23,
    }),
    assets: [
      {
        name: "snapshot.age",
        state: "uploaded",
        size: 23,
        digest: "sha256:" + "a".repeat(64),
      },
    ],
  };
}
test("retention keeps latest twelve snapshots plus one per latest twelve represented months", () => {
  const recent = Array.from({ length: 15 }, (_, i) =>
    release(i, new Date(Date.UTC(2026, 9, 30 - i)).toISOString()),
  );
  const monthly = Array.from({ length: 14 }, (_, i) =>
    release(100 + i, new Date(Date.UTC(2026, 8 - i, 1)).toISOString()),
  );
  const foreign = { id: 900, tag_name: "unrelated", body: "{}" };
  const invalid = { ...release(901, "2024-01-01T00:00:00.000Z"), draft: true };
  const deleted = retentionPlan([...recent, ...monthly, foreign, invalid]).map(
    (x) => x.id,
  );
  assert.deepEqual(deleted, [12, 13, 14, 111, 112, 113]);
  assert.equal(auditOf(invalid), null);
});
test("missing, stale, future and malformed audit never passes health", () => {
  const now = Date.parse("2026-10-10T12:00:00Z");
  for (const rs of [
    [],
    [release(1, "2026-10-02T11:59:59Z")],
    [release(1, "2026-10-11T12:00:00Z")],
    [release(1, "invalid")],
  ])
    assert.throws(() => checkFresh(rs, now));
  checkFresh([release(1, "2026-10-02T12:00:00Z")], now);
  assert.equal(auditOf({ ...release(1, "2026-10-10"), assets: [] }), null);
  const changed = release(1, "2026-10-10T12:00:00Z");
  changed.assets[0].digest = "sha256:" + "c".repeat(64);
  assert.throws(() => checkFresh([changed], now));
});
test("public, source and archived destinations fail before any upload", () => {
  for (const repo of [
    { private: false, full_name: "owner/private" },
    { private: true, full_name: "OWNER/SOURCE" },
    { private: true, full_name: "owner/private", archived: true },
  ])
    assert.throws(() => privateDestination(repo, "owner/source"));
  privateDestination(
    { private: true, full_name: "owner/private" },
    "owner/source",
  );
});
test("remote only accepts GitHub API hosts and does not follow redirects with credentials", async () => {
  let calls = 0;
  const remote = new BackupRemote(
    "owner/private",
    "fake-test-token",
    "owner/source",
    async (url, opts) => {
      calls++;
      assert.equal(opts.redirect, "error");
      return { ok: true, status: 200, json: async () => [] };
    },
  );
  await assert.rejects(remote.api("https://example.org/steal"));
  assert.equal(calls, 0);
  await remote.api("/releases");
  assert.equal(calls, 1);
});
test("private upload publishes only after matching server checksum, then records deletion intent", async () => {
  const data = Buffer.from("age-encryption.org/v1\nfictional ciphertext");
  const digest = "sha256:" + createHash("sha256").update(data).digest("hex");
  const calls = [];
  let current;
  const remote = new BackupRemote(
    "owner/private",
    "fake-test-token",
    "owner/source",
    async (url, opts) => {
      const path = url.pathname + url.search;
      calls.push({ path, method: opts.method, body: opts.body });
      let value;
      if (path === "/repos/owner/private")
        value = { private: true, full_name: "owner/private" };
      else if (path.includes("?per_page="))
        value = Array.from({ length: 13 }, (_, i) =>
          release(
            i,
            "2026-10-" + String(20 - i).padStart(2, "0") + "T12:00:00.000Z",
          ),
        );
      else if (opts.method === "POST" && path.endsWith("/releases")) {
        current = { id: 99, ...JSON.parse(opts.body), assets: [] };
        value = current;
      } else if (path.includes("/assets?")) {
        value = {
          name: "snapshot.age",
          state: "uploaded",
          size: data.length,
          digest,
        };
        current.assets = [value];
      } else if (opts.method === "PATCH") {
        current = { ...current, ...JSON.parse(opts.body) };
        value = current;
      } else if (opts.method === "DELETE") return { ok: true, status: 204 };
      else throw Error("Unexpected test request");
      return { ok: true, status: 200, json: async () => value };
    },
  );
  const audit = await remote.publish(
    data,
    "2026-10-21T12:00:00.000Z",
    "0.5.0",
    "b".repeat(64),
  );
  assert.deepEqual(
    audit.deleted.map((x) => x.id),
    [11, 12],
  );
  const firstDelete = calls.findIndex((x) => x.method === "DELETE");
  assert.ok(
    calls
      .slice(0, firstDelete)
      .some(
        (x) =>
          x.method === "PATCH" &&
          JSON.parse(JSON.parse(x.body).body || "{}").pendingDeletion,
      ),
  );
  assert.ok(
    calls
      .slice(0, firstDelete)
      .some((x) => x.method === "PATCH" && JSON.parse(x.body).draft === false),
  );
  assert.ok(!JSON.stringify(audit).includes("fake-test-token"));
});
test("wrong upload digest leaves draft and never prunes old archives", async () => {
  const calls = [];
  const remote = new BackupRemote(
    "owner/private",
    "fake-test-token",
    "owner/source",
    async (url, opts) => {
      calls.push(opts.method);
      const value = url.pathname.endsWith("/private")
        ? { private: true, full_name: "owner/private" }
        : url.search.includes("per_page")
          ? []
          : url.search.includes("name=")
            ? { state: "uploaded", size: 24, digest: "wrong" }
            : { id: 99 };
      return { ok: true, status: 200, json: async () => value };
    },
  );
  await assert.rejects(
    remote.publish(
      Buffer.from("age-encryption.org/v1\nabc"),
      "2026-10-10T00:00:00Z",
      "0.5.0",
      "b".repeat(64),
    ),
  );
  assert.ok(!calls.includes("PATCH"));
  assert.ok(!calls.includes("DELETE"));
});
