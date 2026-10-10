import {workbenchProjection,createWorkbenchTransitions,reportDeliveryStatus} from './workbench-projection.mjs';
import {reportTimeNode} from '../../public/report-time.js';
import {formatTakeoverInstruction} from '../../public/takeover-instruction.js';
const memories=new WeakMap();
const words={
 'zh-TW':{cards:'Agent／任務回報',events:'回報事件',explorer:'事件與成果',detail:'選取的回報',graph:'回報關聯',unknown:'目前來源未確認',empty:'尚無 Agent 開工回報',last:'上次確認 · 非即時狀態',current:'目前已確認回報',running:'回報開發中',blocked:'回報受阻',completed:'回報完成',failed:'回報失敗',unconfirmed:'目前未確認',stale:'更新逾時',attention:'選取事件：回報受阻／失敗',limits:'逐檔讀寫／diff／terminal 串流未接入；這裡顯示來源回報事件。',pending:'回報完成不代表 Joey 已驗收。',source:'來源詳情',handoff:'交接成果',tests:'回報測試',code:'成果版本',next:'下一步',historical:'歷史來源記錄',scope:'BASELINE',candidate:'University 候選'},
 en:{cards:'Agent / task reports',events:'Reported events',explorer:'Events and results',detail:'Selected report',graph:'Report relations',unknown:'Current source unconfirmed',empty:'No Agent startup report',last:'Last confirmed · current state unknown',current:'Currently confirmed report',running:'Reports developing',blocked:'Reports blocked',completed:'Reports completed',failed:'Reports failed',unconfirmed:'Currently unconfirmed',stale:'Update overdue',attention:'Selected event: reported blocked / failed',limits:'File reads/edits, diffs and terminal streams are unavailable. These are source-reported events.',pending:'Reported completion does not imply Joey acceptance.',source:'Source details',handoff:'Reported handoff',tests:'Reported tests',code:'Result version',next:'Next step',historical:'Historical source records',scope:'BASELINE',candidate:'University candidate'},
 ko:{cards:'Agent / 작업 보고',events:'보고 이벤트',explorer:'이벤트 및 결과',detail:'선택한 보고',graph:'보고 관계',unknown:'현재 출처 미확인',empty:'Agent 시작 보고 없음',last:'마지막 확인 · 현재 상태 미확인',current:'현재 확인한 보고',running:'개발 중 보고',blocked:'차단 보고',completed:'완료 보고',failed:'실패 보고',unconfirmed:'현재 미확인',stale:'갱신 지연',attention:'선택 이벤트: 차단 / 실패 보고',limits:'파일 읽기/수정, diff 및 터미널 스트림 미연결. 출처가 보고한 이벤트입니다.',pending:'완료 보고가 Joey 검수를 의미하지 않습니다.',source:'출처 상세',handoff:'보고된 인계',tests:'보고된 테스트',code:'결과 버전',next:'다음 단계',historical:'과거 출처 기록',scope:'BASELINE',candidate:'University 후보'}
};
// Transient authenticated UI memory only; no transport/storage, no private URL state.
export function mountRunWorkbench({owner,doc=document,projectId,track='BASELINE',locale='zh-TW',targets,onProject=()=>{},onSelect=()=>{},now=Date.now}={}){
 const w=words[locale]||words['zh-TW'];let memory=memories.get(owner);if(!memory){memory={scopes:new Map(),transitions:createWorkbenchTransitions(),selections:new Map(),follow:new Map()};memories.set(owner,memory);}
 const scope=JSON.stringify([projectId,track]),el=(tag,text,cls)=>{const n=doc.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
 const hosts={};for(const key of ['cards','events','explorer','explorerMobile','detail','graph']){hosts[key]=el('section',null,'run-workbench-'+key);hosts[key].dataset.runWorkbench=key==='explorerMobile'?'explorer-mobile':key;targets[key]?.prepend(hosts[key]);}
 let disposed=false,sourceView,reportView,timer,selected=memory.selections.get(scope)||null,prepared=null,busy=false,dialogGeneration=0;
 const handoffWords=locale==='ko'?['인계','닫기','최신 출처와 보고를 다시 확인하여 인계 지시를 복사합니다. Agent 실행이나 새 권한 부여 없음.','인계 지시 복사','확인 중…','출처 또는 보고 미확인. 다시 읽으세요.','복사됨. 제품 검수를 뜻하지 않습니다.','전체 지시를 선택하여 시스템 복사를 사용하세요.']:locale==='en'?['Handoff','Close','Recheck current source and reports, then copy the takeover instruction. No Agent execution or new permission.','Copy takeover instruction','Checking…','Source or reports unconfirmed. Read again.','Copied. Product acceptance remains pending.','Select the whole instruction and use system Copy.']:['交接','關閉','重新核對最新來源與回報後複製接手指令；不啟動 Agent、不授予新權限。','複製接手指令','正在核對…','來源或回報未確認，請重新讀取。','已複製；產品驗收仍待確認。','請全選指令並使用系統複製。'];
 const dialog=el('dialog',null,'run-workbench-handoff'),title=el('h3',handoffWords[0]),note=el('p',handoffWords[2]),copy=el('button',handoffWords[3]),close=el('button',handoffWords[1]),status=el('p'),instruction=el('textarea');
 dialog.dataset.runHandoff='true';instruction.readOnly=true;instruction.dataset.runHandoffInstruction='true';instruction.setAttribute('aria-label',handoffWords[3]);copy.type=close.type='button';copy.dataset.runHandoffCopy='true';status.setAttribute('role','status');dialog.append(title,note,copy,close,status,instruction);doc.body.append(dialog);
 const purgePacket=()=>{prepared=null;instruction.value='';instruction.hidden=true;};purgePacket();
 close.addEventListener('click',()=>dialog.close());dialog.addEventListener('close',()=>{dialogGeneration++;purgePacket();status.textContent='';});
 copy.addEventListener('click',async()=>{if(busy||disposed)return;const requestGeneration=dialogGeneration;busy=true;purgePacket();copy.disabled=true;status.textContent=handoffWords[4];try{const value=await owner.sourceController?.copyContinuation({format:formatTakeoverInstruction,displayPacket:false});if(disposed||requestGeneration!==dialogGeneration||!dialog.open||owner.dataset.ownerAuth!=='verified'||!value||value.projectId!==projectId||(value.track||'BASELINE')!==track||!owner.repositoryRunsController?.continuationCurrent(value.repositoryReports))return;prepared=value;if(owner.sourceController.root.dataset.copyOutcome==='copied')status.textContent=handoffWords[6];else{instruction.value=formatTakeoverInstruction(value);instruction.hidden=false;status.textContent=handoffWords[7];instruction.focus();instruction.select();}}catch{status.textContent=handoffWords[5];}finally{busy=false;if(!disposed){copy.disabled=false;if(!prepared)status.textContent=handoffWords[5];}}});
 const button=(text,key,kind,action)=>{const b=el('button',text,'run-workbench-item');b.type='button';b.dataset.runSelection=key;b.dataset.runControl=kind;b.setAttribute('aria-pressed',String(key===selected));b.addEventListener('click',action||(()=>{selected=key;memory.selections.set(scope,key);memory.follow.set(scope,false);paint();onSelect();}));return b;};
 const clear=()=>{memory.scopes.clear();memory.selections.clear();memory.follow.clear();memory.transitions.clear();};
 function paint(){if(disposed)return;clearTimeout(timer);
  const focus=doc.activeElement?.dataset.runSelection?{key:doc.activeElement.dataset.runSelection,kind:doc.activeElement.dataset.runControl}:null;
  const positions=Object.values(hosts).map(n=>({n,top:n.parentElement?.scrollTop||0}));
  for(const n of Object.values(hosts))n.replaceChildren();
  const auth=owner.dataset.ownerAuth;if(auth!=='verified'){targets.graph.dataset.privateRunGraph='false';targets.detail.dataset.privateRunDetails='false';
   purgePacket();if(dialog.open)dialog.close();
   if(['signed_out','unconfirmed','unconfigured'].includes(auth))clear();
   hosts.events.append(el('p',w.unknown,'run-workbench-notice'));return;
  }
  if(['denied','conflict','closed'].includes(sourceView?.status)||['denied','conflict','closed'].includes(reportView?.status))clear();
  const projection=workbenchProjection({sourceView,reportView,projectId,track,now:now()});
  hosts.events.dataset.workbenchState=projection.status;
  const fresh=projection.status==='confirmed'||projection.status==='empty';
  targets.graph.dataset.privateRunGraph=String(fresh&&projection.events.length>0);targets.detail.dataset.privateRunDetails=String(fresh&&projection.events.length>0);
  if(!fresh||prepared&&!owner.repositoryRunsController?.continuationCurrent(prepared.repositoryReports))purgePacket();
  if(fresh)memory.scopes.set(scope,{projectId,track,projection});
  const changes=fresh?memory.transitions.observe(scope,projection.events):[];
  for(const [key,label]of Object.entries({cards:w.cards,events:w.events,explorer:w.explorer,explorerMobile:w.explorer,detail:w.detail,graph:w.graph}))hosts[key].append(el('h4',label));
  for(const [key,cached]of memory.scopes)for(const row of cached.projection.runs){const p=row.presentation,current=fresh&&key===scope,b=button(p.agentName+' · '+(current?(w[p.currentState]||w.unconfirmed):w.last),row.report.runId,'card',()=>{if(current){memory.follow.set(scope,true);selected=cached.projection.events.filter(e=>e.runId===p.runId).at(-1)?.key;memory.selections.set(scope,selected);paint();onSelect();}else onProject({project:cached.projectId,track:cached.track});});b.classList.add('run-workbench-card');b.dataset.reportedState=p.reportedState;b.dataset.cardScope=current?'current':'last-confirmed';b.append(el('strong',p.featureTitle),el('small',cached.projectId+' · '+(cached.track==='UNIVERSITY_CANDIDATE'?w.candidate:w.scope)),el('small',current?w.current:w.last),reportTimeNode(doc,p.eventAt,{locale}));hosts.cards.append(b);}
  if(!fresh){hosts.events.append(el('p',w.unknown,'run-workbench-notice'));hosts.detail.append(el('p',w.unknown));return;}
  if(!projection.events.length){hosts.events.append(el('p',w.empty));return;}
  if(memory.follow.get(scope)!==false||!projection.events.some(e=>e.key===selected))selected=projection.events.at(-1).key;
  memory.selections.set(scope,selected);
  for(const row of projection.events){const b=button(row.agentName+' · '+row.event.kind,row.key,'event');b.append(reportTimeNode(doc,row.event.eventAt,{locale}),el('p',row.event.summary));b.dataset.runEventSequence=String(row.event.sequence);if(changes.includes(row.key)){b.dataset.newReportEvent='true';if(!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches)b.classList.add('run-event-arrived');}hosts.events.append(b);
   const x=button(row.agentName+' · '+row.event.kind+' #'+row.event.sequence,row.key,'explorer');hosts.explorer.append(x);hosts.explorerMobile.append(button(row.agentName+' · '+row.event.kind+' #'+row.event.sequence,row.key,'explorer-mobile'));
   const g=button(row.agentName+' → '+row.event.kind+' #'+row.event.sequence,row.key,'graph');hosts.graph.append(g);
  }
  const row=projection.events.find(e=>e.key===selected);for(const b of hosts.cards.querySelectorAll('[data-card-scope=current]'))b.setAttribute('aria-pressed',String(b.dataset.runSelection===row.runId));const p=projection.runs.find(r=>r.report.runId===row.runId).presentation;
  hosts.detail.append(el('p',row.agentName+' · '+(w[p.currentState]||w.unconfirmed),'run-workbench-agent'),el('h5',row.featureTitle),el('strong',row.event.kind+' · #'+row.event.sequence),reportTimeNode(doc,row.event.eventAt,{locale}),el('p',row.event.summary,'run-workbench-summary'));
  hosts.detail.dataset.selectedEventSequence=String(row.event.sequence);hosts.detail.dataset.selectedRun=row.runId;
  if(['blocked','failed'].includes(row.event.kind))hosts.detail.append(el('p',w.attention,'run-workbench-attention'));
  const proof=el('details'),caption=el('summary',w.source);proof.append(caption,el('p','ISO · '+row.event.eventAt),el('p',row.runId+' · '+row.source.repositoryId+' @ '+row.source.resolvedCommitSha),el('p',row.source.path),el('p','Source read ISO · '+row.source.readAt));hosts.detail.append(proof);
  if(row.event.result){const r=row.event.result;hosts.detail.append(el('p',w.pending),el('p',w.code+' · '+r.codeSha),el('p',w.handoff+' · '+r.handoff.path+' @ '+r.handoff.commitSha),el('p',w.next+' · '+r.nextSteps));for(const test of r.tests)hosts.detail.append(el('p',w.tests+' · '+test.outcome+' · '+test.name));const artifact=button(r.handoff.path,row.key,'artifact');artifact.dataset.reportArtifact='handoff';hosts.explorer.append(artifact);const mobileArtifact=button(r.handoff.path,row.key,'artifact-mobile');mobileArtifact.dataset.reportArtifact='handoff';hosts.explorerMobile.append(mobileArtifact);}
  hosts.detail.append(el('p',w.limits,'run-workbench-limits'));
  if(row.event.kind==='completed'){const delivery=reportDeliveryStatus(p),message=locale==='ko'?'개발 완료 보고 · 배포 증거 / 고정 URL 검증 대기. 데이터 / migration 상태는 보고에 미기록.':locale==='en'?'Coding completion reported · deployment evidence / fixed URL verification pending. Data / migration state is unrecorded in this report.':'開發回報完成 · 部署證據／固定網址可用性驗證待確認；此回報未記錄資料／migration 狀態。';const d=el('p',message,'run-workbench-delivery');d.dataset.deploymentEvidence=delivery.deployment;d.dataset.fixedUrlEvidence=delivery.fixedUrl;hosts.detail.append(d);}
  const handoff=el('button',handoffWords[0],'run-workbench-item');handoff.type='button';handoff.dataset.runHandoffOpen='true';handoff.addEventListener('click',()=>{dialogGeneration++;purgePacket();status.textContent='';dialog.showModal();});hosts.detail.append(handoff);
  hosts.graph.prepend(el('p',row.runId,'run-workbench-graph-root'));
  for(const {n,top}of positions)if(n.parentElement)n.parentElement.scrollTop=top;
  if(focus){const b=[...Object.values(hosts).flatMap(n=>[...n.querySelectorAll('[data-run-selection]')])].find(n=>n.dataset.runSelection===focus.key&&n.dataset.runControl===focus.kind);b?.focus({preventScroll:true});}
  const expiry=projection.runs.map(r=>Date.parse(r.presentation.expiresAt)).filter(t=>t>now());if(expiry.length)timer=setTimeout(paint,Math.min(...expiry)-now()+1);
 }
 const unsubSource=owner.sourceController?.subscribe(v=>{sourceView=v;paint();}),unsubReport=owner.repositoryRunsController?.subscribe(v=>{reportView=v;paint();});
 const observer=new MutationObserver(()=>paint());observer.observe(owner,{attributes:true,attributeFilter:['data-owner-auth']});
 paint();return{dispose(){disposed=true;purgePacket();if(dialog.open)dialog.close();dialog.remove();clearTimeout(timer);unsubSource?.();unsubReport?.();observer.disconnect();Object.values(hosts).forEach(n=>n.remove());}};
}
