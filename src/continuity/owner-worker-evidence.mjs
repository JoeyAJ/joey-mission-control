// Browser-only projection of the existing qualified Owner view. No IO or authority.
import {validateLinkView} from './owner-vm-link.mjs';
export const evidenceFreshnessMs=15000;
const payloadKeys=['kind','threadId','itemId','itemType','itemStatus','commandExitCode','processExitCode','signal','errorClass'];
const kinds=new Set(['session_started','turn_started','item_started','item_updated','item_completed','turn_completed','turn_failed','provider_error','transport_open','stdout_eof','process_error','process_exit','cancel_requested']);
const itemTypes=new Set(['agent_message','reasoning','command_execution','file_change','mcp_tool_call','web_search','todo_list','error','unknown']);
const forbiddenTypes=new Set(['command_execution','file_change','mcp_tool_call','web_search']);
const signals=new Set(['SIGINT','SIGTERM','SIGKILL','SIGABRT','SIGSEGV','SIGHUP','SIGQUIT','SIGPIPE','SIGALRM','SIGBUS','SIGFPE','SIGILL','SIGTRAP','SIGXCPU','SIGXFSZ','SIGSYS','SIGUSR1','SIGUSR2']);
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(v)&&!/^mc_pair_|^sb_(?:secret|publishable)_/.test(v);
const time=v=>Number.isSafeInteger(v)&&v>=0&&v<=8640000000000000;
const exit=v=>Number.isInteger(v)&&v>=0&&v<=255;
const exact=(v,keys)=>v&&Object.keys(v).sort().join('|')===[...keys].sort().join('|');
const fail=()=>{throw Error('WORKER_EVIDENCE_INVALID');};
function plainData(value){
 const seen=new Set();let count=0;
 function visit(v,depth){
  if(++count>65536||depth>16)fail();
  if(v===null||typeof v==='boolean')return;
  if(typeof v==='string'){if(v.length>4096)fail();return;}
  if(typeof v==='number'){if(!Number.isFinite(v))fail();return;}
  if(typeof v!=='object'||seen.has(v))fail();
  const array=Array.isArray(v),proto=Object.getPrototypeOf(v);
  if(array?proto!==Array.prototype:proto!==Object.prototype&&proto!==null)fail();
  const descriptors=Object.getOwnPropertyDescriptors(v),keys=Reflect.ownKeys(descriptors);
  if(keys.length>4097||array&&keys.length!==v.length+1)fail();seen.add(v);
  for(const key of keys){const d=descriptors[key];if(typeof key!=='string'||!('value'in d))fail();if(array&&key==='length')continue;
   if(!d.enumerable||key==='toJSON'||array&&!/^(0|[1-9]\d*)$/.test(key))fail();visit(d.value,depth+1);
  }seen.delete(v);
 }
 if(Object.getOwnPropertyDescriptor(Object.prototype,'toJSON')||Object.getOwnPropertyDescriptor(Array.prototype,'toJSON'))fail();
 visit(value,0);if(new TextEncoder().encode(JSON.stringify(value)).length>2000000)fail();
}
function safePayload(p){
 if(!exact(p,payloadKeys)||!kinds.has(p.kind))fail();
 const expected=Object.fromEntries(payloadKeys.map(k=>[k,k==='kind'?p.kind:null]));
 if(p.kind==='session_started'){if(!id(p.threadId))fail();expected.threadId=p.threadId;}
 if(p.kind.startsWith('item_')){
  if(!id(p.itemId)||!itemTypes.has(p.itemType)||p.itemStatus!==null&&!['in_progress','completed','failed'].includes(p.itemStatus))fail();
  if(p.kind==='item_started'&&p.itemStatus!==null&&p.itemStatus!=='in_progress'||p.kind==='item_completed'&&p.itemStatus==='in_progress')fail();
  expected.itemId=p.itemId;expected.itemType=p.itemType;expected.itemStatus=p.itemStatus;
  if(p.commandExitCode!==null){if(p.itemType!=='command_execution'||!exit(p.commandExitCode))fail();expected.commandExitCode=p.commandExitCode;}
 }
 if(['turn_failed','provider_error'].includes(p.kind))expected.errorClass='PROVIDER_ERROR';
 if(p.kind==='process_error'){if(!['SPAWN_FAILURE','PIPE_FAILURE','UNKNOWN_TRANSPORT_ERROR'].includes(p.errorClass))fail();expected.errorClass=p.errorClass;}
 if(p.kind==='process_exit'){
  if(!(exit(p.processExitCode)&&p.signal===null||p.processExitCode===null&&signals.has(p.signal)))fail();
  expected.processExitCode=p.processExitCode;expected.signal=p.signal;
 }
 if(!payloadKeys.every(k=>p[k]===expected[k]))fail();return expected;
}
function freeze(v){if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;}
export function workerEvidence({view,config,readAt,now}={}){
 if(config?.enabled!==true||config.projectId!=='NEXAEON'||!time(readAt)||!time(now)||readAt>now)fail();
 plainData(view);validateLinkView(view,config);
 if(view.worker&&!id(view.worker.workerId))fail();
 const jobIds=new Set(),attemptIds=new Set(),fences=new Set();
 const jobs=view.jobs.map(j=>{
  if(![j.jobId,j.attemptId,j.workerId].every(id)||jobIds.has(j.jobId)||attemptIds.has(j.attemptId)||fences.has(j.fence))fail();
  jobIds.add(j.jobId);attemptIds.add(j.attemptId);fences.add(j.fence);
  for(const k of ['leaseUntil','expiresAt'])if(j[k]!==undefined&&j[k]!==null&&!time(j[k]))fail();
  const eventIds=new Set();const events=j.events.map(e=>{
   if(!exact(e,['eventId','seq','observedAt','payload'])||!id(e.eventId)||eventIds.has(e.eventId)||!time(e.observedAt)||e.observedAt>readAt+30000)fail();
   eventIds.add(e.eventId);return{eventId:e.eventId,seq:e.seq,observedAt:e.observedAt,payload:safePayload(e.payload)};
  });
  const turns=events.filter(e=>e.payload.kind==='turn_completed'),exits=events.filter(e=>e.payload.kind==='process_exit');
  const failed=events.some(e=>['turn_failed','provider_error','process_error'].includes(e.payload.kind)||e.payload.itemType==='error'||e.payload.itemStatus==='failed'||e.payload.processExitCode!==null&&e.payload.processExitCode!==0||e.payload.signal!==null);
  const prohibited=events.some(e=>forbiddenTypes.has(e.payload.itemType));
  const cancelled=j.cancel||events.some(e=>e.payload.kind==='cancel_requested');
  const orderConflict=events.some((e,i)=>i>0&&e.observedAt<events[i-1].observedAt);
  const reasons=[];
  if(j.spawnIntent&&!j.claimed||events.length&&!j.spawnIntent)reasons.push('EVENTS_OR_SPAWN_WITHOUT_CLAIM');
  if(j.terminal?j.outcome===null:j.outcome!==null)reasons.push('TERMINAL_OUTCOME_CONFLICT');
  if(orderConflict)reasons.push('SOURCE_TIME_ORDER_CONFLICT');
  if(exits.length>1)reasons.push('MULTIPLE_PROCESS_EXITS');
  const turnExitMatch=turns.length===1&&exits.length===1&&exits[0].seq>turns[0].seq&&exits[0].payload.processExitCode===0;
  const completionConfirmed=j.terminal&&j.outcome==='COMPLETED'&&j.claimed&&j.spawnIntent&&turnExitMatch&&!failed&&!prohibited&&!cancelled&&!reasons.length;
  if(j.outcome==='COMPLETED'&&!completionConfirmed)reasons.push('COMPLETION_EVIDENCE_INCONSISTENT');
  const observedAt=events.at(-1)?.observedAt??null;
  const matched=view.worker?.workerId===j.workerId;
  const qualifiedWorker=matched&&view.worker.paired&&view.worker.enabled&&!view.worker.revoked;
  const leaseUntil=j.leaseUntil??null,expiresAt=j.expiresAt??null;
  const leaseValid=time(leaseUntil)&&time(expiresAt)&&now<leaseUntil&&now<expiresAt;
  const fresh=now-readAt<evidenceFreshnessMs&&observedAt!==null&&observedAt<=readAt&&now-observedAt<evidenceFreshnessMs;
  let state;
  if(reasons.length)state='INCONSISTENT';
  else if(j.terminal)state=j.outcome==='COMPLETED'?'COMPLETED_CONFIRMED':j.outcome==='CANCELLED'?'CANCELLED':j.outcome==='FAILED'?'FAILED':'UNKNOWN';
  else if(cancelled)state='CANCEL_REQUESTED';
  else if(failed||prohibited){state='FAILURE_REPORTED';reasons.push(prohibited?'PROHIBITED_TOOL_REPORTED':'FAILURE_REPORTED');}
  else if(!j.claimed)state='WAITING_UNCLAIMED';
  else if(!view.enabled||!qualifiedWorker){state='UNCONFIRMED';reasons.push(!view.enabled?'BROKER_DISABLED':matched?'WORKER_DISABLED_OR_REVOKED':'WORKER_NOT_IN_CURRENT_VIEW');}
  else if(!leaseValid||now-readAt>=evidenceFreshnessMs){state='STALE';reasons.push(!leaseValid?'LEASE_MISSING_OR_EXPIRED':'READBACK_EXPIRED');}
  else if(observedAt>readAt){state='UNCONFIRMED';reasons.push('SOURCE_TIME_AHEAD_OF_READ');}
  else if(j.spawnIntent&&events.length&&!fresh){state='STALE';reasons.push('EVENT_EXPIRED');}
  else if(j.spawnIntent&&fresh&&!exits.length)state='RUNNING_REPORTED';
  else if(exits.length){state='AWAITING_OUTCOME';reasons.push('PROCESS_EXIT_IS_NOT_SERVER_COMPLETION');}
  else state=j.spawnIntent?'SPAWN_INTENT_RECORDED':'CLAIMED';
  const validUntil=!j.terminal&&j.claimed?Math.min(readAt+evidenceFreshnessMs,leaseUntil??now,expiresAt??now,...(observedAt!==null?[observedAt+evidenceFreshnessMs]:[])):null;
  return{jobId:j.jobId,attemptId:j.attemptId,workerId:j.workerId,fence:j.fence,task:j.task,claimed:j.claimed,spawnIntent:j.spawnIntent,cancel:j.cancel,terminal:j.terminal,outcome:j.outcome,leaseUntil,expiresAt,events,state,reasons,completionConfirmed,observedAt,readAt,validUntil,
   evidence:{turnCompleted:turns.length>0,processExited:exits.length>0,processExitCode:exits.at(-1)?.payload.processExitCode??null,signal:exits.at(-1)?.payload.signal??null,failureReported:failed,prohibitedToolReported:prohibited},
   currentWork:state==='RUNNING_REPORTED',qualification:events.length?'SIGNED_BY_APPROVED_WORKER':'NO_WORKER_EVENTS',actor:null,model:null};
 });
 return freeze({schemaVersion:'mc.private-worker-evidence.v1',projectId:'NEXAEON',readAt,jobs,state:jobs.length?'RECORDS':'EMPTY',canonicalSubmit:false,automaticExecution:false});
}
