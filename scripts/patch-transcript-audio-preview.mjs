import fs from 'node:fs';

const indexPath='index.html';
let index=fs.readFileSync(indexPath,'utf8');

const cssOld=".meta{font-size:12px;color:#b9c9ef}";
const cssNew=".meta{font-size:12px;color:#b9c9ef}.previewbtn{display:inline-block;width:auto;margin-top:7px;padding:7px 10px;border:1px solid #456da8;border-radius:8px;background:#10234a;color:#dff8ff;font-size:12px;font-weight:800}.previewbtn.playing{background:#6fefff;color:#061025}.previewbtn:disabled{opacity:.45}";
if(!index.includes(cssOld)&&!index.includes('.previewbtn{'))throw new Error('TRANSCRIPT_AUDIO_PREVIEW_CSS_TARGET_MISSING');
index=index.replace(cssOld,cssNew);

const globalsOld="let F,E,AR,AG,GP='',RYCLEAR=false,GUCLEAR=false,A=false,W=false,T,R=false,TR,S,Q=0,$=x=>document.querySelector(x);";
const globalsNew="let F,E,AR,AG,GP='',RYCLEAR=false,GUCLEAR=false,A=false,W=false,T,R=false,TR,S,Q=0,PREVIEW_AUDIO=null,PREVIEW_URL='',PREVIEW_FILE=null,PREVIEW_TIMER=null,PREVIEW_BTN=null,$=x=>document.querySelector(x);";
if(!index.includes(globalsOld)&&!index.includes('PREVIEW_AUDIO=null'))throw new Error('TRANSCRIPT_AUDIO_PREVIEW_GLOBALS_TARGET_MISSING');
index=index.replace(globalsOld,globalsNew);

const fileChangeOld="f.onchange=e=>{F=e.target.files[0];fn.textContent=F?F.name:'音声ファイルを選ぶ';done.style.display='none';review.style.display='none';R=false;ready()};";
const fileChangeNew="f.onchange=e=>{F=e.target.files[0];fn.textContent=F?F.name:'音声ファイルを選ぶ';preparePreviewAudio();done.style.display='none';review.style.display='none';R=false;ready()};";
if(!index.includes(fileChangeOld)&&!index.includes('preparePreviewAudio();done.style.display'))throw new Error('TRANSCRIPT_AUDIO_PREVIEW_FILE_TARGET_MISSING');
index=index.replace(fileChangeOld,fileChangeNew);

const clockMarker="function clock(v){let n=Math.max(0,Math.floor(Number(v)||0)),m=Math.floor(n/60),s=n%60;return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}";
const helpers=`function stopPreview(){if(PREVIEW_TIMER){clearInterval(PREVIEW_TIMER);PREVIEW_TIMER=null}if(PREVIEW_AUDIO){try{PREVIEW_AUDIO.pause()}catch{}}if(PREVIEW_BTN){PREVIEW_BTN.textContent='▶ 音声';PREVIEW_BTN.classList.remove('playing');PREVIEW_BTN=null}}
function preparePreviewAudio(){stopPreview();if(PREVIEW_URL){try{URL.revokeObjectURL(PREVIEW_URL)}catch{}PREVIEW_URL=''}PREVIEW_AUDIO=null;PREVIEW_FILE=null;if(!F)return;PREVIEW_URL=URL.createObjectURL(F);PREVIEW_AUDIO=new Audio(PREVIEW_URL);PREVIEW_AUDIO.preload='metadata';PREVIEW_FILE=F;PREVIEW_AUDIO.addEventListener('ended',stopPreview)}
async function playPreview(i,btn){if(!F){return fail('音声プレビューには元音声が必要です。同じ音声ファイルを選び直してください')}if(PREVIEW_FILE!==F||!PREVIEW_AUDIO)preparePreviewAudio();if(PREVIEW_BTN===btn&&!PREVIEW_AUDIO.paused){stopPreview();return}stopPreview();let x=TR?.segments?.[i];if(!x)return;let start=Math.max(0,Number(x.start||0)-.6),end=Math.max(start+.6,Number(x.end||x.start||0)+.8);try{if(PREVIEW_AUDIO.readyState<1)await new Promise((ok,bad)=>{const t=setTimeout(()=>bad(Error('音声の準備が時間切れになりました')),5000),done=()=>{clearTimeout(t);PREVIEW_AUDIO.removeEventListener('loadedmetadata',done);ok()};PREVIEW_AUDIO.addEventListener('loadedmetadata',done,{once:true});PREVIEW_AUDIO.load()});PREVIEW_AUDIO.currentTime=Math.min(start,Math.max(0,(PREVIEW_AUDIO.duration||start+1)-.05));PREVIEW_BTN=btn;btn.textContent='■ 停止';btn.classList.add('playing');await PREVIEW_AUDIO.play();PREVIEW_TIMER=setInterval(()=>{if(!PREVIEW_AUDIO||PREVIEW_AUDIO.paused||PREVIEW_AUDIO.currentTime>=end)stopPreview()},100)}catch(e){stopPreview();fail('音声プレビュー: '+String(e?.message||e))}}
${clockMarker}`;
if(!index.includes('async function playPreview(')){
  if(!index.includes(clockMarker))throw new Error('TRANSCRIPT_AUDIO_PREVIEW_HELPER_TARGET_MISSING');
  index=index.replace(clockMarker,helpers);
}

const renderRowsOld="meta.className='meta';meta.textContent=`${clock(x.start)}–${clock(x.end)}`;addOption(sel,'speaker_1','🟢 RYOKU');";
const renderRowsNew="meta.className='meta';let time=document.createElement('div'),play=document.createElement('button');time.textContent=`${clock(x.start)}–${clock(x.end)}`;play.type='button';play.className='previewbtn';play.textContent=F?'▶ 音声':'音声を再選択';play.disabled=!F;play.onclick=()=>playPreview(i,play);meta.append(time,play);addOption(sel,'speaker_1','🟢 RYOKU');";
if(!index.includes(renderRowsOld)&&!index.includes("play.className='previewbtn'"))throw new Error('TRANSCRIPT_AUDIO_PREVIEW_ROWS_TARGET_MISSING');
index=index.replace(renderRowsOld,renderRowsNew);

fs.writeFileSync(indexPath,index);
console.log('applied per-caption local audio preview buttons for transcript/speaker review');
