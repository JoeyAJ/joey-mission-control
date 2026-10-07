// Provider-neutral private repository. No ambient credentials, network or app activation.
import {restoreContinuity,queueContinuity,continuityDigest,continuityPresentation} from '../../docs/contracts/private-continuity.mjs';
const projects=new Set(['NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM']);
const qualifiers=new Set(['SYNTHETIC_LOCAL_TEST','VERIFIED_PRIVATE_TRANSPORT']);
export class ContinuityRepository {
 #port; #session=null; #cache=null; #pending=[]; #online=true; #status='unconfigured'; #qualification=null; #busy=false; #generation=0; #readSequence=0;
 constructor({port=null}={}){this.#port=port;}
 view(){return Object.freeze({status:this.#status,configured:!!this.#port,qualification:this.#qualification,revision:this.#cache?.revision??null,pendingCount:this.#pending.length,authenticated:!!this.#session,currentAgent:null,runtimeConnected:false,executionAuthorized:false});}
 async connect(projectId){
  if(!projects.has(projectId))throw Error('PROJECT_FORBIDDEN');
  if(!this.#port){this.#status='unconfigured';return this.view();}
  if(this.#session?.projectId===projectId){await this.refresh();return this.view();}
  if(this.#pending.length)throw Error('PENDING_SCOPE_SWITCH');
  const generation=++this.#generation;this.#cache=null;this.#session=null;this.#status='reading';
  try{const auth=await this.#port.authenticate(projectId);if(generation!==this.#generation)return this.view();
   if(auth.status!=='authenticated'){this.#status=auth.status==='denied'?'denied':'signed_out';this.#qualification=null;return this.view();}
   if(!qualifiers.has(auth.qualification)||!auth.principal?.verified||!auth.principal.memberActive||!auth.principal.sessionActive||!auth.principal.projects?.includes(projectId))throw Error('AUTH_UNVERIFIED');
   this.#session={projectId,principal:structuredClone(auth.principal)};this.#qualification=auth.qualification;
   await this.refresh();return this.view();
  }catch{if(generation!==this.#generation)return this.view();this.#session=null;this.#cache=null;this.#status='denied';return this.view();}
 }
 async refresh(){
  if(!this.#session)throw Error('UNAUTHENTICATED');
  if(!this.#online){this.#status=this.#pending.length?'offline_pending':'offline';return this.view();}
  const generation=this.#generation,sequence=++this.#readSequence,projectId=this.#session.projectId;
  try{const auth=await this.#port.authenticate(projectId);if(generation!==this.#generation||sequence!==this.#readSequence)return this.view();
   if(auth.status!=='authenticated'||auth.principal?.subject!==this.#session.principal.subject||!auth.principal?.memberActive||!auth.principal.sessionActive||!auth.principal.verified||!auth.principal.projects?.includes(this.#session.projectId)||auth.qualification!==this.#qualification){this.signOut();this.#status='denied';return this.view();}
   const envelope=await this.#port.readCheckpoint(projectId);if(generation!==this.#generation||sequence!==this.#readSequence)return this.view();
   if(envelope.qualification!==this.#qualification)throw Error('SOURCE_QUALIFICATION');
   const cache=restoreContinuity(envelope.checkpoint,envelope.pinnedHash);
   if(cache.projectId!==this.#session.projectId)throw Error('PROJECT_FORBIDDEN');
   if(this.#cache&&(cache.epoch!==this.#cache.epoch||cache.baselineSha!==this.#cache.baselineSha||cache.revision<this.#cache.revision))throw Error('AUTHORITY_CONFLICT');
   this.#session.principal=structuredClone(auth.principal);this.#cache=cache;this.#status=this.#pending.length?'pending':'connected';return this.view();
  }catch{if(generation!==this.#generation||sequence!==this.#readSequence)return this.view();this.#status='read_failed';return this.view();}
 }
 setOnline(online){this.#online=!!online;this.#status=!this.#port?'unconfigured':!this.#session?'signed_out':this.#online?(this.#pending.length?'pending':'connected'):(this.#pending.length?'offline_pending':'offline');return this.view();}
 queue(operation){if(!this.#session||!this.#cache)throw Error('UNAUTHENTICATED');if(operation.projectId!==this.#session.projectId)throw Error('PROJECT_FORBIDDEN');if(operation.kind==='decision'&&this.#session.principal.role!=='OWNER')throw Error('OWNER_REQUIRED');this.#pending=queueContinuity(this.#pending,operation);this.#status=this.#online?'pending':'offline_pending';return this.view();}
 async flush(){
  if(this.#busy)throw Error('WRITE_IN_PROGRESS');if(!this.#online){this.#status='offline_pending';return this.view();}if(!this.#session)throw Error('UNAUTHENTICATED');
  const generation=this.#generation;this.#busy=true;try{
   await this.refresh();if(generation!==this.#generation)return this.view();if(['denied','read_failed'].includes(this.#status)||!this.#session)return this.view();
   while(this.#pending.length){const op=this.#pending[0];
    try{const reply=await this.#port.appendOperation(op);if(generation!==this.#generation||this.#pending[0]?.id!==op.id)return this.view();if(reply.qualification!==this.#qualification)throw Error('SOURCE_QUALIFICATION');
     const cache=restoreContinuity(reply.checkpoint,reply.pinnedHash),event=cache.events.find(e=>e.operation.id===op.id);
     if(cache.projectId!==this.#session.projectId||!event||event.digest!==continuityDigest(op)||event.subject!==this.#session.principal.subject)throw Error('COMMIT_RECEIPT');
     this.#readSequence++;this.#cache=cache;this.#pending.shift();
    }catch(e){if(generation!==this.#generation)return this.view();this.#status=['REVISION_CONFLICT','AUTHORITY_CONFLICT','RESULT_CONFLICT'].includes(e.code||e.message)?'conflict':'write_failed';return this.view();}
   }this.#status='connected';return this.view();
  }finally{this.#busy=false;}
 }
 async readContext(hash){if(!this.#session||!this.#online)throw Error('UNAUTHENTICATED_OR_OFFLINE');const generation=this.#generation;await this.refresh();if(generation!==this.#generation||!this.#session||this.#status==='read_failed')throw Error('ACCESS_NOT_CONFIRMED');const projectId=this.#session.projectId,reply=await this.#port.readContext(projectId,hash);if(generation!==this.#generation||reply.qualification!==this.#qualification||reply.projectId!==projectId||reply.contextHash!==hash||continuityDigest(reply.filteredClaims)!==hash)throw Error('CONTEXT_INTEGRITY');return structuredClone(reply.filteredClaims);}
 async persistPending(store,expectedRevision){if(!this.#session)throw Error('UNAUTHENTICATED');const generation=this.#generation,scope={projectId:this.#session.projectId,subject:this.#session.principal.subject},pending=structuredClone(this.#pending);const result=await store.save(scope,pending,expectedRevision);if(generation!==this.#generation)throw Error('SESSION_CHANGED');return{revision:result.revision,pendingCount:result.pending.length};}
 async restorePending(store){if(!this.#session||!this.#cache)throw Error('UNAUTHENTICATED');const generation=this.#generation,scope={projectId:this.#session.projectId,subject:this.#session.principal.subject},saved=await store.load(scope);if(generation!==this.#generation)throw Error('SESSION_CHANGED');let merged=this.#pending;for(const op of saved.pending){if(op.projectId!==scope.projectId)throw Error('PROJECT_FORBIDDEN');merged=queueContinuity(merged,op);}this.#pending=merged;this.#status=this.#online?(merged.length?'pending':'connected'):(merged.length?'offline_pending':'offline');return{revision:saved.revision,...this.view()};}
 ownerAccess(){return this.#session?Object.freeze({subject:this.#session.principal.subject,role:this.#session.principal.role,aal:this.#session.principal.aal}):null;}
 pendingReview(){if(!this.#session||this.#session.principal.role!=='OWNER')throw Error('OWNER_REQUIRED');return Object.freeze({projectId:this.#session.projectId,subject:this.#session.principal.subject,entries:Object.freeze(this.#pending.map(op=>Object.freeze({id:op.id,kind:op.kind,epoch:op.epoch,baselineSha:op.baselineSha,expectedRevision:op.expectedRevision,proposalId:op.payload.proposalId,...(op.kind==='decision'?{decision:op.payload.decision,resultHash:op.payload.resultHash}:{}),digest:continuityDigest(op)})))});}
 decisionReview(proposalId){
  if(!this.#session||!this.#cache||this.#session.principal.role!=='OWNER')throw Error('OWNER_REQUIRED');
  const proposal=this.#cache.events.find(e=>e.operation.kind==='proposal'&&e.operation.payload.proposalId===proposalId),result=this.#cache.events.filter(e=>e.operation.kind==='result'&&e.operation.payload.proposalId===proposalId).at(-1);
  if(!proposal||!result)throw Error('RESULT_REQUIRED');
  return Object.freeze({projectId:this.#cache.projectId,epoch:this.#cache.epoch,baselineSha:this.#cache.baselineSha,revision:this.#cache.revision,proposalId,contextHash:proposal.operation.payload.contextHash,acceptanceHash:proposal.operation.payload.acceptanceHash,expiresAt:proposal.operation.payload.expiresAt,resultHash:result.operation.payload.resultHash,resultDigest:result.digest,qualification:result.operation.payload.qualification,subject:this.#session.principal.subject,role:this.#session.principal.role,aal:this.#session.principal.aal});
 }
 presentation(proposalId){if(!this.#session||!this.#cache)throw Error('UNAUTHENTICATED');return continuityPresentation(this.#cache,proposalId);}
 signOut(){this.#generation++;this.#session=null;this.#cache=null;this.#pending=[];this.#qualification=null;this.#status=this.#port?'signed_out':'unconfigured';return this.view();}
}
// Query driver injection only, no connection string or implicit login. Pending wire adapter.
// DB's fail-closed current_actor bridge independently authorizes every RPC.
export function postgresContinuityCommands(){return Object.freeze({read:'SELECT mc_api.read_events($1,$2,$3) AS page',context:'SELECT mc_api.read_context($1,$2) AS context',append:'SELECT mc_api.append_operation($1::jsonb) AS receipt'});}
// No network adapter activates here. Future bounded pagination + pinned-checkpoint mapping
// must implement authenticate/readCheckpoint/appendOperation before this repository is used.
