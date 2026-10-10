import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
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
assert.equal(
  (await readdir("dist/media")).filter((f) => f.endsWith(".jpg")).length,
  2,
);
const provenance = JSON.parse(
  await readFile("public/media/provenance.json", "utf8"),
);
for (const image of provenance) {
  assert.equal(image.canUseForIdentificationQuestion, false);
  assert.ok(image.sha256);
  assert.match(
    image.sourceUrl,
    /^https:\/\/wwwn.cdc.gov\/phil\/Details.aspx\?pid=/,
  );
  assert.equal(image.licenseReviewedAtUtc, "2026-10-10");
}
console.log(
  "Validated entry points, distinct PWA identities, isolated static caches, precache files, and image provenance.",
);
