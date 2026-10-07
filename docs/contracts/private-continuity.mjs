// Offline design oracle ONLY: no IO, JWT verification, network, DB or activation.
// principal must come from future server-verified auth/session/membership, never request JSON.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
const trustedStates=new WeakSet();
function plainJSON(v,depth=0,seen=new Set()){
 requireValue(depth<=12,'JSON_DEPTH');
 if(v===null||typeof v==='boolean')return;
 if(typeof v==='number'){requireValue(Number.isFinite(v),'JSON_NUMBER');return;}
 if(typeof v==='string'){requireValue(v.length<=8192,'JSON_STRING');return;}
 requireValue(v&&typeof v==='object'&&!types.isProxy(v)&&!seen.has(v),'JSON_OBJECT');
 requireValue(Array.isArray(v)?Object.getPrototypeOf(v)===Array.prototype:Object.getPrototypeOf(v)===Object.prototype,'JSON_PROTOTYPE');
 if(Array.isArray(v)){const keys=Object.keys(v);requireValue(keys.length===v.length&&keys.every((k,i)=>k===String(i)),'JSON_ARRAY');}
 seen.add(v);for(const [key,d]of Object.entries(Object.getOwnPropertyDescriptors(v))){requireValue(!d.get&&!d.set&&Object.hasOwn(d,'value'),'JSON_ACCESSOR');if(Array.isArray(v)&&key==='length')continue;requireValue(d.enumerable,'JSON_PROPERTY');plainJSON(d.value,depth+1,seen);}requireValue(Object.getOwnPropertySymbols(v).length===0,'JSON_SYMBOL');seen.delete(v);
}
function freeze(v){if(v&&typeof v==='object'){for(const value of Object.values(v))freeze(value);Object.freeze(v);}return v;}
function trust(state){trustedStates.add(state);return freeze(state);}
function trusted(state){requireValue(trustedStates.has(state),'UNVALIDATED_CHECKPOINT');}
export const continuityLimits=Object.freeze({eventBytes:8192,events:10000,pending:256,proposalLifetimeMs:86400000});
const projects=new Set(['NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM']);
const id=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(v);
const hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const sha=v=>typeof v==='string'&&/^[a-f0-9]{40}$/.test(v);
const exact=(o,keys)=>o&&Object.getPrototypeOf(o)===Object.prototype&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const requireValue=(ok,code)=>{if(!ok)throw Error(code);};
const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
export const continuityDigest=v=>{plainJSON(v);return createHash('sha256').update(canonical(v)).digest('hex');};
function payloadValid(op){
 const p=op.payload;
 if(op.kind==='proposal')return exact(p,['proposalId','contextHash','acceptanceHash','expiresAt'])&&id(p.proposalId)&&hash(p.contextHash)&&hash(p.acceptanceHash)&&Number.isSafeInteger(p.expiresAt);
 if(op.kind==='result')return exact(p,['proposalId','resultHash','evidenceHashes','qualification'])&&id(p.proposalId)&&hash(p.resultHash)&&Array.isArray(p.evidenceHashes)&&p.evidenceHashes.length>0&&p.evidenceHashes.length<=16&&p.evidenceHashes.every(hash)&&['SUBMITTER_ATTESTED','OWNER_IMPORTED_UNVERIFIED'].includes(p.qualification);
 if(op.kind==='decision')return exact(p,['proposalId','resultHash','decision'])&&id(p.proposalId)&&hash(p.resultHash)&&['ACCEPT','REJECT'].includes(p.decision);
 return false;
}
export function validateContinuityOperation(op){
 plainJSON(op);
 requireValue(exact(op,['id','epoch','projectId','baselineSha','expectedRevision','kind','payload']),'OPERATION_FIELDS');
 requireValue(id(op.id)&&id(op.epoch)&&projects.has(op.projectId)&&sha(op.baselineSha)&&Number.isSafeInteger(op.expectedRevision)&&op.expectedRevision>=0,'OPERATION_CONTEXT');
 requireValue(payloadValid(op),'PAYLOAD_FIELDS');
 requireValue(Buffer.byteLength(canonical(op))<=continuityLimits.eventBytes,'EVENT_CAPACITY');
 return structuredClone(op);
}
export function emptyContinuity({epoch,projectId,baselineSha,capacity=continuityLimits.events}){
 requireValue(id(epoch)&&projects.has(projectId)&&sha(baselineSha),'AUTHORITY_CONTEXT');
 requireValue(Number.isSafeInteger(capacity)&&capacity>0&&capacity<=continuityLimits.events,'LEDGER_CAPACITY');
 return trust({schemaVersion:1,epoch,projectId,baselineSha,capacity,revision:0,events:[],liveRuntimeConnected:false});
}
export function commitContinuity(state,operation,principal,now){
 trusted(state);const op=validateContinuityOperation(operation);
 requireValue(Number.isSafeInteger(now)&&now>=0&&now>=(state.events.at(-1)?.committedAt||0),'SERVER_CLOCK');
 requireValue(principal?.verified===true&&principal.sessionActive===true&&principal.memberActive===true&&id(principal.subject)&&['OWNER','WRITER'].includes(principal.role)&&['aal1','aal2'].includes(principal.aal),'UNAUTHORIZED');
 requireValue(principal.projects?.includes(state.projectId),'PROJECT_FORBIDDEN');
 requireValue(state.epoch===op.epoch&&state.projectId===op.projectId&&state.baselineSha===op.baselineSha,'AUTHORITY_CONFLICT');
 // Revocation/session/role and epoch are checked even for an idempotent retry.
 if(op.kind==='decision')requireValue(principal.role==='OWNER'&&principal.aal==='aal2','OWNER_ASSURANCE_REQUIRED');
 const digest=continuityDigest(op),existing=state.events.find(e=>e.operation.id===op.id);
 if(existing){requireValue(existing.digest===digest&&existing.subject===principal.subject,'IDEMPOTENCY_CONFLICT');return{state:trust(structuredClone(state)),receipt:structuredClone(existing),duplicate:true};}
 requireValue(state.revision===op.expectedRevision,'REVISION_CONFLICT');
 requireValue(state.events.length<state.capacity,'LEDGER_CAPACITY');
 const proposalEvents=state.events.filter(e=>e.operation.kind==='proposal'&&e.operation.payload.proposalId===op.payload.proposalId),proposal=proposalEvents[0];
 if(op.kind==='proposal'){
  requireValue(!proposal,'PROPOSAL_EXISTS');
  requireValue(op.payload.expiresAt>now&&op.payload.expiresAt<=now+continuityLimits.proposalLifetimeMs,'PROPOSAL_EXPIRY');
 }else{
  requireValue(!!proposal,'PROPOSAL_MISSING');
  requireValue(now<proposal.operation.payload.expiresAt,'PROPOSAL_EXPIRED');
 }
 if(op.kind==='decision'){
  const result=state.events.filter(e=>e.operation.kind==='result'&&e.operation.payload.proposalId===op.payload.proposalId).at(-1);
  requireValue(result?.operation.payload.resultHash===op.payload.resultHash,'RESULT_CONFLICT');
 }
 const receipt={revision:state.revision+1,digest,subject:principal.subject,role:principal.role,aal:principal.aal,committedAt:now,operation:op};
 const next={...structuredClone(state),revision:receipt.revision,events:[...structuredClone(state.events),receipt]};
 return{state:trust(next),receipt:structuredClone(receipt),duplicate:false};
}
export function continuityPresentation(state,proposalId){
 trusted(state);
 const result=state.events.filter(e=>e.operation.kind==='result'&&e.operation.payload.proposalId===proposalId).at(-1);
 const decision=state.events.filter(e=>e.operation.kind==='decision'&&e.operation.payload.proposalId===proposalId).at(-1);
 // A later result invalidates even the same result hash's earlier decision.
 const applies=!!result&&!!decision&&decision.revision>result.revision&&decision.operation.payload.resultHash===result.operation.payload.resultHash;
 return{status:!result?'AWAITING_RESULT':applies?(decision.operation.payload.decision==='ACCEPT'?'OWNER_ACCEPTED':'OWNER_REJECTED'):'PENDING_OWNER_REVIEW',resultHash:result?.operation.payload.resultHash||null,qualification:result?.operation.payload.qualification||null,currentAgent:null,currentModel:null,liveRuntimeConnected:false,executionAuthorized:false};
}
export function queueContinuity(pending,operation){
 plainJSON(pending);requireValue(Array.isArray(pending)&&pending.length<=continuityLimits.pending,'QUEUE_SHAPE');
 for(const item of pending)validateContinuityOperation(item);
 requireValue(new Set(pending.map(p=>p.id)).size===pending.length,'QUEUE_DUPLICATE');
 const op=validateContinuityOperation(operation),old=pending.find(p=>p.id===op.id);
 if(old){requireValue(continuityDigest(old)===continuityDigest(op),'QUEUE_ID_CONFLICT');return structuredClone(pending);}
 requireValue(pending.length<continuityLimits.pending,'QUEUE_CAPACITY');
 return[...structuredClone(pending),op]; // Pending is never an authoritative approval.
}

// Expected hash must be pinned by an independently verified DB/export receipt, not file itself.
// This verifies offline replay integrity, not JWT authenticity or real authorization.
export function restoreContinuity(checkpoint,expectedHash){
 plainJSON(checkpoint);requireValue(hash(expectedHash)&&continuityDigest(checkpoint)===expectedHash,'CHECKPOINT_HASH');
 requireValue(exact(checkpoint,['schemaVersion','epoch','projectId','baselineSha','capacity','revision','events','liveRuntimeConnected'])&&checkpoint.schemaVersion===1&&checkpoint.liveRuntimeConnected===false&&Array.isArray(checkpoint.events)&&checkpoint.events.length<=continuityLimits.events,'CHECKPOINT_FIELDS');
 let state=emptyContinuity(checkpoint);
 for(const receipt of checkpoint.events){
  requireValue(exact(receipt,['revision','digest','subject','role','aal','committedAt','operation'])&&hash(receipt.digest)&&id(receipt.subject)&&['aal1','aal2'].includes(receipt.aal),'RECEIPT_FIELDS');
  const principal={verified:true,sessionActive:true,memberActive:true,subject:receipt.subject,role:receipt.role,aal:receipt.aal,projects:[checkpoint.projectId]};
  const applied=commitContinuity(state,receipt.operation,principal,receipt.committedAt);
  requireValue(!applied.duplicate&&canonical(applied.receipt)===canonical(receipt),'RECEIPT_REPLAY');state=applied.state;
 }
 requireValue(canonical(state)===canonical(checkpoint),'CHECKPOINT_REPLAY');return state;
}
