import fs from 'node:fs';
import fsp from 'node:fs/promises';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const BUNDLE='rc1419-source-bundle.tgz';
const EXPECTED='172af29f242427fb601b6247a7ec939c2745ca9372a4c0075b6c5d32496f6b20';
const h=crypto.createHash('sha256');
await new Promise((ok,bad)=>{const r=fs.createReadStream(BUNDLE);r.on('data',d=>h.update(d));r.on('error',bad);r.on('end',ok)});
const got=h.digest('hex');
if(got!==EXPECTED) throw new Error(`RC14.19_BUNDLE_SHA_MISMATCH expected=${EXPECTED} got=${got}`);
for(const p of ['api','worker','assets','index.html']) await fsp.rm(p,{recursive:true,force:true});
const out=spawnSync('tar',['-xzf',BUNDLE],{stdio:'inherit'});
if(out.status!==0) throw new Error(`RC14.19_BUNDLE_EXTRACT_FAILED_${out.status}`);
for(const p of ['api/app.js','worker/hrai-pipeline.mjs','worker/worker-server.mjs','worker/op-ui-template.webp','worker/ed-ui-template.webp','index.html','vercel.json','package.json']) {
  if(!fs.existsSync(p)) throw new Error(`RC14.19_RESTORE_MISSING_${p}`);
}
console.log('RC14.19 source bundle restored and SHA256 verified.');
