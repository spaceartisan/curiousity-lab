import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const base = "/curiousity-lab/";
for (const role of ["play", "companion", "insights"]) {
  const dir = "dist/" + role;
  const manifest = JSON.parse(
    await readFile(dir + "/manifest.webmanifest", "utf8"),
  );
  for (const key of ["id", "scope", "start_url"])
    assert.equal(manifest[key], base + role + "/");
  assert.equal(manifest.icons.length, 2);
  const html = await readFile(dir + "/index.html", "utf8");
  assert.match(html, /manifest\.webmanifest/);
  assert.match(html, /curiousity-lab\/assets\//);
  const sw = await readFile(dir + "/sw.js", "utf8");
  assert.ok(sw.includes(`curiosity-lab-${role}-`));
  assert.ok(sw.includes("event.request.method"));
  assert.ok(!sw.includes("firestore"));
  for (const other of ["play", "companion", "insights"].filter(
    (x) => x !== role,
  ))
    assert.ok(!sw.includes(base + other + "/"));
  const assets = JSON.parse(sw.match(/const ASSETS=(.*);/)[1]);
  for (const url of assets) {
    assert.ok(url.startsWith(base));
    const p = "dist/" + url.slice(base.length);
    await readFile(p.endsWith("/") ? p + "index.html" : p);
  }
}
const provenance = JSON.parse(
  await readFile("public/media/provenance.json", "utf8"),
);
assert.equal(
  new Set(provenance.map((image) => image.assetId)).size,
  provenance.length,
);
assert.deepEqual(
  (await readdir("dist/media")).filter((f) => f.endsWith(".jpg")).sort(),
  provenance.map((image) => image.file).sort(),
);
function jpegDimensions(bytes) {
  assert.equal(bytes.readUInt16BE(0), 0xffd8);
  let i = 2;
  while (i + 9 < bytes.length) {
    assert.equal(bytes[i], 0xff);
    const marker = bytes[i + 1];
    i += 2;
    if (marker === 0xda || marker === 0xd9) break;
    if (
      marker === 0xd8 ||
      marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7)
    )
      continue;
    const length = bytes.readUInt16BE(i);
    assert.ok(length >= 2 && i + length <= bytes.length);
    if (
      [
        0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce,
        0xcf,
      ].includes(marker)
    )
      return [bytes.readUInt16BE(i + 5), bytes.readUInt16BE(i + 3)];
    i += length;
  }
  throw new Error("No JPEG frame dimensions found");
}
for (const image of provenance) {
  assert.equal(image.canUseForIdentificationQuestion, false);
  assert.deepEqual(image.allowedQuestionIds, []);
  assert.match(
    image.sourceUrl,
    /^https:\/\/wwwn.cdc.gov\/phil\/Details.aspx\?pid=/,
  );
  assert.equal(
    new URL(image.sourceUrl).searchParams.get("pid"),
    image.sourceImageId,
  );
  assert.match(image.licenseReviewedAtUtc, /^\d{4}-\d{2}-\d{2}$/);
  const bytes = await readFile("dist/media/" + image.file);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), image.sha256);
  assert.deepEqual(jpegDimensions(bytes), image.pixelDimensions);
  const sw = await readFile("dist/play/sw.js", "utf8");
  assert.ok(
    JSON.parse(sw.match(/const ASSETS=(.*);/)[1]).includes(
      base + "media/" + image.file,
    ),
  );
}
console.log(
  "Validated entry points, distinct PWA identities, isolated static caches, precache files, and image provenance.",
);
