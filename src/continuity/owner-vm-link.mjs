// Additive, default-off Owner adapter. Reuses the existing SDK client and verifier.
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(v);
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const kinds=new Set(['session_started','turn_started','item_started','item_updated','item_completed','turn_completed','turn_failed','provider_error','transport_open','stdout_eof','process_error','process_exit','cancel_requested']);
export function validateLinkView(v,config){
 if(!v||JSON.stringify(v).length>2000000||v.release!=='0.1.1'||typeof v.enabled!=='boolean'||v.policyDigest!==config.policyDigest||v.artifactDigest!==config.artifactDigest||!Array.isArray(v.jobs)||v.jobs.length>16)throw Error('LINK_VIEW_INVALID');
 if(v.worker&&(!id(v.worker.workerId)||!['enabled','revoked','paired'].every(k=>typeof v.worker[k]==='boolean')||!(v.worker.keyDigest===null||hex(v.worker.keyDigest))))throw Error('LINK_VIEW_INVALID');
 for(const j of v.jobs){
  if(!['jobId','attemptId','workerId'].every(k=>id(j[k]))||!Number.isSafeInteger(j.fence)||j.fence<1||j.task!=='SMOKE_CONNECTION_V1'||!['claimed','spawnIntent','cancel','terminal'].every(k=>typeof j[k]==='boolean')||!['COMPLETED','FAILED','CANCELLED','UNKNOWN',null].includes(j.outcome)||!Array.isArray(j.events)||j.events.length>128)throw Error('LINK_VIEW_INVALID');
  for(const [i,e]of j.events.entries())if(!id(e.eventId)||e.seq!==i+1||!Number.isSafeInteger(e.observedAt)||!kinds.has(e.payload?.kind)||Object.keys(e.payload).sort().join(',')!=='commandExitCode,errorClass,itemId,itemStatus,itemType,kind,processExitCode,signal,threadId')throw Error('LINK_VIEW_INVALID');
 }
 return v;
}
export function createOwnerVmLink({config,inspectSession,rpc,cryptoImpl=globalThis.crypto,onChange=()=>{},now=Date.now,setTimer=setTimeout,clearTimer=clearTimeout}){
 let generation=0,codeEpoch=0,disposed=false,busy=false,pairPending=false,view=null,pairingCode=null,pairingWorker=null,codeTimer=null;
 let preparedWorker=null,terminalReady=false,codeExpiresAt=null,codeClearedReason=null;
 const canPrepare=()=>!!view&&view.enabled&&!view.jobs.some(j=>!j.terminal)&&(!view.worker||!view.worker.enabled&&view.worker.revoked);
 const snapshot=()=>({busy:busy||pairPending,view,pairingCode,pairingWorker,preparedWorker,terminalReady,codeExpiresAt,codeClearedReason,canPrepare:canPrepare(),qualification:'SIGNED_BY_APPROVED_WORKER',canonicalSubmit:false});
 const emit=()=>onChange(snapshot());
 function clearPairingCode(reason='PAGE_HIDDEN'){
  clearTimer(codeTimer);codeTimer=null;codeEpoch++;pairingCode=null;pairingWorker=null;codeClearedReason=reason;emit();
 }
 function clear(){clearTimer(codeTimer);codeTimer=null;generation++;codeEpoch++;view=null;pairingCode=null;pairingWorker=null;preparedWorker=null;terminalReady=false;codeExpiresAt=null;codeClearedReason=null;busy=false;pairPending=false;emit();}
 async function call(action,body,guard=()=>true){
  if(disposed||config.enabled!==true||config.projectId!=='NEXAEON'||busy||pairPending&&action!=='approve_pair')throw Error('LINK_DISABLED_OR_BUSY');
  const g=generation;busy=true;emit();
  try{const s=await inspectSession('NEXAEON');
   if(g!==generation||disposed||s.status!=='authenticated'||s.verified!==true||s.aal!=='aal2'||s.memberActive!==true)throw Error('LINK_OWNER_SESSION_REQUIRED');
   if(!guard())throw Error('LINK_PAIRING_CODE_CLEARED');
   const response=await rpc({requestId:cryptoImpl.randomUUID(),action,body});
   if(g!==generation||disposed)throw Error('LINK_SESSION_INVALIDATED');
   return response;
  }finally{if(g===generation&&!disposed){busy=false;emit();}}
 }
 async function refresh(){const g=generation,result=validateLinkView(await call('read',{}),config);if(g!==generation||disposed)throw Error('LINK_SESSION_INVALIDATED');view=result;
  const currentRevoked=result.worker?.revoked&&(!preparedWorker||result.worker.workerId===preparedWorker);
  if(result.worker?.paired||currentRevoked||!result.enabled){clearTimer(codeTimer);codeTimer=null;pairingCode=null;pairingWorker=null;codeExpiresAt=null;terminalReady=false;codeClearedReason=null;preparedWorker=null;}
  emit();return result;}
 const pins=()=>({policyDigest:config.policyDigest,artifactDigest:config.artifactDigest,explicit:true});
 return {snapshot,clear,clearPairingCode,refresh,
  prepareTerminal(){
   if(disposed||config.enabled!==true||config.projectId!=='NEXAEON'||busy||pairPending||!canPrepare())throw Error('LINK_PREPARATION_UNAVAILABLE');
   if(!preparedWorker){preparedWorker='ubuntu-1-'+cryptoImpl.randomUUID();terminalReady=false;codeClearedReason=null;}
   emit();return preparedWorker;
  },
  confirmTerminalReady({explicit=false}={}){
   if(!explicit||!preparedWorker||disposed||busy||pairPending||!canPrepare())throw Error('LINK_TERMINAL_WAIT_REQUIRED');
   terminalReady=true;emit();
  },
  async activate(){await call('activate',pins());return refresh();},
  async approvePair(){
   if(disposed||busy||pairPending||!preparedWorker||!terminalReady||!canPrepare())throw Error('LINK_TERMINAL_WAIT_REQUIRED');
   const g=generation,epoch=codeEpoch,workerId=preparedWorker;pairPending=true;emit();
   try{
    const bytes=cryptoImpl.getRandomValues(new Uint8Array(32));const code='mc_pair_'+btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
    const hash=new Uint8Array(await cryptoImpl.subtle.digest('SHA-256',new TextEncoder().encode(code)));const pairingHash=Array.from(hash,x=>x.toString(16).padStart(2,'0')).join('');
    if(g!==generation||disposed)throw Error('LINK_SESSION_INVALIDATED');
    const ack=await call('approve_pair',{workerId,pairingHash,...pins()},()=>epoch===codeEpoch);
    if(g!==generation||disposed||ack.workerId!==workerId||ack.policyDigest!==config.policyDigest||ack.artifactDigest!==config.artifactDigest)throw Error('LINK_APPROVAL_UNCONFIRMED');
    terminalReady=false;
    if(epoch===codeEpoch){
     pairingCode=code;pairingWorker=workerId;codeClearedReason=null;
     codeExpiresAt=Math.min(now()+600000,Number.isSafeInteger(ack.pairingUntil)?ack.pairingUntil:Infinity);
     clearTimer(codeTimer);codeTimer=setTimer(()=>clearPairingCode('EXPIRED'),Math.max(0,codeExpiresAt-now()));codeTimer?.unref?.();
    }
    pairPending=false;emit();await refresh();return {workerId,jobId:ack.jobId,codeAvailable:pairingCode!==null};
   }finally{if(g===generation&&!disposed){pairPending=false;emit();}}
  },
  async cancel(jobId){if(!id(jobId))throw Error('LINK_JOB_INVALID');await call('cancel',{jobId,explicit:true});return refresh();},
  async revoke(workerId){if(!id(workerId))throw Error('LINK_WORKER_INVALID');await call('revoke',{workerId,explicit:true});pairingCode=null;pairingWorker=null;return refresh();},
  async retry(jobId){const j=view?.jobs.find(x=>x.jobId===jobId),w=view?.worker;if(!j||!j.terminal||j.claimed||j.spawnIntent||j.outcome!=='CANCELLED'||w?.workerId!==j.workerId||!w.paired||!w.enabled||w.revoked)throw Error('LINK_RETRY_DENIED');await call('approve_retry',{workerId:j.workerId,priorJobId:jobId,...pins()});return refresh();},
  async pause(){await call('pause',{explicit:true});pairingCode=null;pairingWorker=null;return refresh();},
  dispose(){clear();disposed=true;}
 };
}
