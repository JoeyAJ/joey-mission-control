import {createOwnerVmLink} from './owner-vm-link.mjs';
export function mountOwnerVmLink({doc,config,inspectSession,rpc}){
 if(config.enabled!==true)return null;
 const root=doc.createElement('section');root.className='owner-vm-link';root.hidden=true;
 const h=doc.createElement('h3');h.textContent='Ubuntu-1 · 15 分鐘連線 pilot';
 const note=doc.createElement('p');note.textContent='只批准固定 MC_CONNECTION_OK 檢查；無 repository 寫入。VM 事件以已批准 worker 簽章為來源，canonical submit 仍為 false。';
 const status=doc.createElement('p');status.setAttribute('role','status');const actions=doc.createElement('div'),jobs=doc.createElement('div');
 const code=doc.createElement('input');code.type='password';code.readOnly=true;code.autocomplete='off';code.setAttribute('aria-label','一次性 VM 配對碼');code.hidden=true;
 const worker=doc.createElement('p');const copy=doc.createElement('button');copy.type='button';copy.textContent='複製一次性配對碼';copy.hidden=true;copy.style.minHeight='44px';
 let controller,timer=null,disposed=false,authenticated=false,pilotEnd=0;
 const stopPoll=()=>{if(timer){clearTimeout(timer);timer=null;}};
 function button(label,fn){const b=doc.createElement('button');b.type='button';b.style.minHeight='44px';b.textContent=label;b.addEventListener('click',()=>void perform(fn));return b;}
 async function perform(fn){try{await fn();}catch{status.textContent='操作尚未確認；請重新整理或撤銷，不會自動重送批准。';}schedule();}
 function schedule(){stopPoll();if(disposed||!authenticated||!controller.snapshot().view?.jobs.some(j=>!j.terminal)||doc.hidden)return;
  if(!pilotEnd)pilotEnd=Date.now()+900000;if(Date.now()>=pilotEnd)return;
  timer=setTimeout(()=>void perform(()=>controller.refresh()),3000);}
 controller=createOwnerVmLink({config,inspectSession,rpc,onChange:s=>{
  code.value=s.pairingCode||'';code.hidden=!s.pairingCode;copy.hidden=!s.pairingCode;worker.textContent=s.pairingWorker||'';
  status.textContent=s.busy?'核對 Owner 與資料庫…':s.view?`Broker ${s.view.enabled?'已批准啟用':'停用'} · 已批准 worker 簽章 · 不代表 Owner Auth/AAL2 或 canonical 寫入成功`:'尚未讀回';
  for(const b of actions.querySelectorAll('button'))b.disabled=s.busy;
  jobs.replaceChildren();for(const j of s.view?.jobs||[]){const row=doc.createElement('div'),text=doc.createElement('p');text.textContent=`${j.jobId} · fence ${j.fence} · ${j.outcome|| (j.cancel?'取消已請求':j.spawnIntent?'執行中':j.claimed?'已租用':'等待 VM')}`;row.append(text);
   if(!j.terminal)row.append(button('請求取消',()=>controller.cancel(j.jobId)));
   if(j.terminal&&!j.claimed&&!j.spawnIntent&&j.outcome==='CANCELLED')row.append(button('重新批准一次 pilot',()=>controller.retry(j.jobId)));
   const events=doc.createElement('ol');for(const e of j.events.slice(-16)){const li=doc.createElement('li');li.textContent=`${e.seq} · ${e.payload.kind} · ${new Date(e.observedAt).toISOString()}`;events.append(li);}row.append(events);jobs.append(row);
  }
 }});
 copy.addEventListener('click',()=>{const v=controller.snapshot().pairingCode;if(v)void globalThis.navigator.clipboard.writeText(v).catch(()=>{status.textContent='複製未確認；配對碼仍保留在這個受保護頁面。';});});
 actions.append(button('重新整理',()=>controller.refresh()),button('批准啟用已審閱 broker',()=>controller.activate()),button('批准一次 Ubuntu-1 配對與 pilot',()=>controller.approvePair()),button('撤銷目前 worker',()=>controller.revoke(controller.snapshot().view?.worker?.workerId)),button('暫停並撤銷 pilot',()=>controller.pause()));
 root.append(h,note,status,actions,worker,code,copy,jobs);
 const hide=()=>{stopPoll();controller.clear();pilotEnd=0;};const visibility=()=>{if(doc.hidden)hide();else schedule();};doc.addEventListener('visibilitychange',visibility);
 return {root,update({projectId,authView}){authenticated=projectId==='NEXAEON'&&authView?.status==='authenticated'&&authView.aal==='aal2'&&authView.memberActive===true;root.hidden=!authenticated;if(!authenticated)hide();},clear:hide,dispose(){disposed=true;hide();doc.removeEventListener('visibilitychange',visibility);controller.dispose();root.remove();}};
}
