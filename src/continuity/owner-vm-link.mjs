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
export function createOwnerVmLink({config,inspectSession,rpc,cryptoImpl=globalThis.crypto,onChange=()=>{}}){
 let generation=0,disposed=false,busy=false,view=null,pairingCode=null,pairingWorker=null,codeTimer=null;
 const snapshot=()=>({busy,view,pairingCode,pairingWorker,qualification:'SIGNED_BY_APPROVED_WORKER',canonicalSubmit:false});
 const emit=()=>onChange(snapshot());
 function clear(){clearTimeout(codeTimer);codeTimer=null;generation++;view=null;pairingCode=null;pairingWorker=null;busy=false;emit();}
 async function call(action,body){
  if(disposed||config.enabled!==true||config.projectId!=='NEXAEON'||busy)throw Error('LINK_DISABLED_OR_BUSY');
  const g=generation;busy=true;emit();
  try{const s=await inspectSession('NEXAEON');
   if(g!==generation||disposed||s.status!=='authenticated'||s.verified!==true||s.aal!=='aal2'||s.memberActive!==true)throw Error('LINK_OWNER_SESSION_REQUIRED');
   const response=await rpc({requestId:cryptoImpl.randomUUID(),action,body});
   if(g!==generation||disposed)throw Error('LINK_SESSION_INVALIDATED');
   return response;
  }finally{if(g===generation&&!disposed){busy=false;emit();}}
 }
 async function refresh(){const g=generation,result=validateLinkView(await call('read',{}),config);if(g!==generation||disposed)throw Error('LINK_SESSION_INVALIDATED');view=result;
  if(result.worker?.paired||result.worker?.revoked){pairingCode=null;pairingWorker=null;}emit();return result;}
 const pins=()=>({policyDigest:config.policyDigest,artifactDigest:config.artifactDigest,explicit:true});
 return {snapshot,clear,refresh,
  async activate(){await call('activate',pins());return refresh();},
  async approvePair(){const g=generation;const bytes=cryptoImpl.getRandomValues(new Uint8Array(32));const code='mc_pair_'+btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
   const hash=new Uint8Array(await cryptoImpl.subtle.digest('SHA-256',new TextEncoder().encode(code)));const pairingHash=Array.from(hash,x=>x.toString(16).padStart(2,'0')).join('');const workerId='ubuntu-1-'+cryptoImpl.randomUUID();
   if(g!==generation||disposed)throw Error('LINK_SESSION_INVALIDATED');const ack=await call('approve_pair',{workerId,pairingHash,...pins()});
   if(g!==generation||disposed||ack.workerId!==workerId||ack.policyDigest!==config.policyDigest||ack.artifactDigest!==config.artifactDigest)throw Error('LINK_APPROVAL_UNCONFIRMED');
   pairingCode=code;pairingWorker=workerId;clearTimeout(codeTimer);codeTimer=setTimeout(()=>{pairingCode=null;pairingWorker=null;emit();},600000);codeTimer.unref?.();emit();await refresh();return {workerId,jobId:ack.jobId};},
  async cancel(jobId){if(!id(jobId))throw Error('LINK_JOB_INVALID');await call('cancel',{jobId,explicit:true});return refresh();},
  async revoke(workerId){if(!id(workerId))throw Error('LINK_WORKER_INVALID');await call('revoke',{workerId,explicit:true});pairingCode=null;pairingWorker=null;return refresh();},
  async retry(jobId){const j=view?.jobs.find(x=>x.jobId===jobId);if(!j||!j.terminal||j.claimed||j.spawnIntent||j.outcome!=='CANCELLED')throw Error('LINK_RETRY_DENIED');await call('approve_retry',{workerId:j.workerId,priorJobId:jobId,...pins()});return refresh();},
  async pause(){await call('pause',{explicit:true});pairingCode=null;pairingWorker=null;return refresh();},
  dispose(){clear();disposed=true;}
 };
}
