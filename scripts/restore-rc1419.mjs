import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, '.bootstrap-rc1419.json'), 'utf8'));
const pairs = [
  ['packed-rc1419/index.html.gz', 'index.html'],
  ['packed-rc1419/api-app.js.gz', 'api/app.js'],
  ['packed-rc1419/hrai-pipeline.mjs.gz', 'worker/hrai-pipeline.mjs'],
  ['packed-rc1419/worker-server.mjs.gz', 'worker/worker-server.mjs'],
];

for (const [src, dst] of pairs) {
  const srcPath = path.join(root, src);
  const dstPath = path.join(root, dst);
  fs.mkdirSync(path.dirname(dstPath), { recursive: true });
  const raw = zlib.gunzipSync(fs.readFileSync(srcPath));
  const sha = crypto.createHash('sha256').update(raw).digest('hex');
  const expected = manifest.files[dst];
  if (!expected || sha !== expected) {
    throw new Error(`RC14.19_BOOTSTRAP_HASH_MISMATCH ${dst} expected=${expected} actual=${sha}`);
  }
  fs.writeFileSync(dstPath, raw);
  console.log(`restored ${dst} ${sha}`);
}
console.log(`RC14.19 bootstrap complete (${manifest.version})`);
