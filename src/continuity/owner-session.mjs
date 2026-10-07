// Offline owner-session coordinator ONLY. No live adapter, credentials or ambient IO.
import {continuityDigest} from '../../docs/contracts/private-continuity.mjs';
const stage='https://joey-mission-control-git-codex-mc-comma-fceec2-joeyajs-projects.vercel.app';
const projects=new Set(['NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM']);
export function ownerReturnDestination(input=stage+'/#workspace'){
 const u=new URL(input,stage);if(u.origin!==stage||u.username||u.password||u.pathname!=='/'||u.search)throw Error('RETURN_FORBIDDEN');
 const [route,query='']=u.hash.split('?');if(route!=='#workspace')throw Error('RETURN_FORBIDDEN');const p=new URLSearchParams(query);
 if([...p.keys()].some(k=>!['project','panel'].includes(k))||new Set(p.keys()).size!==[...p.keys()].length||p.has('project')&&!projects.has(p.get('project'))||p.has('panel')&&!['entries','events','context'].includes(p.get('panel')))throw Error('RETURN_FORBIDDEN');return u.href;
}
export class OwnerSessionCoordinator{
 #repo;#port;#owner;#now;#state='unconfigured';#session=null;#project=null;#generation=0;#sequence=0;#online=true;#tickets=new WeakMap();#unsubscribe=null;
 constructor({repository,syntheticTransport=null,ownerSubject=null,now=()=>Date.now()}={}){if(!repository)throw Error('REPOSITORY_REQUIRED');this.#repo=repository;this.#port=syntheticTransport;this.#owner=ownerSubject;this.#now=now;if(this.#port){if(this.#port.qualification!=='SYNTHETIC_LOCAL_TEST'||typeof ownerSubject!=='string')throw Error('OFFLINE_SYNTHETIC_ONLY');this.#state='signed_out';this.#unsubscribe=this.#port.subscribeInvalidation?.(e=>this.handleSessionSignal(e));}}
 view(){if(this.#session&&this.#session.expiresAt<=this.#now())this.#clear('expired');return Object.freeze({status:this.#state,qualification:this.#port?'SYNTHETIC_LOCAL_TEST':null,authenticated:!!this.#session&&!['session_unconfirmed','logout_unconfirmed'].includes(this.#state),aal:this.#session?.aal??null,pendingCount:this.#session?this.#repo.view().pendingCount:0,runtimeConnected:false,executionAuthorized:false});}
 #clear(status){this.#generation++;this.#sequence++;this.#session=null;this.#tickets=new WeakMap();this.#repo.signOut();this.#state=status;}
 async connect(projectId){if(!projects.has(projectId))throw Error('PROJECT_FORBIDDEN');if(this.#project&&this.#project!==projectId){if(this.#repo.view().pendingCount)throw Error('PENDING_SCOPE_SWITCH');this.#clear('signed_out');}this.#project=projectId;return this.reconcile();}
 async reconcile(){
  if(!this.#port){this.#state='unconfigured';return this.view();}if(!this.#project)throw Error('PROJECT_REQUIRED');
  if(!this.#online){this.#state=this.#session?'offline':'signed_out';return this.view();}
  const generation=this.#generation,sequence=++this.#sequence;
  try{const a=await this.#port.inspectSession(this.#project);if(generation!==this.#generation||sequence!==this.#sequence)return this.view();
   if(a.status!=='authenticated'){this.#clear(['expired','denied'].includes(a.status)?a.status:'signed_out');return this.view();}
   if(a.qualification!=='SYNTHETIC_LOCAL_TEST'||a.subject!==this.#owner||a.role!=='OWNER'||a.verified!==true||a.sessionActive!==true||a.memberActive!==true||!a.projects?.includes(this.#project)||!['aal1','aal2'].includes(a.aal)||!Number.isSafeInteger(a.expiresAt)||a.expiresAt<=this.#now()){this.#clear(a.expiresAt<=this.#now()?'expired':'denied');return this.view();}
   await this.#repo.connect(this.#project);if(generation!==this.#generation||sequence!==this.#sequence)return this.view();const r=this.#repo.view();
   const access=this.#repo.ownerAccess();if(!r.authenticated||r.status==='denied'||r.qualification!=='SYNTHETIC_LOCAL_TEST'||access?.subject!==a.subject||access.role!=='OWNER'||access.aal!==a.aal){this.#clear('denied');return this.view();}
   this.#session={subject:a.subject,aal:a.aal,expiresAt:a.expiresAt};if(r.status==='read_failed'){this.#tickets=new WeakMap();this.#state='session_unconfirmed';return this.view();}this.#state=a.aal==='aal2'?'ready':'mfa_required';return this.view();
  }catch{if(generation!==this.#generation||sequence!==this.#sequence)return this.view();this.#clear('session_unconfirmed');return this.view();}
 }
 async signInSynthetic(){if(!this.#port||!this.#online)throw Error('SYNTHETIC_SIGNIN_UNAVAILABLE');const generation=this.#generation;try{await this.#port.signInSynthetic();if(generation!==this.#generation)return this.view();return this.reconcile();}catch{if(generation===this.#generation)this.#clear('session_unconfirmed');return this.view();}}
 async challengeSynthetic(){if(!this.#session||!this.#online)throw Error('SESSION_REQUIRED');const generation=this.#generation;await this.#port.challengeSynthetic();if(generation!==this.#generation)return this.view();return this.reconcile();}
 async signOut(){this.#clear(this.#port?'signed_out':'unconfigured');const generation=this.#generation;try{await this.#port?.signOut();}catch{if(generation===this.#generation)this.#state='logout_unconfirmed';}return this.view();}
 async handleSessionSignal(event){if(!event||!['SIGNED_OUT','EXPIRED','REVOKED','SESSION_CHANGED'].includes(event.type))return this.view();this.#clear(event.type==='EXPIRED'?'expired':event.type==='REVOKED'?'denied':'signed_out');if(event.type==='SESSION_CHANGED'&&this.#project)return this.reconcile();return this.view();}
 setOnline(value){this.#online=!!value;this.#tickets=new WeakMap();this.#repo.setOnline(this.#online);this.#state=this.#session?(this.#online?'session_unconfirmed':'offline'):(this.#port?'signed_out':'unconfigured');return this.view();}
 async prepareDecision({proposalId,decision,id}){
  if(!['ACCEPT','REJECT'].includes(decision)||typeof id!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(id))throw Error('DECISION_FIELDS');await this.reconcile();
  if(!this.#online||this.view().status!=='ready'||this.#repo.view().pendingCount)throw Error('OWNER_AAL2_ONLINE_CLEAN_QUEUE_REQUIRED');
  const review=this.#repo.decisionReview(proposalId);if(review.subject!==this.#owner||review.aal!=='aal2'||review.expiresAt<=this.#now())throw Error('REVIEW_NOT_CURRENT');
  const {subject,...safeReview}=review;const binding=Object.freeze({...review,decision,id}),ticket=Object.freeze({bindingDigest:continuityDigest(binding),review:Object.freeze({...safeReview,operationId:id}),decision});
  this.#tickets.set(ticket,{binding,generation:this.#generation});return ticket;
 }
 async confirmDecision(ticket,{explicit=false}={}){
  const record=this.#tickets.get(ticket);if(!explicit||!record||record.kind==='retry')throw Error('EXPLICIT_REVIEW_REQUIRED');this.#tickets.delete(ticket);const generation=this.#generation;await this.reconcile();
  if(record.generation!==this.#generation||generation!==this.#generation||!this.#online||this.view().status!=='ready')throw Error('REVIEW_INVALIDATED');
  const b=record.binding,current=this.#repo.decisionReview(b.proposalId);if(continuityDigest({...current,decision:b.decision,id:b.id})!==ticket.bindingDigest||current.expiresAt<=this.#now()||this.#repo.view().pendingCount)throw Error('REVIEW_CHANGED');
  this.#repo.queue({id:b.id,epoch:b.epoch,projectId:b.projectId,baselineSha:b.baselineSha,expectedRevision:b.revision,kind:'decision',payload:{proposalId:b.proposalId,resultHash:b.resultHash,decision:b.decision}});
  const result=await this.#repo.flush();if(generation!==this.#generation)return this.view();return this.#finishWrite(result);
 }
 async preparePendingRetry(){await this.reconcile();if(!this.#online||this.view().status!=='ready')throw Error('OWNER_AAL2_ONLINE_REQUIRED');const binding=this.#repo.pendingReview();if(binding.subject!==this.#owner||!binding.entries.length)throw Error('PENDING_REQUIRED');const ticket=Object.freeze({bindingDigest:continuityDigest(binding),pendingDigests:Object.freeze(binding.entries.map(e=>e.digest)),pendingEntries:binding.entries,draftCount:binding.entries.length});this.#tickets.set(ticket,{binding,generation:this.#generation,kind:'retry'});return ticket;}
 async confirmPendingRetry(ticket,{explicit=false}={}){const r=this.#tickets.get(ticket);if(!explicit||r?.kind!=='retry')throw Error('EXPLICIT_REVIEW_REQUIRED');this.#tickets.delete(ticket);const generation=this.#generation;await this.reconcile();if(r.generation!==this.#generation||generation!==this.#generation||!this.#online||this.view().status!=='ready'||continuityDigest(this.#repo.pendingReview())!==ticket.bindingDigest)throw Error('REVIEW_INVALIDATED');const result=await this.#repo.flush();if(generation!==this.#generation)return this.view();return this.#finishWrite(result);}
 #finishWrite(result){if(!result.authenticated||['denied','signed_out'].includes(result.status)){this.#clear(result.status==='signed_out'?'signed_out':'denied');return this.view();}this.#tickets=new WeakMap();this.#state=result.status==='connected'&&!result.pendingCount?'ready':result.status==='conflict'?'conflict':result.status==='write_failed'?'commit_unconfirmed':result.status==='read_failed'?'session_unconfirmed':result.status==='offline_pending'?'offline':'pending';return this.view();}
 async recoverPending(store){await this.reconcile();if(!this.#session)throw Error('SESSION_REQUIRED');return this.#repo.restorePending(store);}
 async savePending(store,revision){if(!this.view().authenticated)throw Error('SESSION_REQUIRED');return this.#repo.persistPending(store,revision);}
 dispose(){this.#unsubscribe?.();this.#clear(this.#port?'signed_out':'unconfigured');}
}
