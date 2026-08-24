import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const root=process.cwd();
const manifest=JSON.parse(fs.readFileSync(path.join(root,'.bootstrap-rc1421.json'),'utf8'));
const packed=path.join(root,'packed-rc1421');
const parts=fs.readdirSync(packed).filter(x=>/^bundle\.b64\.\d{3}$/.test(x)).sort();
if(parts.length!==manifest.bundle.chunks)throw new Error(`RC14.21_CHUNK_COUNT_MISMATCH expected=${manifest.bundle.chunks} actual=${parts.length}`);
const b64=parts.map(x=>fs.readFileSync(path.join(packed,x),'utf8').trim()).join('');
if(b64.length!==manifest.bundle.base64Chars)throw new Error(`RC14.21_BASE64_LENGTH_MISMATCH expected=${manifest.bundle.base64Chars} actual=${b64.length}`);
const bundle=Buffer.from(b64,'base64');
const bundleSha=crypto.createHash('sha256').update(bundle).digest('hex');
if(bundle.length!==manifest.bundle.bytes||bundleSha!==manifest.bundle.sha256)throw new Error(`RC14.21_BUNDLE_SHA_MISMATCH expected=${manifest.bundle.sha256} actual=${bundleSha} bytes=${bundle.length}`);
const payload=JSON.parse(zlib.gunzipSync(bundle).toString('utf8'));
if(payload.version!==manifest.version)throw new Error(`RC14.21_VERSION_MISMATCH ${payload.version}`);
for(const [dst,b64data] of Object.entries(payload.files||{})){
  const meta=manifest.files[dst];if(!meta)throw new Error(`RC14.21_UNEXPECTED_FILE ${dst}`);
  const raw=Buffer.from(b64data,'base64'),sha=crypto.createHash('sha256').update(raw).digest('hex');
  if(raw.length!==meta.bytes||sha!==meta.sha256)throw new Error(`RC14.21_FILE_SHA_MISMATCH ${dst} expected=${meta.sha256} actual=${sha}`);
  const dstPath=path.join(root,dst);fs.mkdirSync(path.dirname(dstPath),{recursive:true});fs.writeFileSync(dstPath,raw);
  console.log(`restored ${dst} ${raw.length} ${sha}`);
}
if(Object.keys(payload.files||{}).length!==Object.keys(manifest.files).length)throw new Error('RC14.21_FILE_COUNT_MISMATCH');
console.log(`RC14.21 bootstrap complete (${manifest.version}) bundle=${bundleSha}`);
