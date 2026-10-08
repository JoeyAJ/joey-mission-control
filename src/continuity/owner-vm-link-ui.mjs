import {createOwnerVmLink} from './owner-vm-link.mjs';
import {vmBootstrapCommand} from './owner-vm-link-command.mjs';
import {mountOwnerWorkerEvidence} from './owner-worker-evidence-ui.mjs';
export function mountOwnerVmLink({doc,config,inspectSession,rpc}){
 if(config.enabled!==true)return null;
 const node=(tag,text)=>{const n=doc.createElement(tag);if(text)n.textContent=text;return n;};
 const root=node('section');root.className='owner-vm-link';root.hidden=true;
 const heading=node('h3','Ubuntu-1 · 15 分鐘連線 pilot');
 const note=node('p','只執行一次、最多 60 秒的 MC_CONNECTION_OK 檢查。先讓 AWS 終端等碼，再批准；worker ID 與命令都由這個頁面填好，不需貼到聊天。');
 const status=node('p');status.setAttribute('role','status');
 const readActions=node('div'),flow=node('div'),safetyActions=node('div'),jobs=node('div');flow.className='owner-vm-link-flow';
 const evidence=mountOwnerWorkerEvidence({doc,config});
 const steps=node('ol');for(const text of ['準備命令','終端停在等碼提示','批准一次配對','複製碼並貼入終端'])steps.append(node('li',text));
 const stepTitle=node('h4'),help=node('p'),worker=node('p');worker.dataset.vmWorkerId='true';
 const commandPanel=node('div'),commandLabel=node('label','已填好 worker ID 的終端命令');
 const command=node('textarea');command.readOnly=true;command.rows=4;command.className='owner-vm-link-command';command.setAttribute('aria-label','Ubuntu-1 終端命令');command.spellcheck=false;commandLabel.append(command);
 const commandStatus=node('p');commandStatus.setAttribute('role','status');
 const code=node('input');code.type='password';code.readOnly=true;code.autocomplete='off';code.setAttribute('aria-label','一次性 VM 配對碼');code.hidden=true;
 const copyStatus=node('p');copyStatus.setAttribute('role','status');
 let controller,timer=null,disposed=false,authenticated=false,pilotEnd=0,lastStage='',copyEpoch=0;
 const stopPoll=()=>{clearTimeout(timer);timer=null;};
 function button(label,fn){const b=node('button',label);b.type='button';b.style.minHeight='44px';b.addEventListener('click',()=>void perform(fn));return b;}
 async function perform(fn){try{await fn();}catch(error){evidence.unconfirmed();status.textContent=error?.message==='LINK_TERMINAL_WAIT_REQUIRED'?'先完成步驟 1、2；終端停在等碼提示後才批准。':'操作尚未確認。保留目前紀錄；可按「重新整理」核對，不會自動重送批准。';}schedule();}
 function schedule(){stopPoll();if(disposed||!authenticated||!controller.snapshot().view?.jobs.some(j=>!j.terminal)||doc.hidden||controller.snapshot().busy)return;
  if(!pilotEnd)pilotEnd=Date.now()+900000;if(Date.now()>=pilotEnd)return;timer=setTimeout(()=>void perform(()=>controller.refresh()),3000);}
 const refresh=button('重新整理',()=>controller.refresh()),activate=button('批准啟用已審閱 broker',()=>controller.activate());
 const prepare=button('1. 準備終端命令',()=>{commandStatus.textContent='';copyStatus.textContent='';controller.prepareTerminal();});
 const copyCommand=button('複製終端命令',async()=>{
  const text=command.value;if(!text)throw Error('LINK_COMMAND_UNAVAILABLE');
  try{await globalThis.navigator.clipboard.writeText(text);commandStatus.textContent='命令已複製。切到 AWS 終端貼上，按 Enter；看到「一次性 MC 配對碼（輸入不回顯）:」後回來完成步驟 2。';}
  catch{commandStatus.textContent='複製未確認。可選取上方命令手動複製；配對碼尚未產生。';}
 });
 const ready=button('2. 終端已顯示等碼提示',()=>controller.confirmTerminalReady({explicit:true}));
 const approve=button('批准一次 Ubuntu-1 配對與 pilot',()=>controller.approvePair());
 const copyCode=button('複製一次性配對碼',async()=>{
  const value=controller.snapshot().pairingCode,epoch=copyEpoch;if(!value)return;
  try{await globalThis.navigator.clipboard.writeText(value);if(epoch===copyEpoch&&!disposed)copyStatus.textContent='碼已複製。現在切到剛才等碼的 AWS 終端，貼上、按 Enter。輸入不回顯是正常的；不要貼到聊天或 shell 命令列。';}
  catch{if(epoch===copyEpoch&&!disposed)copyStatus.textContent='複製未確認。留在這個頁面重按「複製一次性配對碼」；先不要切走。';}
 });
 const revoke=button('撤銷目前 worker',()=>controller.revoke(controller.snapshot().view?.worker?.workerId)),pause=button('暫停並撤銷 pilot',()=>controller.pause());
 readActions.append(refresh,activate);commandPanel.append(commandLabel,copyCommand,commandStatus);
 flow.append(steps,stepTitle,help,worker,prepare,commandPanel,ready,approve,code,copyCode,copyStatus);
 safetyActions.append(revoke,pause);root.append(heading,note,status,readActions,flow,safetyActions,jobs,evidence.root);
 function render(s){
  const w=s.view?.worker,hasPending=s.view?.jobs.some(j=>!j.terminal),canPrepare=s.canPrepare,workerId=s.preparedWorker||w?.workerId;
  worker.textContent=workerId?'配對主機 ID：'+workerId:'';
  let text='';try{if(workerId)text=vmBootstrapCommand(workerId);}catch{/* Never interpolate an unqualified identifier. */}
  if(command.value!==text)command.value=text;
  const liveCode=!!s.pairingCode;code.value=s.pairingCode||'';code.hidden=!liveCode;copyCode.hidden=!liveCode;if(!liveCode)copyStatus.textContent='';
  status.textContent=s.busy?(s.view?'正在更新狀態；目前步驟保留。':'核對 Owner 與資料庫…'):s.view?`Broker ${s.view.enabled?'已批准啟用':'停用'} · 已批准 worker 簽章 · 不代表 Owner Auth/AAL2 或 canonical 寫入成功`:'正在讀回 pilot 狀態…';
  activate.hidden=s.view?.enabled===true;prepare.hidden=!canPrepare||!!s.preparedWorker;
  commandPanel.hidden=!text||!!w?.paired||liveCode||!canPrepare;copyCommand.disabled=s.busy||!canPrepare;
  ready.hidden=!canPrepare||!s.preparedWorker||s.terminalReady;approve.hidden=!canPrepare||!s.preparedWorker||!s.terminalReady;revoke.hidden=!w||w.revoked;
  for(const b of [refresh,activate,prepare,ready,approve,revoke,pause])b.disabled=s.busy;
  let stage;
  if(!s.view){stage='loading';stepTitle.textContent='讀回目前狀態';help.textContent='登入確認後會自動讀回；不需重新整理整個網頁。';}
  else if(!s.view.enabled){stage='disabled';stepTitle.textContent='先啟用已審閱 broker';help.textContent='按上方「批准啟用已審閱 broker」，再從步驟 1 開始。';}
  else if(liveCode){stage='code';stepTitle.textContent='步驟 4：先複製碼，再切到終端';help.textContent='按下方「複製一次性配對碼」，直接貼進已經等碼的終端。離開此頁面會清除頁面中的碼；不要再複製命令，也不要重新批准。';}
  else if(w?.paired){stage='paired';stepTitle.textContent='主機已配對';help.textContent='查看下方檢查紀錄。不要重跑安裝命令或新增測試；結束時按「暫停並撤銷 pilot」。';}
  else if(w&&!w.revoked||hasPending){stage='code-unavailable';stepTitle.textContent=s.codeClearedReason==='EXPIRED'?'配對碼已逾時':'配對碼已不在此頁面';help.textContent='若你已複製碼，而且終端仍在等碼，可直接貼入終端。若尚未複製，先按「撤銷目前 worker」，確認原紀錄變成 CANCELLED，再從步驟 1 準備；不要操作檢查紀錄 ID 或重按批准。';}
  else if(!s.preparedWorker){stage='prepare';stepTitle.textContent='步驟 1：準備終端命令';help.textContent='按「1. 準備終端命令」。這一步不產生配對碼，也不會開始測試。';}
  else if(!s.terminalReady){stage='terminal';stepTitle.textContent='步驟 2：先讓終端停在等碼提示';help.textContent='先複製下方命令，在既有 Ubuntu-1 終端貼上並按 Enter。看到「一次性 MC 配對碼（輸入不回顯）:」後，回來按「2. 終端已顯示等碼提示」。此時尚無配對碼，切換頁面不會丟碼。';}
  else{stage='approve';stepTitle.textContent='步驟 3：批准並立即複製碼';help.textContent='終端已在等碼。按「批准一次 Ubuntu-1 配對與 pilot」，接著在本頁按「複製一次性配對碼」，再切到終端貼上；不需要等待聊天指示。';}
  root.dataset.vmLinkStage=stage;
  jobs.replaceChildren();for(const j of s.view?.jobs||[]){const row=node('div');row.append(node('p',`檢查紀錄 ${j.jobId} · fence ${j.fence} · ${j.outcome?'資料庫結果：'+j.outcome:j.cancel?'取消已請求':j.spawnIntent?'已記錄啟動意圖':j.claimed?'已領取':'等待 VM · 尚無執行證據'}`),node('p','這是檢查紀錄 ID，不是配對碼。'));
   if(!j.terminal)row.append(button('請求取消',()=>controller.cancel(j.jobId)));
   if(j.terminal&&!j.claimed&&!j.spawnIntent&&j.outcome==='CANCELLED'&&w?.workerId===j.workerId&&w.paired&&w.enabled&&!w.revoked)row.append(button('重新批准一次 pilot',()=>controller.retry(j.jobId)));
   jobs.append(row);
  }
  evidence.update(s.view);
  if(stage!==lastStage){lastStage=stage;if(stage==='code')queueMicrotask(()=>{if(!disposed&&!doc.hidden)copyCode.scrollIntoView?.({block:'nearest'});});}
 }
 controller=createOwnerVmLink({config,inspectSession,rpc,onChange:render});
 const fullClear=()=>{stopPoll();copyEpoch++;controller.clear();pilotEnd=0;commandStatus.textContent='';copyStatus.textContent='';};
 const visibility=()=>{if(doc.hidden){stopPoll();copyEpoch++;controller.clearPairingCode('PAGE_HIDDEN');copyStatus.textContent='';}else if(authenticated&&!disposed&&!controller.snapshot().busy)void perform(()=>controller.refresh());};
 doc.addEventListener('visibilitychange',visibility);
 return {root,update({projectId,authView}){const was=authenticated;authenticated=projectId==='NEXAEON'&&authView?.status==='authenticated'&&authView.aal==='aal2'&&authView.memberActive===true;root.hidden=!authenticated;
  if(!authenticated)fullClear();else if(!was&&!doc.hidden)void perform(()=>controller.refresh());
 },clear:fullClear,clearPairingCode(){copyEpoch++;controller.clearPairingCode('SESSION_REFRESH');copyStatus.textContent='';},dispose(){disposed=true;authenticated=false;fullClear();doc.removeEventListener('visibilitychange',visibility);controller.dispose();evidence.dispose();root.remove();}};
}
