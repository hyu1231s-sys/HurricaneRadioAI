import fs from 'node:fs';

const apiPath='api/app.js';
const pipelinePath='worker/hrai-pipeline.mjs';
const indexPath='index.html';

let api=fs.readFileSync(apiPath,'utf8');
let pipeline=fs.readFileSync(pipelinePath,'utf8');
let index=fs.readFileSync(indexPath,'utf8');

// Keep only a small snapshot history per job. The base snapshot is separate and protected.
const mkOld="async function mk(n,persistent=true,timeout=2640000){return Sandbox.create({name:n,source:{type:'snapshot',snapshotId:SNAP},ports:[],timeout,resources:{vcpus:2},persistent,snapshotExpiration:24*60*60*1000})}";
const mkNew="async function mk(n,persistent=true,timeout=2640000){return Sandbox.create({name:n,source:{type:'snapshot',snapshotId:SNAP},ports:[],timeout,resources:{vcpus:2},persistent,snapshotExpiration:24*60*60*1000,keepLastSnapshots:{count:2,expiration:24*60*60*1000,deleteEvicted:true}})}";
if(!api.includes(mkOld)&&!api.includes(mkNew))throw new Error('HOBBY_TIMESLICE_MK_TARGET_MISSING');
api=api.replace(mkOld,mkNew);

// On an intentional time-slice yield, stop the persistent session so Vercel snapshots it,
// then resume the same named sandbox as a fresh session. FFmpeg signal retries remain separate.
const statusOld="if(recoverable&&!(await pipelineAlive(sb))){const attempts=Number(state.ffmpegRestarts||0);if(attempts<3){state={...state,stage:'resuming',phase:`映像処理を自動再開中 (${attempts+1}/3)`,error:null,ffmpegRestarts:attempts+1,updatedAt:new Date().toISOString()};await sb.writeFiles([{path:STATUS,content:Buffer.from(JSON.stringify(state,null,2))}]);await prep(sb,j,token(j),origin(req));await runPipeline(sb)}else state={...state,stage:'failed',phase:'映像処理の自動再開上限に達したため安全停止',error:`FFMPEG_SIGNAL_RETRY_EXHAUSTED: ${String(state.error||'process terminated').slice(0,500)}`};}";
const statusNew="if(recoverable&&!(await pipelineAlive(sb))){if(state.sessionYield){const nextSlice=Math.max(1,Number(state.sessionSlice||1)+1);await sb.stop();const next=await Sandbox.get({name:name(j)});state={...state,stage:'resuming',phase:`長尺処理を分割継続中 (${nextSlice}セッション目)`,error:null,sessionYield:false,sessionSlice:nextSlice,updatedAt:new Date().toISOString()};await next.writeFiles([{path:STATUS,content:Buffer.from(JSON.stringify(state,null,2))}]);await prep(next,j,token(j),origin(req));await runPipeline(next)}else{const attempts=Number(state.ffmpegRestarts||0);if(attempts<3){state={...state,stage:'resuming',phase:`映像処理を自動再開中 (${attempts+1}/3)`,error:null,ffmpegRestarts:attempts+1,updatedAt:new Date().toISOString()};await sb.writeFiles([{path:STATUS,content:Buffer.from(JSON.stringify(state,null,2))}]);await prep(sb,j,token(j),origin(req));await runPipeline(sb)}else state={...state,stage:'failed',phase:'映像処理の自動再開上限に達したため安全停止',error:`FFMPEG_SIGNAL_RETRY_EXHAUSTED: ${String(state.error||'process terminated').slice(0,500)}`};}}";
if(!api.includes(statusOld)&&!api.includes(statusNew))throw new Error('HOBBY_TIMESLICE_STATUS_TARGET_MISSING');
api=api.replace(statusOld,statusNew);

// Allow enough time for the persistent sandbox to snapshot and resume on a slice boundary.
api=api.replace("})(),20000,'SANDBOX_STATUS_TIMEOUT');return res.status(200).json(data)","})(),60000,'SANDBOX_STATUS_TIMEOUT');return res.status(200).json(data)");

// Pipeline session budget. 25 minutes leaves a wide margin below Hobby's per-session ceiling.
const lockLine="const PIPELINE_LOCK=`${BASE}/pipeline.lock`;";
const sliceConsts="const PIPELINE_LOCK=`${BASE}/pipeline.lock`;\nconst SESSION_STARTED_AT=Date.now();\nconst SESSION_SLICE_MS=Math.max(10*60*1000,Number(process.env.HRAI_SESSION_SLICE_MS||25*60*1000));\nfunction sessionSliceDue(){return Date.now()-SESSION_STARTED_AT>=SESSION_SLICE_MS}";
if(!pipeline.includes('const SESSION_STARTED_AT=Date.now();')){
  if(!pipeline.includes(lockLine))throw new Error('HOBBY_TIMESLICE_PIPELINE_CONST_TARGET_MISSING');
  pipeline=pipeline.replace(lockLine,sliceConsts);
}

// Yield after a completed transcription chunk, never mid-upload or mid-transcription.
const transDone="await status({lastCompletedChunk:i+1,segments:tr.segments.length,progress:5+Math.floor(82*(i+1)/Math.max(total,1)),retryChunk:null,retryPart:null,error:null});\n    }";
const transYield="await status({lastCompletedChunk:i+1,segments:tr.segments.length,progress:5+Math.floor(82*(i+1)/Math.max(total,1)),retryChunk:null,retryPart:null,error:null});\n      if(i+1<total&&sessionSliceDue()){await status({stage:'recoverable',phase:`長尺音声を分割処理中・保存して次のセッションへ (${i+1}/${total})`,sessionYield:true,sessionYieldReason:'hobby_time_slice',sessionSlice:Math.max(1,Number((await readJ(STATUS,{})).sessionSlice||1)),error:null});return}\n    }";
if(!pipeline.includes("sessionYieldReason:'hobby_time_slice'")){
  if(!pipeline.includes(transDone))throw new Error('HOBBY_TIMESLICE_TRANSCRIPT_TARGET_MISSING');
  pipeline=pipeline.replace(transDone,transYield);
}

// Yield only after a completed render block. Existing validVideo cache means the next session skips it.
const renderDone="await status({renderedBlocks:done,completedRenderBlocks:done.length,totalRenderBlocks:total,renderAverageSeconds:Number(renderAverageSeconds.toFixed(3)),averageSecondsPerBlock:Number(renderAverageSeconds.toFixed(3)),renderEtaSeconds:eta,renderTimingSamples,progress:56+Math.floor(34*(i+1)/Math.max(total,1))});\n  }";
const renderYield="await status({renderedBlocks:done,completedRenderBlocks:done.length,totalRenderBlocks:total,renderAverageSeconds:Number(renderAverageSeconds.toFixed(3)),averageSecondsPerBlock:Number(renderAverageSeconds.toFixed(3)),renderEtaSeconds:eta,renderTimingSamples,progress:56+Math.floor(34*(i+1)/Math.max(total,1))});\n    if(done.length<total&&sessionSliceDue()){const cur=await readJ(STATUS,{});await status({stage:'recoverable',phase:`長尺動画を分割作成中・保存して次のセッションへ (${done.length}/${total})`,sessionYield:true,sessionYieldReason:'hobby_time_slice',sessionSlice:Math.max(1,Number(cur.sessionSlice||1)),renderedBlocks:done,completedRenderBlocks:done.length,totalRenderBlocks:total,error:null});return{yielded:true}}\n  }";
if(!pipeline.includes('長尺動画を分割作成中・保存して次のセッションへ')){
  if(!pipeline.includes(renderDone))throw new Error('HOBBY_TIMESLICE_RENDER_TARGET_MISSING');
  pipeline=pipeline.replace(renderDone,renderYield);
}

// If rendering consumed the budget exactly at the final block, checkpoint before ED/final concat.
const beforeFiles="  const files=[opOut,...done.map(i=>`${RENDERS}/part_rc1421_${String(i).padStart(3,'0')}.mp4`)];let expected=opDuration+d,edDuration=0;";
const beforeFilesYield="  if(sessionSliceDue()){const cur=await readJ(STATUS,{});await status({stage:'recoverable',phase:'分割動画を保存しました・次のセッションで最終結合します',sessionYield:true,sessionYieldReason:'hobby_time_slice',sessionSlice:Math.max(1,Number(cur.sessionSlice||1)),renderedBlocks:done,completedRenderBlocks:done.length,totalRenderBlocks:total,error:null});return{yielded:true}}\n  const files=[opOut,...done.map(i=>`${RENDERS}/part_rc1421_${String(i).padStart(3,'0')}.mp4`)];let expected=opDuration+d,edDuration=0;";
if(!pipeline.includes('次のセッションで最終結合します')){
  if(!pipeline.includes(beforeFiles))throw new Error('HOBBY_TIMESLICE_FINALIZE_TARGET_MISSING');
  pipeline=pipeline.replace(beforeFiles,beforeFilesYield);
}

const renderCall="    await renderVideo(tr,d);";
const renderCallNew="    const renderResult=await renderVideo(tr,d);if(renderResult?.yielded)return;";
if(!pipeline.includes(renderCallNew)){
  if(!pipeline.includes(renderCall))throw new Error('HOBBY_TIMESLICE_MAIN_TARGET_MISSING');
  pipeline=pipeline.replace(renderCall,renderCallNew);
}

// Frontend status polling waits through the snapshot/resume boundary instead of aborting early.
const pollCall="let j=await api('/api/job-status',s,{},18000)";
const pollCallNew="let j=await api('/api/job-status',s,{},65000)";
if(index.includes(pollCall))index=index.replace(pollCall,pollCallNew);

fs.writeFileSync(apiPath,api);
fs.writeFileSync(pipelinePath,pipeline);
fs.writeFileSync(indexPath,index);
console.log('applied Hobby time-sliced longform pipeline: checkpoint -> stop -> snapshot -> resume -> concat');
