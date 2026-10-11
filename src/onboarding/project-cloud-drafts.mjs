// Private in-memory cloud reconciliation. Imports never establish a server revision.
import {createProjectDraft,validateProjectDraft} from './project-draft.mjs';
import {sameDraft} from './project-draft-storage-contract.mjs';
export function createCloudDraftReconciliation({now=Date.now}={}){
 let status='NOT_CONNECTED',remote=new Map(),pending=new Map();const conflicts=new Map();
 const projectEqual=(a,b)=>sameDraft(a?.project,b?.project);
 function requireAvailable(capabilities){if(capabilities?.cloudDraftPersistence!=='OWNER_RPC_AVAILABLE')throw Error('DRAFT_STORAGE_NOT_CONNECTED');}
 function recordConflict(id,revision=remote.get(id)?.revision||null){conflicts.set(id,{draftId:id,remoteRevision:revision});status='CONFLICT';}
 function conflictError(id){recordConflict(id);throw Object.assign(Error('DRAFT_REVISION_CONFLICT'),{status:409});}
 function settled(next){status=conflicts.size?'CONFLICT':next;}
 return {
  snapshot(drafts,selected){return {status,conflict:structuredClone(conflicts.get(selected)||null),confirmedDraftIds:status==='UNAVAILABLE'?[]:drafts.filter(d=>!conflicts.has(d.draftId)&&sameDraft(remote.get(d.draftId),d)).map(d=>d.draftId),selectedConfirmed:Boolean(status!=='UNAVAILABLE'&&selected&&!conflicts.has(selected)&&sameDraft(remote.get(selected),drafts.find(d=>d.draftId===selected)))};},
  clear(){status='NOT_CONNECTED';remote.clear();pending.clear();conflicts.clear();},
  unavailable(){status='UNAVAILABLE';},
  capability(v){if(v==='UNAVAILABLE'){status='UNAVAILABLE';}else if(v!=='OWNER_RPC_AVAILABLE'){status='NOT_CONNECTED';remote.clear();pending.clear();conflicts.clear();}else if(['NOT_CONNECTED','UNAVAILABLE'].includes(status))settled('AVAILABLE');},
  async refresh({capabilities,client,signal,check,drafts,replaceSelected=null}){
   requireAvailable(capabilities);const reply=await client.list({signal});check();const records=new Map(reply.drafts.map(d=>[d.draftId,validateProjectDraft(d)])),merged=[...drafts];
   if(replaceSelected&&!records.has(replaceSelected))throw Error('DRAFT_CLOUD_RECORD_MISSING');
   for(const [id,d]of records){const index=merged.findIndex(v=>v.draftId===id),old=remote.get(id);if(index<0){if(merged.length>=12)throw Error('DRAFT_CAPACITY');merged.push(d);}else if(replaceSelected===id)merged[index]=d;else if(!sameDraft(d,merged[index])&&(!old||!sameDraft(d,old)))recordConflict(id,d.revision);}
   for(const d of drafts)if(remote.has(d.draftId)&&!records.has(d.draftId))recordConflict(d.draftId,null);
   if(replaceSelected){conflicts.delete(replaceSelected);pending.delete(replaceSelected);}remote=records;settled('AVAILABLE');return merged;
  },
  async save({capabilities,client,signal,check,draft}){
   requireAvailable(capabilities);const reply=await client.list({signal});check();const current=reply.drafts.find(d=>d.draftId===draft.draftId),known=remote.get(draft.draftId),retry=pending.get(draft.draftId);
   if(retry&&sameDraft(current,retry.request.draft)){remote.set(draft.draftId,current);pending.delete(draft.draftId);if(projectEqual(draft,retry.local)){conflicts.delete(draft.draftId);settled('SAVED');return structuredClone(current);}}
   else if(retry&&current?.revision===retry.request.expectedRevision+1){remote.set(draft.draftId,current);conflictError(draft.draftId);}
   if(conflicts.has(draft.draftId))conflictError(draft.draftId);
   const baseline=remote.get(draft.draftId)||known;
   if(current&&sameDraft(current,draft)){remote.set(draft.draftId,current);conflicts.delete(draft.draftId);settled('SAVED');return structuredClone(current);}
   if(current&&(!baseline||!sameDraft(current,baseline))){remote.set(draft.draftId,current);conflictError(draft.draftId);}
   if(!current&&baseline)conflictError(draft.draftId);
   const expectedRevision=current?.revision||0,candidate=current?validateProjectDraft({...draft,revision:expectedRevision+1,createdAt:current.createdAt,updatedAt:new Date(Math.max(now(),Date.parse(current.updatedAt))).toISOString()}):createProjectDraft(draft.project,{draftId:draft.draftId,now:now()});
   const request={draft:candidate,expectedRevision};pending.set(draft.draftId,{request:structuredClone(request),local:structuredClone(draft)});
   try{const ack=await client.save(request,{signal});check();remote.set(candidate.draftId,ack.draft);pending.delete(candidate.draftId);conflicts.delete(candidate.draftId);settled('SAVED');return structuredClone(ack.draft);}catch(e){check();if(e.status===409)conflictError(draft.draftId);status='UNCONFIRMED_WRITE';throw e;}
  }
 };
}
