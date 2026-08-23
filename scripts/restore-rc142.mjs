import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const pairs = [
  ['packed/index.html.gz', 'index.html'],
  ['packed/api-app.js.gz', 'api/app.js'],
  ['packed/hrai-pipeline.mjs.gz', 'worker/hrai-pipeline.mjs'],
  ['packed/worker-server.mjs.gz', 'worker/worker-server.mjs'],
];

for (const [src, dst] of pairs) {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.writeFileSync(dst, zlib.gunzipSync(fs.readFileSync(src)));
}

const assetDir = 'assets/guest-presets';
fs.mkdirSync(assetDir, { recursive: true });
for (let i = 0; i < 10; i++) {
  const name = `guest-${String(i).padStart(2, '0')}.webp`;
  const url = `https://hurricane-radio-ai.vercel.app/assets/guest-presets/${name}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ASSET_FETCH_FAILED ${name}: ${res.status}`);
  fs.writeFileSync(path.join(assetDir, name), Buffer.from(await res.arrayBuffer()));
}

console.log('RC14.2 source and guest presets restored.');
