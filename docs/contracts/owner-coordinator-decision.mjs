// Offline protocol preparation ONLY. Synthetic actor; no SQL/Auth/RPC/IO/grants.
import {continuityDigest} from './private-continuity.mjs';
import {validateCoordinatorPage} from '../../src/continuity/owner-coordinator-reader.mjs';
const exact=(v,keys)=>v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v),integer=v=>Number.isSafeInteger(v)&&v>=0;
const projects=new Set(['NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM']);
const bindingKeys=['schemaVersion','projectId','epoch','baselineSha','contextHash','expectedRevision','proposalId','proposalOperationId','proposalDigest','acceptanceHash','resultOperationId','resultDigest','resultHash','evidenceHashes','resultQualification','decision','expiresAt'];
const requireValue=(v,code)=>{if(!v)throw Error(code);};
export async function prepareOwnerDecisionPlan(input){
 // Snapshot before awaits; async validation never consumes caller mutations.
 continuityDigest(input);const {request,sourcePage,decisionState,actor,scope,now}=structuredClone(input);
 requireValue(exact(scope,['projectId','epoch','baselineSha','contextHash','ownerSubject'])&&projects.has(scope.projectId)&&hash(scope.contextHash),'OWNER_DECISION_SCOPE');
 requireValue(actor?.qualification==='SYNTHETIC_LOCAL_TEST'&&actor.subject===scope.ownerSubject&&actor.role==='OWNER'&&actor.aal==='aal2'&&actor.verified===true&&actor.sessionActive===true&&actor.memberActive===true&&integer(actor.expiresAt)&&integer(now)&&actor.expiresAt>now,'OWNER_DECISION_SYNTHETIC_ACTOR');
 requireValue(exact(request,['id','binding','bindingDigest','expectedDecisionRevision'])&&/^[A-Za-z0-9_-]{1,80}$/.test(request.id||'')&&exact(request.binding,bindingKeys)&&hash(request.bindingDigest)&&request.bindingDigest===continuityDigest(request.binding)&&integer(request.expectedDecisionRevision),'OWNER_DECISION_REQUEST');
 const b=request.binding;requireValue(b.schemaVersion===1&&['ACCEPT','REJECT'].includes(b.decision)&&b.projectId===scope.projectId&&b.epoch===scope.epoch&&b.baselineSha===scope.baselineSha&&b.contextHash===scope.contextHash&&integer(b.expiresAt),'OWNER_DECISION_BINDING');
 requireValue(exact(decisionState,['revision','lastCommittedAt','eventCount','totalBytes','decisions'])&&[decisionState.revision,decisionState.lastCommittedAt,decisionState.eventCount,decisionState.totalBytes].every(integer)&&now>=decisionState.lastCommittedAt&&Array.isArray(decisionState.decisions)&&decisionState.decisions.length===decisionState.revision,'OWNER_DECISION_STATE');
 // Stable content excludes transient AAL/session/expiry and expected revisions.
 // A lost-response retry may use a renewed current Owner session and still replay
 // its original immutable decision; it never creates a second decision/charge.
 const content={schemaVersion:1,ownerSubject:scope.ownerSubject,projectId:b.projectId,epoch:b.epoch,baselineSha:b.baselineSha,contextHash:b.contextHash,proposalId:b.proposalId,proposalOperationId:b.proposalOperationId,proposalDigest:b.proposalDigest,acceptanceHash:b.acceptanceHash,resultOperationId:b.resultOperationId,resultDigest:b.resultDigest,resultHash:b.resultHash,evidenceHashes:b.evidenceHashes,resultQualification:b.resultQualification,decision:b.decision},digest=continuityDigest(content);
 for(let i=0;i<decisionState.decisions.length;i++){const row=decisionState.decisions[i];requireValue(exact(row,['revision','operationId','digest','content','committedAt'])&&row.revision===i+1&&row.digest===continuityDigest(row.content)&&integer(row.committedAt)&&row.committedAt<=decisionState.lastCommittedAt&&row.content.ownerSubject===scope.ownerSubject&&row.content.projectId===scope.projectId&&row.content.epoch===scope.epoch,'OWNER_DECISION_STATE');}
 const prior=decisionState.decisions.find(r=>r.operationId===request.id),flags={status:'OFFLINE_PENDING_OWNER_DECISION_GRANT',providerVerified:false,executionAuthorized:false,serverWriteEnabled:false,syntheticOnly:true};
 if(prior){requireValue(prior.digest===digest,'OWNER_DECISION_IDEMPOTENCY_CONFLICT');return{...flags,action:'EXACT_REPLAY_PLAN_ONLY',digest,revision:prior.revision,committedAt:prior.committedAt,newRows:0,newBytes:0};}
 await validateCoordinatorPage(sourcePage,{projectId:scope.projectId,contextHash:scope.contextHash,afterRevision:sourcePage.afterRevision,digest:continuityDigest});
 requireValue(sourcePage.epoch===scope.epoch&&sourcePage.baselineSha===scope.baselineSha&&b.expectedRevision===sourcePage.revision&&request.expectedDecisionRevision===decisionState.revision,'OWNER_DECISION_REVISION_CONFLICT');
 const proposal=sourcePage.receipts.find(r=>r.operationId===b.proposalOperationId&&r.content.operation.kind==='proposal'),result=sourcePage.receipts.find(r=>r.operationId===b.resultOperationId&&r.content.operation.kind==='result'),p=proposal?.content.operation.payload,r=result?.content.operation.payload;
 requireValue(proposal&&result&&proposal.revision<result.revision&&p.proposalId===b.proposalId&&r.proposalId===b.proposalId&&proposal.digest===b.proposalDigest&&result.digest===b.resultDigest&&p.acceptanceHash===b.acceptanceHash&&r.resultHash===b.resultHash&&continuityDigest(r.evidenceHashes)===continuityDigest(b.evidenceHashes)&&r.qualification===b.resultQualification&&b.resultQualification==='SUBMITTER_ATTESTED','OWNER_DECISION_EVIDENCE_CONFLICT');
 requireValue(now<p.expiresAt&&now<b.expiresAt&&b.expiresAt<=p.expiresAt,'OWNER_DECISION_EXPIRED');
 requireValue(!decisionState.decisions.some(row=>row.content.proposalId===b.proposalId),'OWNER_DECISION_ALREADY_FINAL');
 const charge=Buffer.byteLength(JSON.stringify(content))+2048;requireValue(charge<=10240&&decisionState.eventCount<10000&&decisionState.totalBytes+charge<=104857600,'OWNER_DECISION_SHARED_CAPACITY');
 return{...flags,action:'APPEND_PLAN_ONLY',digest,revision:decisionState.revision+1,newRows:1,newBytes:charge,content,serverFieldsRequired:['verified_current_Owner_AAL2_session','server_committed_at','server_decision_revision','shared_budget_project_lock']};
}
