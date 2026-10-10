import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { spawnSync } from "node:child_process";
import {
  Timestamp,
  GeoPoint,
  DocumentReference,
} from "firebase-admin/firestore";
export const FORMAT_VERSION = 1;
const fail = () => {
  throw Error("Invalid backup archive");
};
export function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  return (
    "{" +
    Object.keys(value)
      .sort()
      .map((key) => JSON.stringify(key) + ":" + canonical(value[key]))
      .join(",") +
    "}"
  );
}
const hash = (value) =>
  createHash("sha256")
    .update(typeof value === "string" ? value : canonical(value))
    .digest("hex");
export function encode(value, projectId) {
  if (value === null) return { type: "null" };
  if (typeof value === "string" || typeof value === "boolean")
    return { type: typeof value, value };
  if (typeof value === "number")
    return {
      type: "number",
      value: Number.isFinite(value)
        ? Object.is(value, -0)
          ? "-0"
          : value
        : String(value),
    };
  if (value instanceof Timestamp)
    return {
      type: "timestamp",
      seconds: value.seconds,
      nanoseconds: value.nanoseconds,
    };
  if (value instanceof GeoPoint)
    return {
      type: "geopoint",
      latitude: value.latitude,
      longitude: value.longitude,
    };
  if (value instanceof DocumentReference) {
    if (
      projectId &&
      (value.firestore.projectId !== projectId ||
        value.firestore.databaseId !== "(default)")
    )
      return fail();
    return { type: "reference", path: value.path };
  }
  if (Buffer.isBuffer(value))
    return { type: "bytes", value: value.toString("base64") };
  if (Array.isArray(value))
    return {
      type: "array",
      value: value.map((item) => encode(item, projectId)),
    };
  if (value && Object.getPrototypeOf(value) === Object.prototype)
    return {
      type: "map",
      value: Object.fromEntries(
        Object.entries(value).map(([key, item]) => [
          key,
          encode(item, projectId),
        ]),
      ),
    };
  return fail();
}
const documentPath = (path) =>
  typeof path === "string" &&
  path.length <= 6144 &&
  path.split("/").length % 2 === 0 &&
  path
    .split("/")
    .every((segment) => segment && segment !== "." && segment !== "..");
export function decode(node, reference = (path) => path) {
  if (!node || typeof node !== "object") return fail();
  switch (node.type) {
    case "null":
      return null;
    case "string":
      if (typeof node.value !== "string") return fail();
      return node.value;
    case "boolean":
      if (typeof node.value !== "boolean") return fail();
      return node.value;
    case "number":
      if (typeof node.value === "number" && Number.isFinite(node.value))
        return node.value;
      if (["NaN", "Infinity", "-Infinity", "-0"].includes(node.value))
        return Number(node.value);
      return fail();
    case "timestamp":
      if (
        !Number.isInteger(node.seconds) ||
        !Number.isInteger(node.nanoseconds)
      )
        return fail();
      return new Timestamp(node.seconds, node.nanoseconds);
    case "geopoint":
      return new GeoPoint(node.latitude, node.longitude);
    case "reference":
      if (!documentPath(node.path)) return fail();
      return reference(node.path);
    case "bytes":
      if (
        typeof node.value !== "string" ||
        Buffer.from(node.value, "base64").toString("base64") !== node.value
      )
        return fail();
      return Buffer.from(node.value, "base64");
    case "array":
      if (!Array.isArray(node.value)) return fail();
      return node.value.map((item) => decode(item, reference));
    case "map":
      if (
        !node.value ||
        typeof node.value !== "object" ||
        Array.isArray(node.value)
      )
        return fail();
      return Object.fromEntries(
        Object.entries(node.value).map(([key, item]) => [
          key,
          decode(item, reference),
        ]),
      );
    default:
      return fail();
  }
}
function inventory(records) {
  const collections = Object.create(null),
    schemaVersions = Object.create(null),
    appVersions = new Set(),
    contentVersions = new Set();
  const paths = new Set();
  for (const record of records) {
    if (
      !documentPath(record.path) ||
      paths.has(record.path) ||
      record.data?.type !== "map"
    )
      return fail();
    paths.add(record.path);
    const data = decode(record.data),
      collection = record.path.split("/").slice(0, -1).join("/");
    collections[collection] = (collections[collection] || 0) + 1;
    if (data.schemaVersion !== undefined) {
      if (!Number.isInteger(data.schemaVersion) || data.schemaVersion < 1)
        return fail();
      schemaVersions[data.schemaVersion] =
        (schemaVersions[data.schemaVersion] || 0) + 1;
    }
    if (data.appVersion !== undefined) {
      if (typeof data.appVersion !== "string") return fail();
      appVersions.add(data.appVersion);
    }
    if (data.contentVersion !== undefined) {
      if (typeof data.contentVersion !== "string") return fail();
      contentVersions.add(data.contentVersion);
    }
  }
  // Directory grants must agree with the independently exported membership.
  const byPath = new Map(
    records.map((record) => [record.path, decode(record.data)]),
  );
  for (const [path, grant] of byPath)
    if (path.startsWith("accountDirectory/") && path.split("/").length === 2) {
      const member = byPath.get(
        `families/${grant.familyId}/members/${path.split("/")[1]}`,
      );
      if (
        !member ||
        !byPath.has(`families/${grant.familyId}`) ||
        !["familyId", "subjectId", "role", "status"].every(
          (key) => member[key] === grant[key],
        )
      )
        return fail();
    }
  return {
    documentCount: records.length,
    collections,
    schemaVersions,
    appVersions: [...appVersions].sort(),
    contentVersions: [...contentVersions].sort(),
  };
}
export function createArchive(records, metadata) {
  if (
    !metadata ||
    typeof metadata.projectId !== "string" ||
    !metadata.projectId ||
    typeof metadata.appVersion !== "string" ||
    !Number.isFinite(Date.parse(metadata.createdAt))
  )
    return fail();
  const ordered = records.toSorted((a, b) => a.path.localeCompare(b.path));
  const manifest = {
    formatVersion: FORMAT_VERSION,
    backupJobVersion: "0.5.0",
    projectId: metadata.projectId,
    databaseId: "(default)",
    createdAt: metadata.createdAt,
    appVersion: metadata.appVersion,
    consistency: metadata.consistency || "synthetic-fixture",
    ...inventory(ordered),
    recordsSha256: hash(ordered),
  };
  return { manifest, records: ordered, manifestSha256: hash(manifest) };
}
export function validateArchive(archive) {
  if (
    !archive ||
    archive.manifest?.formatVersion !== FORMAT_VERSION ||
    archive.manifest.databaseId !== "(default)" ||
    typeof archive.manifest.appVersion !== "string" ||
    typeof archive.manifest.backupJobVersion !== "string" ||
    !Array.isArray(archive.records) ||
    archive.records.length > 10000 ||
    hash(archive.manifest) !== archive.manifestSha256 ||
    hash(archive.records) !== archive.manifest.recordsSha256 ||
    !Number.isFinite(Date.parse(archive.manifest.createdAt)) ||
    typeof archive.manifest.projectId !== "string" ||
    !archive.manifest.projectId
  )
    return fail();
  const actual = inventory(archive.records);
  for (const [key, value] of Object.entries(actual))
    if (canonical(value) !== canonical(archive.manifest[key])) return fail();
  return archive;
}
export function packArchive(archive) {
  validateArchive(archive);
  return gzipSync(Buffer.from(canonical(archive)), { level: 9 });
}
export function unpackArchive(bytes) {
  if (bytes.length > 100_000_000) return fail();
  return validateArchive(
    JSON.parse(
      gunzipSync(bytes, { maxOutputLength: 100_000_000 }).toString("utf8"),
    ),
  );
}
function age(args, input) {
  const result = spawnSync(process.env.CURIOSITY_AGE_BINARY || "age", args, {
    input,
    maxBuffer: 110_000_000,
  });
  if (result.status !== 0 || result.error)
    throw Error("Encryption or decryption failed");
  return result.stdout;
}
export const encryptArchive = (archive, recipient) => {
  if (typeof recipient !== "string" || !/^age1[0-9a-z]{58}$/.test(recipient))
    throw Error("Use an age X25519 public recipient");
  return age(["--encrypt", "--recipient", recipient], packArchive(archive));
};
export const decryptArchive = (bytes, identityPath) =>
  unpackArchive(age(["--decrypt", "--identity", identityPath], bytes));
