import fs from 'node:fs';

const path='index.html';
let s=fs.readFileSync(path,'utf8');
if(s.includes('AVATAR_BUSTUP_V1')){
  console.log('avatar bust-up patch already applied');
  process.exit(0);
}

const css=`
/* AVATAR_BUSTUP_V1 */
.avatarCropOverlay{position:fixed;inset:0;z-index:9999;background:rgba(2,6,18,.86);display:none;align-items:center;justify-content:center;padding:18px}.avatarCropOverlay.open{display:flex}.avatarCropCard{width:min(520px,100%);background:#091225;border:1px solid #31598f;border-radius:18px;padding:16px;box-shadow:0 24px 70px rgba(0,0,0,.5)}.avatarCropHead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}.avatarCropTitle{font-weight:900;font-size:17px}.avatarCropSub{font-size:12px;color:#aebfe0;margin-top:3px}.avatarCropPreview{aspect-ratio:3/4;width:min(290px,72vw);margin:0 auto 14px;border-radius:16px;overflow:hidden;border:1px solid #426ba0;background:#020611}.avatarCropPreview canvas{width:100%;height:100%;display:block}.avatarCropControls{display:grid;gap:10px}.avatarCropControls label{font-size:12px;color:#cbd8ef}.avatarCropControls input[type=range]{width:100%}.avatarCropMode{display:flex;gap:8px}.avatarCropMode button,.avatarCropActions button{width:auto;padding:9px 12px;border-radius:10px;border:1px solid #446b9e;background:#10254a;color:#e9f5ff;font-weight:800}.avatarCropMode button.active{background:#78efff;color:#051020}.avatarCropActions{display:flex;justify-content:flex-end;gap:8px;margin-top:14px}.avatarCropWarn{font-size:12px;color:#ffd27d;min-height:18px;margin-top:8px}.avatarCropHint{font-size:11px;color:#8ea8d2;margin-top:8px}
`;
if(!s.includes('</style>'))throw new Error('AVATAR_BUSTUP_STYLE_TARGET_MISSING');
s=s.replace('</style>',css+'</style>');

const html=`<div id="avatarCropOverlay" class="avatarCropOverlay" aria-hidden="true"><div class="avatarCropCard"><div class="avatarCropHead"><div><div class="avatarCropTitle">アバター表示を調整</div><div class="avatarCropSub">Simpleはバストアップ推奨。顔を中心に自動調整します。</div></div></div><div class="avatarCropPreview"><canvas id="avatarCropCanvas" width="900" height="1200"></canvas></div><div class="avatarCropMode"><button type="button" id="avatarBustMode" class="active">バストアップ</button><button type="button" id="avatarFullMode">全身</button></div><div class="avatarCropControls"><label>左右 <input id="avatarCropX" type="range" min="-35" max="35" value="0"></label><label>上下 <input id="avatarCropY" type="range" min="-35" max="35" value="0"></label><label>ズーム <input id="avatarCropZoom" type="range" min="80" max="150" value="100"></label></div><div id="avatarCropWarn" class="avatarCropWarn"></div><div class="avatarCropHint">複数人・顔が小さい写真は警告します。元画像はそのまま保持し、表示用だけ切り抜きます。</div><div class="avatarCropActions"><button type="button" id="avatarCropReset">自動に戻す</button><button type="button" id="avatarCropDone">この表示で使う</button></div></div></div>`;
if(!s.includes('<script>'))throw new Error('AVATAR_BUSTUP_SCRIPT_TARGET_MISSING');
s=s.replace('<script>',html+'<script>');

const helper=`
const AVATAR_CROP_STATE=new WeakMap();let AVATAR_EDIT_FILE=null,AVATAR_EDIT_IMG=null,AVATAR_FACE=null,AVATAR_FACE_COUNT=0;
function avatarClamp(v,a,b){return Math.max(a,Math.min(b,v))}
async function avatarLoadImage(file){return await new Promise((ok,bad)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{URL.revokeObjectURL(u);ok(im)};im.onerror=e=>{URL.revokeObjectURL(u);bad(e)};im.src=u})}
async function avatarDetectFaces(img){if(!('FaceDetector'in window))return[];try{return await new FaceDetector({fastMode:true,maxDetectedFaces:5}).detect(img)}catch{return[]}}
function avatarAutoState(img,faces){let st={mode:'bustup',x:0,y:0,zoom:1,face:null,warn:''};if(faces.length){let f=faces.slice().sort((a,b)=>b.boundingBox.width*b.boundingBox.height-a.boundingBox.width*a.boundingBox.height)[0].boundingBox;st.face={x:f.x,y:f.y,w:f.width,h:f.height};if(faces.length>1)st.warn='複数人を検出しました。いちばん大きい顔を基準にしています。';let ratio=f.width/Math.max(1,img.naturalWidth);if(ratio<.09)st.warn=(st.warn?st.warn+' ':'')+'顔が小さいため、別の写真の方がきれいに見える可能性があります。'}else if('FaceDetector'in window){st.warn='顔を検出できなかったため、中央やや上を基準にしています。'}else{st.warn='このブラウザでは顔検出が使えないため、安全な上半身位置で自動調整します。'}return st}
function avatarCropRect(img,st){const iw=img.naturalWidth,ih=img.naturalHeight,aspect=3/4;if(st.mode==='fullbody'){let cw=iw,ch=cw/aspect;if(ch>ih){ch=ih;cw=ch*aspect}return{x:(iw-cw)/2,y:(ih-ch)/2,w:cw,h:ch}}let cx=iw*.5,cy=ih*.34,ch=ih*.72;if(st.face){const f=st.face;cx=f.x+f.w/2;cy=f.y+f.h*.55;ch=Math.max(f.h*4.2,ih*.42)}let cw=ch*aspect;if(cw>iw){cw=iw;ch=cw/aspect}if(ch>ih){ch=ih;cw=ch*aspect}const z=avatarClamp(Number(st.zoom)||1,.8,1.5);cw/=z;ch/=z;cx+=Number(st.x||0)*iw*.004;cy+=Number(st.y||0)*ih*.004;let x=avatarClamp(cx-cw/2,0,Math.max(0,iw-cw)),y=avatarClamp(cy-ch*.30,0,Math.max(0,ih-ch));return{x,y,w:cw,h:ch}}
function avatarDraw(){if(!AVATAR_EDIT_IMG||!AVATAR_EDIT_FILE)return;const st=AVATAR_CROP_STATE.get(AVATAR_EDIT_FILE),c=document.getElementById('avatarCropCanvas'),ctx=c.getContext('2d'),r=avatarCropRect(AVATAR_EDIT_IMG,st);ctx.clearRect(0,0,c.width,c.height);ctx.drawImage(AVATAR_EDIT_IMG,r.x,r.y,r.w,r.h,0,0,c.width,c.height);document.getElementById('avatarCropWarn').textContent=st.warn||'';document.getElementById('avatarBustMode').classList.toggle('active',st.mode==='bustup');document.getElementById('avatarFullMode').classList.toggle('active',st.mode==='fullbody')}
async function avatarOpenEditor(file){if(!file||!String(file.type||'').startsWith('image/'))return;AVATAR_EDIT_FILE=file;AVATAR_EDIT_IMG=await avatarLoadImage(file);let faces=await avatarDetectFaces(AVATAR_EDIT_IMG),st=AVATAR_CROP_STATE.get(file)||avatarAutoState(AVATAR_EDIT_IMG,faces);AVATAR_CROP_STATE.set(file,st);document.getElementById('avatarCropX').value=Math.round(st.x||0);document.getElementById('avatarCropY').value=Math.round(st.y||0);document.getElementById('avatarCropZoom').value=Math.round((st.zoom||1)*100);document.getElementById('avatarCropOverlay').classList.add('open');avatarDraw()}
function avatarCloseEditor(){document.getElementById('avatarCropOverlay').classList.remove('open')}
async function prepareAvatarFile(file){if(!file||!String(file.type||'').startsWith('image/'))return file;let st=AVATAR_CROP_STATE.get(file);let img=await avatarLoadImage(file);if(!st){let faces=await avatarDetectFaces(img);st=avatarAutoState(img,faces);AVATAR_CROP_STATE.set(file,st)}if(st.mode==='fullbody')return file;const r=avatarCropRect(img,st),c=document.createElement('canvas');c.width=900;c.height=1200;c.getContext('2d').drawImage(img,r.x,r.y,r.w,r.h,0,0,c.width,c.height);const blob=await new Promise(ok=>c.toBlob(ok,'image/jpeg',.92));return new File([blob],(file.name||'avatar').replace(/\.[^.]+$/,'')+'-bustup.jpg',{type:'image/jpeg',lastModified:Date.now()})}
document.addEventListener('change',e=>{const el=e.target;if(!(el instanceof HTMLInputElement)||el.type!=='file'||!el.files?.[0]||!String(el.accept||'').includes('image'))return;avatarOpenEditor(el.files[0]).catch(()=>{})},true);
window.addEventListener('DOMContentLoaded',()=>{const o=document.getElementById('avatarCropOverlay'),x=document.getElementById('avatarCropX'),y=document.getElementById('avatarCropY'),z=document.getElementById('avatarCropZoom');for(const el of[x,y,z])el?.addEventListener('input',()=>{if(!AVATAR_EDIT_FILE)return;let st=AVATAR_CROP_STATE.get(AVATAR_EDIT_FILE);st.x=Number(x.value);st.y=Number(y.value);st.zoom=Number(z.value)/100;avatarDraw()});document.getElementById('avatarBustMode')?.addEventListener('click',()=>{let st=AVATAR_CROP_STATE.get(AVATAR_EDIT_FILE);if(st){st.mode='bustup';avatarDraw()}});document.getElementById('avatarFullMode')?.addEventListener('click',()=>{let st=AVATAR_CROP_STATE.get(AVATAR_EDIT_FILE);if(st){st.mode='fullbody';avatarDraw()}});document.getElementById('avatarCropReset')?.addEventListener('click',async()=>{if(!AVATAR_EDIT_FILE||!AVATAR_EDIT_IMG)return;let faces=await avatarDetectFaces(AVATAR_EDIT_IMG);let st=avatarAutoState(AVATAR_EDIT_IMG,faces);AVATAR_CROP_STATE.set(AVATAR_EDIT_FILE,st);x.value=0;y.value=0;z.value=100;avatarDraw()});document.getElementById('avatarCropDone')?.addEventListener('click',avatarCloseEditor);o?.addEventListener('click',e=>{if(e.target===o)avatarCloseEditor()})});
`;
s=s.replace('<script>','<script>'+helper);

let patched=false;
s=s.replace(/async function (uploadAvatar\s*\([^)]*\)\s*\{)/,m=>{patched=true;return m+'file=await prepareAvatarFile(file);'});
if(!patched){
  s=s.replace(/async function (avatarUpload\s*\([^)]*\)\s*\{)/,m=>{patched=true;return m+'file=await prepareAvatarFile(file);'});
}
if(!patched)throw new Error('AVATAR_BUSTUP_UPLOAD_FUNCTION_NOT_FOUND');

fs.writeFileSync(path,s);
console.log('applied automatic avatar bust-up crop + preview + manual adjuster');
