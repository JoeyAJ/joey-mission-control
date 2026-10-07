// Pending provider-neutral query-driver port. Injected local synthetic driver in tests ONLY.
// No URL, secret, pool, network, provider SDK or activation code.
import {continuityDigest,restoreContinuity,validateContinuityOperation} from '../../docs/contracts/private-continuity.mjs';
import {postgresContinuityCommands} from './repository.mjs';
export function createPostgresContinuityPort({query,authenticate,qualification='UNVERIFIED_TRANSPORT'}={}){
 if(typeof query!=='function'||typeof authenticate!=='function')throw Error('PORT_DEPENDENCIES');
 const commands=postgresContinuityCommands();
 async function access(projectId){const a=await authenticate(projectId);if(a.status!=='authenticated'||!a.principal?.verified||!a.principal.memberActive||!a.principal.sessionActive||!a.principal.projects?.includes(projectId)||!['SYNTHETIC_LOCAL_TEST','VERIFIED_PRIVATE_TRANSPORT'].includes(qualification))throw Error('UNAUTHORIZED');return {...a,qualification};}
 async function checkpoint(projectId){await access(projectId);let head=null,after=0,events=[];
  for(let pageNo=0;pageNo<100;pageNo++){
   const reply=await query(commands.read,[projectId,after,100]);const page=reply?.rows?.[0]?.page;
   if(!page||page.projectId!==projectId||!Array.isArray(page.events)||page.events.length>100||!Number.isSafeInteger(page.headRevision)||page.headRevision<0||page.headRevision>10000)throw Error('READ_SHAPE');
   const identity={epoch:page.epoch,baselineSha:page.baselineSha,headRevision:page.headRevision};
   if(head&&JSON.stringify(head)!==JSON.stringify(identity))throw Error('REVISION_CONFLICT');head=identity;
   for(const event of page.events){if(event.revision!==after+1||event.revision>head.headRevision)throw Error('READ_SEQUENCE');after=event.revision;events.push(event);}
   if(after===head.headRevision){const state={schemaVersion:1,epoch:head.epoch,projectId,baselineSha:head.baselineSha,capacity:10000,revision:after,events,liveRuntimeConnected:false};const pin=continuityDigest(state);restoreContinuity(state,pin);return{checkpoint:state,pinnedHash:pin,qualification};}
   if(!page.events.length)throw Error('READ_INCOMPLETE');
  }throw Error('READ_CAPACITY');
 }
 return Object.freeze({authenticate:async p=>{try{return await access(p);}catch{return{status:'denied'};}},readCheckpoint:checkpoint,readContext:async(projectId,hash)=>{await access(projectId);if(typeof hash!=='string'||!/^[a-f0-9]{64}$/.test(hash))throw Error('CONTEXT_HASH');const result=await query(commands.context,[projectId,hash]),body=result?.rows?.[0]?.context;if(!body||body.projectId!==projectId||body.contextHash!==hash||continuityDigest(body.filteredClaims)!==hash)throw Error('CONTEXT_INTEGRITY');return{...body,qualification};},appendOperation:async operation=>{
  const op=validateContinuityOperation(operation);
  await access(op.projectId);const reply=await query(commands.append,[JSON.stringify(op)]),receipt=reply?.rows?.[0]?.receipt?.receipt;
  if(!receipt||receipt.digest!==continuityDigest(op)||receipt.operation?.id!==op.id)throw Error('COMMIT_RECEIPT');
  const envelope=await checkpoint(op.projectId),event=envelope.checkpoint.events.find(e=>e.operation.id===op.id);
  if(!event||event.digest!==receipt.digest||event.subject!==receipt.subject||event.revision!==receipt.revision)throw Error('COMMIT_RECEIPT');return envelope;
 }});
}
