import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const files = [];
async function walk(dir) {
  for (const f of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${f.name}`;
    if (f.isDirectory()) await walk(path);
    else if (f.name !== "sw.js") files.push("/" + path.slice(5));
  }
}
await walk("dist");
files.sort();
const hash = createHash("sha256").update("dareflip-offline-v3");
for (const file of files) {
  hash.update(file);
  hash.update(await readFile(`dist${file}`));
}
const cache = "dareflip-" + hash.digest("hex").slice(0, 12);
// Only public, same-origin build artifacts enter this cache. Their bytes never vary by Origin;
// ignoreVary is necessary because preview servers can add Vary: Origin to module responses.
await writeFile(
  "dist/sw.js",
  `const CACHE=${JSON.stringify(cache)}, FILES=${JSON.stringify(files)};
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('dareflip-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET'||new URL(event.request.url).origin!==self.location.origin)return;event.respondWith(caches.open(CACHE).then(cache=>cache.match(event.request,{ignoreVary:true}).then(cached=>cached||fetch(event.request).catch(()=>event.request.mode==='navigate'?cache.match('/index.html',{ignoreVary:true}):Response.error()))));});
`,
);
console.log(`Offline shell: ${files.length} local files, ${cache}`);
