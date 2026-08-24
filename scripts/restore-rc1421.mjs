import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import crypto from 'node:crypto';

const root=process.cwd();
const manifest=JSON.parse(fs.readFileSync(path.join(root,'.bootstrap-rc1421.json'),'utf8'));
const packed=path.join(root,'packed-rc1421');
const parts=fs.readdirSync(packed).filter(x=>/^bundle\.b64\.\d{3}(?:[a-z])?$/.test(x)).sort();
if(parts.length<manifest.bundle.chunks)throw new Error(`RC14.21_TRANSFER_PARTS_MISSING logical=${manifest.bundle.chunks} physical=${parts.length}`);
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

// Production hotfix: bound per-job persistent Sandbox snapshots.
const apiPath=path.join(root,'api/app.js');
let api=fs.readFileSync(apiPath,'utf8');
const oldMk="async function mk(n,persistent=true,timeout=2640000){return Sandbox.create({name:n,source:{type:'snapshot',snapshotId:SNAP},ports:[],timeout,resources:{vcpus:2},persistent})}";
const newMk="async function mk(n,persistent=true,timeout=2640000){return Sandbox.create({name:n,source:{type:'snapshot',snapshotId:SNAP},ports:[],timeout,resources:{vcpus:2},persistent,snapshotExpiration:24*60*60*1000})}";
if(!api.includes(oldMk))throw new Error('RC14.21_SANDBOX_RETENTION_PATCH_TARGET_MISSING');
api=api.replace(oldMk,newMk);

const oldUploadInit="try{const sb=await getOrCreate(j,false);if(await pipelineAlive(sb))return processingConflict(res);await sb.runCommand('bash',['-lc',`rm -f ${PART} ${SOURCE} ${TRANSCRIPT} ${METADATA} ${APPROVAL} ${ED} ${EDPART} ${BASE}/upload-*.part ${BASE}/ed-upload-*.part ${BASE}/avatar-*.part ${BASE}/speaker_refs.json ${BASE}/pipeline.pid ${FINAL} ${MP3} ${WAV} ${TRANSCRIPT_TXT}; rm -rf ${BASE}/chunks ${BASE}/speaker_refs ${BASE}/renders; mkdir -p ${BASE}`]);await sb.writeFiles([{path:STATUS,content:Buffer.from(JSON.stringify({jobId:j,stage:'uploading',phase:'音声をアップロード中',progress:2,expectedBytes:bytes,receivedBytes:0,updatedAt:new Date().toISOString()}))}]);return res.status(200).json({ok:true})}";
const newUploadInit="try{const sb=await getOrCreate(j,false);if(await pipelineAlive(sb))return processingConflict(res);let prev={};try{prev=JSON.parse(await stdout(sb,'cat',[STATUS]))}catch{}if(prev.stage==='uploading'&&Number(prev.expectedBytes)===bytes){const received=Number((await stdout(sb,'bash',['-lc',`cat ${BASE}/upload-*.part 2>/dev/null | wc -c`])).trim());return res.status(200).json({ok:true,resumableUpload:true,receivedBytes:received})}await sb.runCommand('bash',['-lc',`rm -f ${PART} ${SOURCE} ${TRANSCRIPT} ${METADATA} ${APPROVAL} ${ED} ${EDPART} ${BASE}/upload-*.part ${BASE}/ed-upload-*.part ${BASE}/avatar-*.part ${BASE}/speaker_refs.json ${BASE}/pipeline.pid ${FINAL} ${MP3} ${WAV} ${TRANSCRIPT_TXT}; rm -rf ${BASE}/chunks ${BASE}/speaker_refs ${BASE}/renders; mkdir -p ${BASE}`]);await sb.writeFiles([{path:STATUS,content:Buffer.from(JSON.stringify({jobId:j,stage:'uploading',phase:'音声をアップロード中',progress:2,expectedBytes:bytes,receivedBytes:0,updatedAt:new Date().toISOString()}))}]);return res.status(200).json({ok:true,receivedBytes:0})}";
if(!api.includes(oldUploadInit))throw new Error('RC14.21_IPAD_UPLOAD_INIT_PATCH_TARGET_MISSING');
api=api.replace(oldUploadInit,newUploadInit);
fs.writeFileSync(apiPath,api);
console.log('applied Sandbox retention + iPad resumable upload API hotfix');

const indexPath=path.join(root,'index.html');
let index=fs.readFileSync(indexPath,'utf8');
const oldBoot="async function boot(){renderPresets();try{await refreshProfiles()}catch{profilemsg.textContent='この端末では出演者セット保存を利用できません'}try{let j=await fetch('/api/health').then(r=>r.json());ui.textContent=j.ok?'LIVE':'ERROR';ui.className=j.ok?'ok':''}catch{}try{let j=await fetch('/api/openai-status').then(r=>r.json());A=j.configured&&j.reachable;ai.textContent=A?'接続済み':'待機';ai.className=A?'ok':''}catch{}try{let j=await fetch('/api/worker-status').then(r=>r.json());W=j.ready;wk.textContent=W?'READY':'待機';wk.className=W?'ok':''}catch{}ready();let old=savedJob();if(old){S=old;prog(2,'前回の作業へ再接続中');try{await api('/api/resume-job',old,{},55000)}catch(e){if(/job_not_found|source_missing|unauthorized/.test(e.message)){try{localStorage.removeItem('hraiJob')}catch{}return fail('前回の作業環境は終了しました。音声を選び直してください')}}poll(old)}}";
const newBoot="async function boot(){renderPresets();try{await refreshProfiles()}catch{profilemsg.textContent='この端末では出演者セット保存を利用できません'}try{let j=await fetch('/api/health').then(r=>r.json());ui.textContent=j.ok?'LIVE':'ERROR';ui.className=j.ok?'ok':''}catch{}try{let j=await fetch('/api/openai-status').then(r=>r.json());A=j.configured&&j.reachable;ai.textContent=A?'接続済み':'待機';ai.className=A?'ok':''}catch{}try{let j=await fetch('/api/worker-status').then(r=>r.json());W=j.ready;wk.textContent=W?'READY':'待機';wk.className=W?'ok':''}catch{}ready();let old=savedJob();if(old){S=old;prog(2,'前回の作業へ再接続中');try{await api('/api/resume-job',old,{},55000)}catch(e){if(/source_missing/.test(e.message)){return fail('iPadで転送が途中になった可能性があります。同じ音声を選び直して「AIで開始」を押すと続きから再開できます')}if(/job_not_found|unauthorized/.test(e.message)){try{localStorage.removeItem('hraiJob')}catch{}return fail('前回の作業環境は終了しました。音声を選び直してください')}}poll(old)}}";
const oldUpload="async function upload(s,file){const size=1500000;await retryApi(()=>api('/api/upload-init',s,{bytes:file.size,filename:file.name}));for(let off=0,i=0;off<file.size;off+=size,i++){let part=file.slice(off,Math.min(file.size,off+size)),audioBase64=await b64(part);await retryApi(()=>api('/api/upload-chunk',s,{index:i,audioBase64}));prog(3+4*Math.min(file.size,off+size)/file.size,'音声を安全に転送中')}let u=await retryApi(()=>api('/api/upload-complete',s,{bytes:file.size,filename:file.name}));if(u.sha256){s.sourceSha256=u.sha256;try{localStorage.hraiJob=JSON.stringify(s)}catch{}}return u}";
const newUpload="async function upload(s,file){const size=750000,init=await retryApi(()=>api('/api/upload-init',s,{bytes:file.size,filename:file.name}));let received=Math.max(0,Number(init.receivedBytes||0)),start=Math.min(file.size,Math.floor(received/size)*size),i=Math.floor(start/size);for(let off=start;off<file.size;off+=size,i++){let part=file.slice(off,Math.min(file.size,off+size)),audioBase64=await b64(part);await retryApi(()=>api('/api/upload-chunk',s,{index:i,audioBase64}));prog(3+4*Math.min(file.size,off+size)/file.size,'音声を安全に転送中')}let u=await retryApi(()=>api('/api/upload-complete',s,{bytes:file.size,filename:file.name}));if(u.sha256){s.sourceSha256=u.sha256;try{localStorage.hraiJob=JSON.stringify(s)}catch{}}return u}";
if(!index.includes(oldBoot)||!index.includes(oldUpload))throw new Error('RC14.21_IPAD_UI_PATCH_TARGET_MISSING');
index=index.replace(oldBoot,newBoot).replace(oldUpload,newUpload);
fs.writeFileSync(indexPath,index);
console.log('applied iPad Safari upload recovery UI hotfix');

console.log(`RC14.21 bootstrap complete (${manifest.version}) bundle=${bundleSha}`);
