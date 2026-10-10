import { createHash } from "node:crypto";

export const prefix = "curiosity-backup-";
const day = 86400000;
export function auditOf(release) {
  try {
    const a = JSON.parse(release.body);
    if (
      release.draft ||
      !release.tag_name.startsWith(prefix) ||
      a.format !== 1 ||
      !/^[a-f0-9]{64}$/.test(a.ciphertextSha256) ||
      !/^[a-f0-9]{64}$/.test(a.manifestSha256) ||
      !Number.isFinite(Date.parse(a.createdAt)) ||
      !Number.isSafeInteger(a.bytes) ||
      a.bytes <= 0 ||
      a.tag !== release.tag_name ||
      !release.assets?.some(
        (x) =>
          x.name === "snapshot.age" &&
          x.state === "uploaded" &&
          x.size === a.bytes &&
          x.digest === `sha256:${a.ciphertextSha256}`,
      )
    )
      return null;
    return a;
  } catch {
    return null;
  }
}
export function retentionPlan(releases) {
  const valid = releases
    .filter(auditOf)
    .sort(
      (a, b) =>
        Date.parse(auditOf(b).createdAt) - Date.parse(auditOf(a).createdAt),
    );
  const keep = new Set(valid.slice(0, 12).map((x) => x.id));
  const months = new Set();
  for (const r of valid) {
    const month = new Date(auditOf(r).createdAt).toISOString().slice(0, 7);
    if (!months.has(month) && months.size < 12) {
      months.add(month);
      keep.add(r.id);
    }
  }
  return valid.filter((x) => !keep.has(x.id));
}
export function checkFresh(releases, now = Date.now()) {
  const times = releases
    .map(auditOf)
    .filter(Boolean)
    .map((a) => Date.parse(a.createdAt));
  if (
    !times.length ||
    times.some((t) => t > now + 5 * 60000) ||
    now - Math.max(...times) > 8 * day
  )
    throw Error("Backup missing or stale");
}
export function privateDestination(repo, source) {
  if (
    !repo.private ||
    repo.full_name.toLowerCase() === source.toLowerCase() ||
    repo.archived ||
    repo.disabled
  )
    throw Error("Destination must be a separate writable private repository");
}
export class BackupRemote {
  constructor(repository, token, source, request = fetch) {
    if (
      !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) ||
      !token ||
      !source
    )
      throw Error("Missing backup configuration");
    this.repository = repository;
    this.token = token;
    this.source = source;
    this.request = request;
  }
  async api(path, method = "GET", body, binary = false) {
    const url = path.startsWith("https://")
      ? new URL(path)
      : new URL(`https://api.github.com/repos/${this.repository}${path}`);
    if (
      !["api.github.com", "uploads.github.com"].includes(url.hostname) ||
      url.protocol !== "https:"
    )
      throw Error("Unexpected API host");
    const response = await this.request(url, {
      method,
      redirect: "error",
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": binary
          ? "application/octet-stream"
          : "application/json",
      },
      body:
        body === undefined ? undefined : binary ? body : JSON.stringify(body),
    });
    if (!response.ok) throw Error(`Backup API failed (${response.status})`);
    if (response.status === 204) return null;
    return response.json();
  }
  async inventory() {
    privateDestination(await this.api(""), this.source);
    const result = [];
    for (let page = 1; page <= 100; page++) {
      const batch = await this.api(`/releases?per_page=100&page=${page}`);
      result.push(...batch);
      if (batch.length < 100) return result;
    }
    throw Error("Release inventory too large");
  }
  async publish(ciphertext, createdAt, appVersion, manifestSha256) {
    // Fail before writing if the destination is public or is the source repository.
    const previous = await this.inventory();
    if (
      !/^[a-f0-9]{64}$/.test(manifestSha256) ||
      !Number.isFinite(Date.parse(createdAt)) ||
      ciphertext.length > 100 * 1024 * 1024 ||
      !ciphertext.subarray(0, 22).toString().startsWith("age-encryption.org/v1")
    )
      throw Error("Expected bounded age ciphertext and manifest");
    const tag =
      prefix +
      createdAt.replace(/[^0-9]/g, "") +
      "-" +
      process.env.GITHUB_RUN_ID +
      "-" +
      process.env.GITHUB_RUN_ATTEMPT;
    const audit = {
      format: 1,
      tag,
      createdAt,
      appVersion,
      manifestSha256,
      bytes: ciphertext.length,
      ciphertextSha256: createHash("sha256").update(ciphertext).digest("hex"),
      deleted: [],
    };
    const release = await this.api("/releases", "POST", {
      tag_name: tag,
      name: tag,
      draft: true,
      body: JSON.stringify(audit),
    });
    const asset = await this.api(
      `https://uploads.github.com/repos/${this.repository}/releases/${release.id}/assets?name=snapshot.age`,
      "POST",
      ciphertext,
      true,
    );
    if (
      asset.state !== "uploaded" ||
      asset.size !== audit.bytes ||
      asset.digest !== `sha256:${audit.ciphertextSha256}`
    )
      throw Error(
        "Uploaded ciphertext checksum mismatch; draft retained for inspection",
      );
    const published = await this.api(`/releases/${release.id}`, "PATCH", {
      draft: false,
      body: JSON.stringify(audit),
    });
    if (!auditOf(published)) throw Error("Published audit invalid");
    for (const old of retentionPlan([...previous, published])) {
      // Persist deletion intent first. No automatic deletion of foreign/malformed releases.
      audit.pendingDeletion = { id: old.id, tag: old.tag_name };
      await this.api(`/releases/${release.id}`, "PATCH", {
        body: JSON.stringify(audit),
      });
      await this.api(`/releases/${old.id}`, "DELETE");
      audit.deleted.push(audit.pendingDeletion);
      delete audit.pendingDeletion;
      await this.api(`/releases/${release.id}`, "PATCH", {
        body: JSON.stringify(audit),
      });
    }
    return audit;
  }
}
