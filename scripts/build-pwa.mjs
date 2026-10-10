import {
  readdir,
  readFile,
  writeFile,
  mkdir,
  copyFile,
} from "node:fs/promises";
import { join } from "node:path";
const base = "/curiousity-lab/";
const csp =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self'; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'";
for (const file of [
  "dist/index.html",
  ...["play", "companion", "insights"].map((r) => `dist/${r}/index.html`),
]) {
  const html = await readFile(file, "utf8");
  await writeFile(
    file,
    html.replace(
      "<head>",
      `<head><meta http-equiv="Content-Security-Policy" content="${csp}">`,
    ),
  );
}
const shared = [];
async function walk(path) {
  for (const entry of await readdir(path, { withFileTypes: true })) {
    const p = join(path, entry.name);
    if (entry.isDirectory()) await walk(p);
    else shared.push(base + p.replace(/^dist\//, ""));
  }
}
await walk("dist/assets");
await walk("dist/media");
for (const role of ["play", "companion", "insights"]) {
  const dir = "dist/" + role;
  await mkdir(dir, { recursive: true });
  for (const size of [192, 512])
    await copyFile(
      `public/icons/${role}-${size}.png`,
      `${dir}/icon-${size}.png`,
    );
  const scope = base + role + "/";
  await writeFile(
    dir + "/manifest.webmanifest",
    JSON.stringify(
      {
        name: `Curiosity Lab — ${role[0].toUpperCase() + role.slice(1)}`,
        short_name: `Lab ${role[0].toUpperCase() + role.slice(1)}`,
        id: scope,
        start_url: scope,
        scope,
        display: "standalone",
        background_color: "#f7f5ee",
        theme_color: "#164f48",
        description: "A calm place for puzzles, music, and discovery.",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      null,
      2,
    ),
  );
  const list = [
    scope,
    scope + "index.html",
    scope + "manifest.webmanifest",
    scope + "icon-192.png",
    scope + "icon-512.png",
    ...shared,
  ];
  const hash = (await import("node:crypto")).createHash("sha256");
  for (const url of list) {
    const p = "dist/" + url.slice(base.length);
    hash.update(await readFile(p.endsWith("/") ? p + "index.html" : p));
  }
  const version = hash.digest("hex").slice(0, 12);
  const worker = `const CACHE='curiosity-lab-${role}-${version}';\nconst ASSETS=${JSON.stringify(list)};\nself.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS))));\nself.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();});\nself.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('curiosity-lab-${role}-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));\nself.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin)return;const path=url.pathname;if(event.request.mode==='navigate'&&path.startsWith('${scope}')){event.respondWith(fetch(event.request).catch(()=>caches.open(CACHE).then(cache=>cache.match('${scope}'))));return;}if(ASSETS.includes(path)){event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(path))||fetch(event.request)));}});\n`;
  await writeFile(dir + "/sw.js", worker);
}
console.log("Built three scoped PWA shells.");
