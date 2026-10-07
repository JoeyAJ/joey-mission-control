// Offline preparation only. No transport, SQL execution, Auth, IO or authority.
import {continuityDigest,validateContinuityOperation} from './private-continuity.mjs';
const projects=new Set(['NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM']);
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v);
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const exact=(v,keys)=>v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const requireValue=(ok,code)=>{if(!ok)throw Error(code);};
const sensitive=/\/(?:Users|home|private|workspace|tmp)\/|Bearer\s|(?:password|token|secret)\s*[:=]|sb_secret_|eyJ[A-Za-z0-9_-]+\.|PRIVATE KEY/i;
export function prepareCoordinatorWrite({scope,draft,observed,now}={}){
 continuityDigest({scope,draft,observed,now});
 requireValue(exact(scope,['projectId','epoch','baselineSha','contextHash','approvalRef'])&&projects.has(scope.projectId)&&hash(scope.contextHash)&&id(scope.approvalRef),'COORDINATOR_SCOPE');
 requireValue(exact(draft,['writerId','mode','approvalRef','toolInvocationRef','summary','operation'])&&draft.writerId==='nexaeon-coordinator'&&draft.mode==='TOOL_MEDIATED'&&draft.approvalRef===scope.approvalRef&&id(draft.toolInvocationRef),'COORDINATOR_WRITER_MODE');
 requireValue(typeof draft.summary==='string'&&draft.summary.length>0&&draft.summary.length<=1024&&!sensitive.test(draft.summary),'COORDINATOR_SUMMARY');
 const op=validateContinuityOperation(draft.operation);
 requireValue(['proposal','result'].includes(op.kind),'COORDINATOR_OWNER_DECISION_EXCLUDED');
 requireValue(op.projectId===scope.projectId&&op.epoch===scope.epoch&&op.baselineSha===scope.baselineSha,'COORDINATOR_BASELINE_CONTEXT');
 requireValue(Number.isSafeInteger(now)&&now>=0&&exact(observed,['revision','lastCommittedAt','totalBytes','eventCount','receipts'])&&Number.isSafeInteger(observed.revision)&&observed.revision>=0&&Number.isSafeInteger(observed.lastCommittedAt)&&now>=observed.lastCommittedAt&&Number.isSafeInteger(observed.totalBytes)&&observed.totalBytes>=0&&Number.isSafeInteger(observed.eventCount)&&observed.eventCount>=0&&Array.isArray(observed.receipts),'COORDINATOR_OBSERVATION');
 // Delivery references are audit evidence; a retry's new invocation ID must not change content identity.
 const content={writerId:draft.writerId,approvalRef:draft.approvalRef,summary:draft.summary,operation:op},digest=continuityDigest(content),bytes=Buffer.byteLength(JSON.stringify(content));
 requireValue(bytes<=8192,'COORDINATOR_RECORD_CAPACITY');
 const status={mode:'OFFLINE_PENDING_EXPLICIT_P3_APPROVAL',writerQualification:'TOOL_MEDIATED_COORDINATOR_ATTESTATION',providerSubject:null,aal:null,emitterIdentityVerified:false,ownerDecisionEnabled:false,runtimeConnected:false,executionAuthorized:false};
 const prior=observed.receipts.find(r=>r.operation?.id===op.id);
 if(prior){requireValue(prior.digest===digest&&prior.writerId===draft.writerId,'COORDINATOR_IDEMPOTENCY_CONFLICT');return {...status,action:'EXACT_REPLAY_NO_NEW_ROW',digest,revision:prior.revision,newRows:0,newBytes:0};}
 requireValue(op.expectedRevision===observed.revision,'COORDINATOR_REVISION_CONFLICT');
 requireValue(observed.revision<10000&&observed.eventCount<10000&&observed.totalBytes+bytes+2048<=104857600,'COORDINATOR_SHARED_CAPACITY');
 const proposal=observed.receipts.find(r=>r.operation?.kind==='proposal'&&r.operation.payload.proposalId===op.payload.proposalId);
 if(op.kind==='proposal'){
  requireValue(!proposal,'COORDINATOR_PROPOSAL_EXISTS');requireValue(op.payload.contextHash===scope.contextHash,'COORDINATOR_CONTEXT_PIN');
  requireValue(op.payload.expiresAt>now&&op.payload.expiresAt<=now+86400000,'COORDINATOR_PROPOSAL_EXPIRY');
 }else{
  requireValue(proposal&&proposal.operation.projectId===op.projectId&&proposal.operation.epoch===op.epoch&&proposal.operation.baselineSha===op.baselineSha&&proposal.operation.payload.contextHash===scope.contextHash,'COORDINATOR_PROPOSAL_REQUIRED');
  requireValue(now<proposal.operation.payload.expiresAt,'COORDINATOR_PROPOSAL_EXPIRED');
  requireValue(op.payload.qualification==='SUBMITTER_ATTESTED','COORDINATOR_RESULT_QUALIFICATION');
 }
 return {...status,action:'APPEND_PLAN_ONLY',projectId:op.projectId,digest,revision:observed.revision+1,newRows:1,newBytes:bytes+2048,content:structuredClone(content),declaredToolInvocationRef:draft.toolInvocationRef,serverFieldsRequired:['session_user','server_committed_at']};
}
