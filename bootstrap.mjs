import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import https from 'node:https';
const m=JSON.parse(fs.readFileSync('.bootstrap/manifest.json','utf8'));
for (const [rel,v] of Object.entries(m.files)) {
  const b64=Array.from({length:v.parts},(_,i)=>fs.readFileSync(`.bootstrap/${v.key}.${String(i).padStart(2,'0')}.part`,'utf8').trim()).join('');
  const raw=zlib.gunzipSync(Buffer.from(b64,'base64'));
  const got=crypto.createHash('sha256').update(raw).digest('hex');
  if(got!==v.sha256) throw new Error(`sha mismatch ${rel}`);
  fs.mkdirSync(path.dirname(rel),{recursive:true}); fs.writeFileSync(rel,raw);
}
const get=(url,dest)=>new Promise((resolve,reject)=>{const go=u=>https.get(u,r=>{if(r.statusCode>=300&&r.statusCode<400&&r.headers.location)return go(new URL(r.headers.location,u).href);if(r.statusCode!==200)return reject(new Error(`${r.statusCode} ${u}`));fs.mkdirSync(path.dirname(dest),{recursive:true});const w=fs.createWriteStream(dest);r.pipe(w);w.on('finish',()=>w.close(resolve));}).on('error',reject);go(url)});
for(let i=0;i<m.assets;i++){const n=String(i).padStart(2,'0');await get(`https://hurricane-radio-ai.vercel.app/assets/guest-presets/guest-${n}.webp`,`assets/guest-presets/guest-${n}.webp`);}
console.log('RC14.2 sources restored');
