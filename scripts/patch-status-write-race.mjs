import fs from 'node:fs';

const p='worker/hrai-pipeline.mjs';
let s=fs.readFileSync(p,'utf8');
if(s.includes('STATUS_WRITE_RACE_V1')){
  console.log('status write race patch already applied');
  process.exit(0);
}

const old="async function writeJ(f,o){const t=f+'.tmp';await fsp.writeFile(t,JSON.stringify(o,null,2));await fsp.rename(t,f)}\nasync function status(p){const cur=await readJ(STATUS,{jobId:CFG.jobId});await writeJ(STATUS,{...cur,...p,updatedAt:new Date().toISOString()})}";
const neu="// STATUS_WRITE_RACE_V1: unique temp files + serialized status merge prevent concurrent rename ENOENT\nlet STATUS_WRITE_CHAIN=Promise.resolve();\nasync function writeJ(f,o){const t=`${f}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2,9)}.tmp`;try{await fsp.writeFile(t,JSON.stringify(o,null,2));await fsp.rename(t,f)}finally{await fsp.rm(t,{force:true}).catch(()=>{})}}\nasync function status(p){const run=async()=>{const cur=await readJ(STATUS,{jobId:CFG.jobId});await writeJ(STATUS,{...cur,...p,updatedAt:new Date().toISOString()})};STATUS_WRITE_CHAIN=STATUS_WRITE_CHAIN.then(run,run);return STATUS_WRITE_CHAIN}";
if(!s.includes(old))throw new Error('STATUS_WRITE_TARGET_MISSING');
s=s.replace(old,neu);
fs.writeFileSync(p,s);
console.log('applied serialized atomic status writes with unique temp files');
