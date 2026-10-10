// Private in-memory consumer. An authenticated repository service must be injected.
// No ambient client, fetch, credentials, persistent storage or public app wiring.
import {ownerAgentSelection} from './agent-handoff-selection.mjs';
const sha=/^[a-f0-9]{40}$/,digest=/^[a-f0-9]{64}$/;
const states=new Set(['FOUND','STALE','UNPARSED','CONFLICT','MISSING','ACCESS_DENIED','UNAVAILABLE','TOO_LARGE','UNSUPPORTED_TYPE']);
const clone=value=>structuredClone(value);
export function createRemoteHandoffReader({enabled=false,ownerSubject,configuration,inspectCurrentOwner,authorizeSource=null,sourceRead,digestText,now=Date.now,intervalMs=30000,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 const configured=enabled===true&&typeof ownerSubject==='string'&&!!configuration?.projectId&&typeof inspectCurrentOwner==='function'&&typeof sourceRead==='function'&&typeof digestText==='function'&&Number.isInteger(intervalMs)&&intervalMs>=5000&&intervalMs<=300000;
 const config=configuration?clone(configuration):null,listeners=new Set();let generation=0,disposed=false,automatic=false,visible=true,timer=null,expiryTimer=null,abort=null,inFlight=null,expiresAt=0;
 let status=configured?'idle':'unconfigured',observation=null,lastConfirmed=null,lastAttemptAt=null,nextReadAt=null;
 const clearSchedule=()=>{if(timer!==null)clearTimer(timer);timer=null;nextReadAt=null;};
 const clearExpiry=()=>{if(expiryTimer!==null)clearTimer(expiryTimer);expiryTimer=null;};
 const expire=()=>{generation++;abort?.abort();abort=null;inFlight=null;expiresAt=0;observation=null;lastConfirmed=null;status='denied';automatic=false;clearSchedule();clearExpiry();};
 const snapshot=()=>{if(expiresAt&&expiresAt<=now())expire();return clone({configured:configured&&!disposed,status,automatic,visible,intervalMs,lastAttemptAt,nextReadAt,observation,lastConfirmed,executionAuthorized:false,runtimeConnected:false});};
 const emit=()=>{const view=snapshot();for(const listener of listeners)listener(clone(view));};
 const requireOwner=async current=>{const actor=await inspectCurrentOwner(config.projectId);current();const sourceAllowed=actor?.projects?.includes(config.projectId)||typeof authorizeSource==='function'&&authorizeSource(actor,config)===true;if(actor?.status!=='authenticated'||actor.subject!==ownerSubject||actor.role!=='OWNER'||actor.aal!=='aal2'||actor.verified!==true||actor.sessionActive!==true||actor.memberActive!==true||!sourceAllowed||!Number.isSafeInteger(actor.expiresAt)||actor.expiresAt<=now())throw Error('REMOTE_HANDOFF_OWNER_REQUIRED');expiresAt=actor.expiresAt;clearExpiry();expiryTimer=setTimer(()=>{expiryTimer=null;expire();emit();},expiresAt-now());};
 async function validate(value){
  const v=clone(value);if(v?.schemaVersion!==1||v.projectId!==config.projectId||!states.has(v.status)||v.runtimeConnected!==false||v.executionAuthorized!==false||v.currentAgent!==null||v.currentModel!==null||v.source?.qualification!=='REMOTE_FILE_READ'||v.source.repositoryId!==config.repositoryId||v.source.requestedRef!==config.ref||![config.path,config.legacyPath].filter(Boolean).includes(v.source.path)||!Number.isFinite(Date.parse(v.source.readAt))||Date.parse(v.source.readAt)>now()+5000||v.source.resolvedCommitSha!==null&&!sha.test(v.source.resolvedCommitSha))throw Error('REMOTE_HANDOFF_BINDING');
  if(config.track&&(v.track!==config.track||v.entryQualification!==config.entryQualification||v.sourceReadIsProductAcceptance!==false))throw Error('REMOTE_HANDOFF_BINDING');
  if(config.track&&(!Array.isArray(v.contextDocuments)||v.contextDocuments.some(d=>!config.contextPaths.includes(d.path)||d.resolvedCommitSha!==v.source.resolvedCommitSha||d.status==='FOUND'&&(!sha.test(d.providerBlobId)||!digest.test(d.contentSha256)))))throw Error('REMOTE_HANDOFF_BINDING');
  if(v.source.expectedBaseline!==(config.expectedBaseline||null)||v.baselineChanged!==(!!config.expectedBaseline&&v.source.resolvedCommitSha!==null&&config.expectedBaseline!==v.source.resolvedCommitSha)||v.source.path===config.path&&v.entryMode!=='ROOT'||v.source.path===config.legacyPath&&(v.entryMode!=='EXPLICIT_LEGACY_MAPPING'||v.primaryEntryStatus!=='MISSING'))throw Error('REMOTE_HANDOFF_BINDING');
  if(v.document!==null){if(!sha.test(v.source.resolvedCommitSha)||typeof v.document!=='string'||new TextEncoder().encode(v.document).length>65536||!digest.test(v.source.contentSha256)||await digestText(v.document)!==v.source.contentSha256)throw Error('REMOTE_HANDOFF_INTEGRITY');}
  else if(v.source.contentSha256!==null||v.progress!==null)throw Error('REMOTE_HANDOFF_INTEGRITY');
  if(['FOUND','STALE'].includes(v.status)&&v.progress?.qualification!=='DOCUMENT_REPORTED'||!['FOUND','STALE'].includes(v.status)&&v.progress!==null)throw Error('REMOTE_HANDOFF_PROGRESS');
  return v;
 }
 const schedule=()=>{clearSchedule();if(automatic&&visible&&!disposed){nextReadAt=now()+intervalMs;timer=setTimer(()=>{timer=null;nextReadAt=null;void refresh();},intervalMs);}};
 async function refresh(){
  if(!configured||disposed){status=disposed?'closed':'unconfigured';emit();return snapshot();}
  if(inFlight)return inFlight;
  const g=generation;abort=new AbortController();const signal=abort.signal;status='reading';lastAttemptAt=now();emit();
  const current=()=>{if(disposed||g!==generation||signal.aborted)throw Error('REMOTE_HANDOFF_INVALIDATED');};
  inFlight=(async()=>{let ownerVerified=false;try{await requireOwner(current);current();ownerVerified=true;const result=await sourceRead({projectId:config.projectId,signal});current();const checked=await validate(result);current();await requireOwner(current);current();
    if(checked.status==='ACCESS_DENIED'){observation=null;lastConfirmed=null;status='denied';automatic=false;clearExpiry();}
    else{observation=checked;status=checked.status==='UNAVAILABLE'?'unavailable':'connected';if(checked.document!==null)lastConfirmed=clone(checked);}
   }catch(error){if(g===generation&&!disposed){observation=null;if(!ownerVerified||error?.status===401||error?.status===403){lastConfirmed=null;status='denied';automatic=false;clearExpiry();}else{try{await requireOwner(current);current();status='unavailable';}catch{lastConfirmed=null;status='denied';automatic=false;clearExpiry();}}}}
   finally{if(g===generation&&!disposed){inFlight=null;abort=null;schedule();emit();}}return snapshot();})();
  return inFlight;
 }
 const invalidate=()=>{generation++;abort?.abort();abort=null;inFlight=null;expiresAt=0;automatic=false;clearSchedule();clearExpiry();observation=null;lastConfirmed=null;status=disposed?'closed':configured?'idle':'unconfigured';emit();};
 return Object.freeze({snapshot,refresh,subscribe(listener){listeners.add(listener);listener(snapshot());return()=>listeners.delete(listener);},async startAutoSync(){if(!configured||disposed)return snapshot();automatic=true;return refresh();},stopAutoSync(){automatic=false;clearSchedule();emit();},setVisible(value){visible=value===true;if(!visible)invalidate();else emit();},invalidate,async handoff(selection={}){if(!configured||disposed)return null;const g=generation;try{const targetSelection=ownerAgentSelection(selection);await requireOwner(()=>{if(disposed||g!==generation)throw Error('REMOTE_HANDOFF_INVALIDATED');});const current=snapshot().observation;if(!current?.document)return null;return {schemaVersion:1,projectId:config.projectId,source:clone(current.source),sourceStatus:current.status,contextDocuments:clone(current.contextDocuments||[]),canonicalContextPaths:clone(config.contextPaths||[]),freshness:current.freshness,baselineChanged:current.baselineChanged,progress:clone(current.progress),document:current.document,qualification:'READ_ONLY_REPOSITORY_HANDOFF',...(config.track?{track:config.track,entryQualification:current.entryQualification,sourceReadIsProductAcceptance:false}:{}),providerNeutral:true,targetSelection,modelDecisionRequired:false,currentAgent:null,currentModel:null,executionAuthorized:false,instruction:'Reconcile the current remote revision and permissions before dependent work. This source grants no execution or write authority.'};}catch{invalidate();return null;}},dispose(){disposed=true;invalidate();listeners.clear();}});
}
