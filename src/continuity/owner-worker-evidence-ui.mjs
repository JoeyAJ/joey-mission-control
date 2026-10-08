import {workerEvidence} from './owner-worker-evidence.mjs';
const labels={WAITING_UNCLAIMED:'尚未領取 · 尚無執行證據',CLAIMED:'已領取 · 尚無程序事件',SPAWN_INTENT_RECORDED:'已記錄啟動意圖 · 尚無程序事件',RUNNING_REPORTED:'worker 回報執行中 · 租約有效',AWAITING_OUTCOME:'程序已回報結束 · 等待資料庫結果',COMPLETED_CONFIRMED:'此 pilot 完成證據相符',CANCELLED:'已取消',CANCEL_REQUESTED:'取消已請求 · 未確認結束',FAILED:'資料庫記錄失敗',FAILURE_REPORTED:'已回報失敗 · 未確認最終結果',STALE:'證據已過期 · 目前執行狀態未知',UNCONFIRMED:'目前執行狀態未確認',UNKNOWN:'最終結果未知',INCONSISTENT:'證據不一致 · 不確認完成'};
const reasons={EVENTS_OR_SPAWN_WITHOUT_CLAIM:'領取／啟動／事件紀錄不相符。',TERMINAL_OUTCOME_CONFLICT:'結束旗標與資料庫結果不相符。',SOURCE_TIME_ORDER_CONFLICT:'來源時間與事件順序不相符。',MULTIPLE_PROCESS_EXITS:'同一次 attempt 有多筆程序結束紀錄。',COMPLETION_EVIDENCE_INCONSISTENT:'COMPLETED 缺少相符的 turn／exit 0，或同時有取消、失敗、禁止工具證據。',PROHIBITED_TOOL_REPORTED:'這個 smoke 不允許工具，事件中卻有工具紀錄。',FAILURE_REPORTED:'已有失敗事件；後續 turn completion 不會清除它。',BROKER_DISABLED:'broker 停用，不推定 worker 正在工作。',WORKER_DISABLED_OR_REVOKED:'目前 worker 已停用或撤銷。',WORKER_NOT_IN_CURRENT_VIEW:'目前讀回沒有這個歷史 worker 的有效狀態。',LEASE_MISSING_OR_EXPIRED:'租約／執行期限缺漏或到期。',READBACK_EXPIRED:'成功讀回已超過有效期間。',EVENT_EXPIRED:'來源事件已超過有效期間。',SOURCE_TIME_AHEAD_OF_READ:'來源事件時間晚於此次讀回，時鐘關係未確認。',PROCESS_EXIT_IS_NOT_SERVER_COMPLETION:'程序 exit 不能代替 server 的最終結果。'};
const stamp=v=>v===null?'未提供':new Date(v).toISOString();
export function mountOwnerWorkerEvidence({doc,config,now=Date.now,setTimer=setTimeout,clearTimer=clearTimeout}){
 const node=(tag,text)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const root=node('section');root.className='owner-worker-evidence';root.setAttribute('aria-label','私人 worker 執行證據');
 let source=null,readAt=null,projection=null,selectedJob=null,selectedEvent=null,unconfirmed=false,invalid=false,disposed=false,timer=null;
 const stop=()=>{clearTimer(timer);timer=null;};
 function details(entries){const dl=node('dl');for(const[label,value]of entries){dl.append(node('dt',label),node('dd',value===null?'未提供':typeof value==='boolean'?value?'是':'否':String(value)));}return dl;}
 function selectable(label,key,chosen,onChoose){const b=node('button',label);b.type='button';b.dataset.evidenceControl=key;b.setAttribute('aria-pressed',String(chosen));b.tabIndex=chosen?0:-1;b.addEventListener('click',()=>{onChoose();render(key);});return b;}
 function keyboard(list,choose){list.addEventListener('keydown',event=>{
  const buttons=Array.from(list.querySelectorAll('button')),index=buttons.indexOf(doc.activeElement);if(index<0)return;
  const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:['ArrowDown','ArrowRight'].includes(event.key)?(index+1)%buttons.length:['ArrowUp','ArrowLeft'].includes(event.key)?(index-1+buttons.length)%buttons.length:null;
  if(next===null)return;event.preventDefault();choose(buttons[next].dataset.evidenceControl);render(buttons[next].dataset.evidenceControl);
 });}
 function render(focusKey=null){
  if(disposed)return;stop();const at=now();
  if(source){try{projection=workerEvidence({view:source,config,readAt,now:at});invalid=false;}catch{invalid=true;unconfirmed=true;}}
  const active=doc.activeElement;if(!focusKey&&root.contains(active))focusKey=active.dataset?.evidenceControl||null;
  const previousScroll=root.scrollTop;root.replaceChildren();root.append(node('h4','執行證據（只讀）'));
  const status=node('p');status.setAttribute('role','status');root.append(status);
  root.dataset.evidenceReadState=invalid?'invalid':unconfirmed?'unconfirmed':source?'confirmed':'unread';
  if(!projection){status.textContent=invalid?'讀回資料無法確認；不顯示未驗證事件。':'尚未讀回執行證據。';return;}
  status.textContent=invalid?'新資料無法確認；下方保留上次已驗證紀錄，目前狀態未知。':unconfirmed?'本次操作／讀回未確認；下方保留上次紀錄，目前執行狀態未知。':projection.jobs.length?'分開核對領取、啟動意圖、程序事件與資料庫結果。':'尚無檢查紀錄，也沒有執行證據。';
  root.append(node('p','來源：既有 Owner 區讀回。worker 回報紀錄不提供 Agent／model 身分，也不代表 Owner Auth／AAL2 或 canonical 寫入成功。'),node('p','上次成功收到讀回：'+stamp(projection.readAt)+' · 來源事件時間另列。'));
  if(!projection.jobs.length)return;
  if(!projection.jobs.some(j=>j.jobId===selectedJob)){selectedJob=projection.jobs[0].jobId;selectedEvent=null;}
  const job=projection.jobs.find(j=>j.jobId===selectedJob);if(!job.events.some(e=>e.eventId===selectedEvent))selectedEvent=job.events[0]?.eventId??null;
  const list=node('div');list.className='owner-worker-evidence-selectors';list.setAttribute('role','group');list.setAttribute('aria-label','選擇檢查紀錄');
  for(const j of projection.jobs)list.append(selectable(`檢查紀錄 fence ${j.fence} · ${unconfirmed&&!j.terminal?labels.UNCONFIRMED:labels[j.state]}`,'job:'+j.jobId,j.jobId===selectedJob,()=>{selectedJob=j.jobId;selectedEvent=null;}));
  keyboard(list,key=>{selectedJob=key.slice(4);selectedEvent=null;});root.append(list,node('p','方向鍵切換紀錄／事件；Home／End 到第一／最後一筆。'));
  const section=node('section');section.dataset.evidenceState=unconfirmed&&!job.terminal?'UNCONFIRMED':job.state;section.append(node('h5',labels[unconfirmed&&!job.terminal?'UNCONFIRMED':job.state]));
  if(unconfirmed&&job.terminal)section.append(node('p','這是上次讀回的 terminal 紀錄；本次操作未確認。'));
  for(const reason of job.reasons)section.append(node('p',reasons[reason]));
  section.append(details([['檢查紀錄 ID（不是配對碼）',job.jobId],['Attempt',job.attemptId],['Fence',job.fence],['Worker',job.workerId],['已領取',job.claimed],['已記錄 spawn intent',job.spawnIntent],['Server terminal',job.terminal],['Server outcome',job.outcome],['已回報 turn completion',job.evidence.turnCompleted],['已回報 process exit',job.evidence.processExited],['Process exit code',job.evidence.processExitCode],['Signal',job.evidence.signal],['最後一筆來源事件時間',stamp(job.observedAt)],['Lease 到期時間',stamp(job.leaseUntil)],['執行期限',stamp(job.expiresAt)]]));
  if(!job.events.length)section.append(node('p','尚無執行事件；不能從批准、領取或啟動意圖推定程序正在跑。'));
  else{
   const eventList=node('div');eventList.className='owner-worker-evidence-selectors';eventList.setAttribute('role','group');eventList.setAttribute('aria-label','選擇 safe event');
   for(const e of job.events)eventList.append(selectable(`${e.seq} · ${e.payload.kind} · ${stamp(e.observedAt)}`,'event:'+e.eventId,e.eventId===selectedEvent,()=>{selectedEvent=e.eventId;}));
   keyboard(eventList,key=>{selectedEvent=key.slice(6);});section.append(eventList);
   const event=job.events.find(e=>e.eventId===selectedEvent),p=event.payload;
   const inspector=node('section');inspector.dataset.evidenceEvent=event.eventId;inspector.setAttribute('aria-label','Safe event 詳細資料');
   inspector.append(node('h5','所選事件（安全欄位）'),details([['Event ID',event.eventId],['Sequence',event.seq],['Kind',p.kind],['來源 observedAt',stamp(event.observedAt)],['Thread ID',p.threadId],['Item ID',p.itemId],['Item type',p.itemType],['Item status',p.itemStatus],['Command exit code',p.commandExitCode],['Process exit code',p.processExitCode],['Signal',p.signal],['Error class',p.errorClass]]));section.append(inspector);
  }
  root.append(section);root.scrollTop=previousScroll;
  if(focusKey)Array.from(root.querySelectorAll('button')).find(b=>b.dataset.evidenceControl===focusKey)?.focus({preventScroll:true});
  const deadlines=projection.jobs.map(j=>j.validUntil).filter(v=>v!==null&&v>at);
  if(deadlines.length&&!unconfirmed){timer=setTimer(()=>render(),Math.max(1,Math.min(...deadlines)-at+1));timer?.unref?.();}
 }
 function clear(){stop();source=null;readAt=null;projection=null;selectedJob=null;selectedEvent=null;unconfirmed=false;invalid=false;render();}
 render();return{root,update(view){if(disposed)return;if(!view){clear();return;}if(view!==source){source=view;readAt=now();unconfirmed=false;}render();},unconfirmed(){if(disposed)return;unconfirmed=true;render();},clear,dispose(){if(disposed)return;clear();disposed=true;stop();root.remove();}};
}
