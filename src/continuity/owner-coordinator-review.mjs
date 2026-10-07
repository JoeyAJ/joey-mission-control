// Owner review preparation only. No writer, decision RPC, queue or persistence.
import {validateCoordinatorPage} from './owner-coordinator-reader.mjs';
const decisions=new Set(['ACCEPT','REJECT']),hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const projects=new Set(['NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM']);
export function createOwnerCoordinatorReview({ownerSubject,inspectCurrentOwner,digest,now=Date.now}={}){
 const configured=typeof ownerSubject==='string'&&typeof inspectCurrentOwner==='function'&&typeof digest==='function';let generation=0,sequence=0,closed=false,draft=null;
 const denied=()=>{throw Error('COORDINATOR_REVIEW_DENIED');};
 const clear=()=>{generation++;sequence++;draft=null;};
 async function prepare(page,resultOperationId,decision,{explicit=false}={}){
  draft=null;const g=generation,s=++sequence,current=()=>{if(closed||g!==generation||s!==sequence)denied();};
  if(!configured||closed||explicit!==true||!decisions.has(decision))denied();
  // Freeze before the first await; caller mutations cannot change the review.
  const snapshot=structuredClone(page),project=snapshot?.projectId;if(!projects.has(project))denied();
  async function owner(){const a=await inspectCurrentOwner(project);current();if(a?.status!=='authenticated'||a.subject!==ownerSubject||a.role!=='OWNER'||a.aal!=='aal2'||a.verified!==true||a.sessionActive!==true||a.memberActive!==true||!a.projects?.includes(project)||!Number.isSafeInteger(a.expiresAt)||a.expiresAt<=now())denied();return a;}
  try{
   await owner();await validateCoordinatorPage(snapshot,{projectId:project,contextHash:snapshot.contextHash,afterRevision:snapshot.afterRevision,digest});current();
   const result=snapshot.receipts.find(r=>r.operationId===resultOperationId&&r.content.operation.kind==='result'),proposal=result&&snapshot.receipts.find(r=>r.content.operation.kind==='proposal'&&r.content.operation.payload.proposalId===result.content.operation.payload.proposalId);
   if(!result||!proposal||proposal.revision>=result.revision||snapshot.receipts.filter(r=>r.content.operation.kind==='proposal'&&r.content.operation.payload.proposalId===result.content.operation.payload.proposalId).length!==1||snapshot.receipts.filter(r=>r.content.operation.kind==='result'&&r.content.operation.payload.proposalId===result.content.operation.payload.proposalId).length!==1)denied();
   const a=await owner(),p=proposal.content.operation.payload,r=result.content.operation.payload,expiresAt=Math.min(a.expiresAt,p.expiresAt);if(expiresAt<=now())denied();
   const binding={schemaVersion:1,projectId:project,epoch:snapshot.epoch,baselineSha:snapshot.baselineSha,contextHash:snapshot.contextHash,expectedRevision:snapshot.revision,proposalId:p.proposalId,proposalOperationId:proposal.operationId,proposalDigest:proposal.digest,acceptanceHash:p.acceptanceHash,resultOperationId:result.operationId,resultDigest:result.digest,resultHash:r.resultHash,evidenceHashes:[...r.evidenceHashes],resultQualification:r.qualification,decision,expiresAt};
   const bindingDigest=await digest(binding);current();await owner();current();if(!hash(bindingDigest)||expiresAt<=now())denied();
   draft={status:'PREPARED_LOCAL_ONLY',binding,bindingDigest,proposalSummary:proposal.content.summary,resultSummary:result.content.summary,finalDecisionEnabled:false,persistenceEnabled:false,executionAuthorized:false};return structuredClone(draft);
  }catch{if(g===generation&&s===sequence)draft=null;denied();}
 }
 return Object.freeze({prepare,view(){if(draft?.binding.expiresAt<=now())clear();return draft?structuredClone(draft):null;},clear,dispose(){closed=true;clear();}});
}
