import fs from 'node:fs';

const path='index.html';
let s=fs.readFileSync(path,'utf8');
const marker="function expiredJobError(e){return /Status code 410|status_failed: Status code 410|snapshot.*expired|expired.*snapshot|job_expired/i.test(String(e?.message||e))}";
if(!s.includes('function expiredJobError(')){
  const target="function savedJob(){try{let x=JSON.parse(localStorage.hraiJob||'null');return x&&x.jobId&&x.workerToken?x:null}catch{return null}}";
  if(!s.includes(target))throw new Error('EXPIRED_JOB_HELPER_TARGET_MISSING');
  const repl=target+"\n"+marker+"\nfunction clearExpiredJob(){try{localStorage.removeItem('hraiJob')}catch{}S=null;if(T)clearTimeout(T)}";
  s=s.replace(target,repl);
}
const oldBoot="if(/sandbox_payment_required/.test(e.message))return fail('Vercel Sandboxの利用枠または支払い確認で一時停止中です。作業データは保持されています。復旧後にこの画面を開き直せば同じjobから再開できます');if(/source_missing/.test(e.message)){return fail('iPadで転送が途中になった可能性があります。同じ音声を選び直して「AIで開始」を押すと続きから再開できます')}if(/job_not_found|unauthorized/.test(e.message)){try{localStorage.removeItem('hraiJob')}catch{}return fail('前回の作業環境は終了しました。音声を選び直してください')}}poll(old)";
const newBoot="if(/sandbox_payment_required/.test(e.message))return fail('Vercel Sandboxの利用枠または支払い確認で一時停止中です。作業データは保持されています。復旧後にこの画面を開き直せば同じjobから再開できます');if(expiredJobError(e)){clearExpiredJob();return fail('前回の作業データは保存期限を過ぎています。同じ音声を選び直して「AIで開始」を押すと、新しい作業として安全に再開できます')}if(/source_missing/.test(e.message)){return fail('iPadで転送が途中になった可能性があります。同じ音声を選び直して「AIで開始」を押すと続きから再開できます')}if(/job_not_found|unauthorized/.test(e.message)){clearExpiredJob();return fail('前回の作業環境は終了しました。音声を選び直してください')}}poll(old)";
if(s.includes(oldBoot))s=s.replace(oldBoot,newBoot);
else if(!s.includes('前回の作業データは保存期限を過ぎています'))throw new Error('EXPIRED_JOB_BOOT_TARGET_MISSING');

const oldPoll="if(/sandbox_payment_required/.test(e.message))return fail('Vercel Sandboxの利用枠または支払い確認で一時停止中です。作業データは保持されています。復旧後にこの画面を開き直せば同じjobから再開できます');if(/job_not_found|unauthorized/.test(e.message)){try{localStorage.removeItem('hraiJob')}catch{}return fail('前回の作業環境は終了しました。音声を選び直してください')}prog(Number(String(fill.style.width).replace('%',''))||10,'処理は継続中・再接続しています');";
const newPoll="if(/sandbox_payment_required/.test(e.message))return fail('Vercel Sandboxの利用枠または支払い確認で一時停止中です。作業データは保持されています。復旧後にこの画面を開き直せば同じjobから再開できます');if(expiredJobError(e)){clearExpiredJob();return fail('前回の作業データは保存期限を過ぎています。同じ音声を選び直して「AIで開始」を押すと、新しい作業として安全に再開できます')}if(/job_not_found|unauthorized/.test(e.message)){clearExpiredJob();return fail('前回の作業環境は終了しました。音声を選び直してください')}prog(Number(String(fill.style.width).replace('%',''))||10,'処理は継続中・再接続しています');";
if(s.includes(oldPoll))s=s.replace(oldPoll,newPoll);
else if((s.match(/前回の作業データは保存期限を過ぎています/g)||[]).length<2)throw new Error('EXPIRED_JOB_POLL_TARGET_MISSING');

const outer="}catch(e){if(/job_already_processing/.test(e.message)&&S){prog(Number(String(fill.style.width).replace('%',''))||10,'既存の処理へ安全に再接続しました');return poll(S)}fail(e.name==='AbortError'?'接続確認が時間切れになりました。もう一度押してください':e.message)}};boot();";
const outerNew="}catch(e){if(expiredJobError(e)){clearExpiredJob();go.disabled=false;return fail('前回の作業データは保存期限を過ぎています。同じ音声を選び直して、もう一度「AIで投稿用ラジオを作る」を押してください')}if(/job_already_processing/.test(e.message)&&S){prog(Number(String(fill.style.width).replace('%',''))||10,'既存の処理へ安全に再接続しました');return poll(S)}fail(e.name==='AbortError'?'接続確認が時間切れになりました。もう一度押してください':e.message)}};boot();";
if(s.includes(outer))s=s.replace(outer,outerNew);
else if((s.match(/前回の作業データは保存期限を過ぎています/g)||[]).length<3)throw new Error('EXPIRED_JOB_START_TARGET_MISSING');

fs.writeFileSync(path,s);
console.log('applied expired Sandbox/job 410 recovery UX');
