// Synthetic view data only. No SDK, live Owner action, credentials or worker job.
import test from 'node:test';import assert from 'node:assert/strict';
import {workerEvidence,evidenceFreshnessMs} from '../src/continuity/owner-worker-evidence.mjs';
import {validatePayload} from '../docs/contracts/vm-link/vendor/safe-payload.mjs';
const at=1700000000000,config={enabled:true,projectId:'NEXAEON',policyDigest:'a'.repeat(64),artifactDigest:'b'.repeat(64)};
const payload=kind=>({kind,threadId:null,itemId:null,itemType:null,itemStatus:null,commandExitCode:null,processExitCode:null,signal:null,errorClass:null});
const event=(kind,seq=1,changes={},observedAt=at)=>({eventId:'event_'+seq,seq,observedAt,payload:{...payload(kind),...changes}});
function fixture(patch={}){return{enabled:true,release:'0.1.1',policyDigest:config.policyDigest,artifactDigest:config.artifactDigest,worker:{workerId:'worker_1',paired:true,enabled:true,revoked:false,keyDigest:'c'.repeat(64)},jobs:[{jobId:'job_1',attemptId:'attempt_1',workerId:'worker_1',fence:1,task:'SMOKE_CONNECTION_V1',claimed:false,spawnIntent:false,cancel:false,terminal:false,outcome:null,leaseUntil:null,expiresAt:null,events:[],...patch}]};}
const project=(view,now=at,readAt=at)=>workerEvidence({view,config,now,readAt});
const running=()=>fixture({claimed:true,spawnIntent:true,leaseUntil:at+5000,expiresAt:at+60000,events:[event('turn_started')]});
const completed=()=>fixture({claimed:true,spawnIntent:true,terminal:true,outcome:'COMPLETED',leaseUntil:at+5000,expiresAt:at+60000,events:[event('turn_completed'),event('process_exit',2,{processExitCode:0})]});
test('empty and unclaimed records never imply active work',()=>{
 const view=fixture();view.jobs=[];assert.equal(project(view).state,'EMPTY');
 const j=project(fixture()).jobs[0];assert.equal(j.state,'WAITING_UNCLAIMED');assert.equal(j.currentWork,false);assert.equal(j.completionConfirmed,false);assert.equal(j.observedAt,null);
});
test('claim, spawn intent and a fresh worker report are distinct',()=>{
 const claimed=fixture({claimed:true,leaseUntil:at+5000,expiresAt:at+60000});assert.equal(project(claimed).jobs[0].state,'CLAIMED');
 claimed.jobs[0].spawnIntent=true;assert.equal(project(claimed).jobs[0].state,'SPAWN_INTENT_RECORDED');assert.equal(project(claimed).jobs[0].currentWork,false);
 assert.equal(project(running()).jobs[0].state,'RUNNING_REPORTED');assert.equal(project(running()).jobs[0].actor,null);assert.equal(project(running()).jobs[0].model,null);
});
test('lease, event and readback expiry invalidate current work at their boundaries',()=>{
 assert.equal(project(running(),at+5000).jobs[0].state,'STALE');
 const view=running();view.jobs[0].leaseUntil=at+60000;
 assert.equal(project(view,at+evidenceFreshnessMs).jobs[0].state,'STALE');
 assert.equal(project(view,at+evidenceFreshnessMs,at+evidenceFreshnessMs).jobs[0].state,'STALE');
 assert.equal(project(view,at+evidenceFreshnessMs).jobs[0].currentWork,false);
});
test('revoked, disabled, historical-unmatched and disabled-broker views cannot show current execution',()=>{
 for(const alter of [v=>{v.worker.revoked=true;},v=>{v.worker.enabled=false;},v=>{v.worker.workerId='other_worker';},v=>{v.enabled=false;}]){const v=running();alter(v);assert.equal(project(v).jobs[0].currentWork,false);assert.equal(project(v).jobs[0].state,'UNCONFIRMED');}
});
test('completion requires matching server outcome, turn and ordered process exit zero',()=>{
 assert.equal(project(completed()).jobs[0].state,'COMPLETED_CONFIRMED');
 for(const events of [[event('turn_completed')],[event('process_exit',1,{processExitCode:0})],[event('process_exit',1,{processExitCode:0}),event('turn_completed',2)]]){
  const v=completed();v.jobs[0].events=events;const j=project(v).jobs[0];assert.equal(j.state,'INCONSISTENT');assert.equal(j.outcome,'COMPLETED');assert.equal(j.completionConfirmed,false);
 }
 const v=running();v.jobs[0].events=[event('turn_completed'),event('process_exit',2,{processExitCode:0})];assert.equal(project(v).jobs[0].state,'AWAITING_OUTCOME');assert.equal(project(v).jobs[0].completionConfirmed,false);
});
test('provider failure, nonzero exit, cancellation and prohibited tools cannot be erased by completion',()=>{
 for(const [kind,fields]of [['provider_error',{errorClass:'PROVIDER_ERROR'}],['turn_failed',{errorClass:'PROVIDER_ERROR'}],['process_error',{errorClass:'PIPE_FAILURE'}],['cancel_requested',{}],['item_started',{itemId:'item_1',itemType:'mcp_tool_call',itemStatus:'in_progress'}]]){
  const v=completed();v.jobs[0].events=[event(kind,1,fields),event('turn_completed',2),event('process_exit',3,{processExitCode:0})];assert.equal(project(v).jobs[0].state,'INCONSISTENT');assert.equal(project(v).jobs[0].completionConfirmed,false);
 }
 const v=completed();v.jobs[0].events[1].payload.processExitCode=1;assert.equal(project(v).jobs[0].completionConfirmed,false);
});
test('cancelled, failed, unknown and cancellation-requested records retain their server facts',()=>{
 for(const outcome of ['CANCELLED','FAILED','UNKNOWN']){const v=fixture({terminal:true,outcome,cancel:outcome==='CANCELLED'}),j=project(v,at+999999).jobs[0];assert.equal(j.state,outcome);assert.equal(j.currentWork,false);assert.equal(j.outcome,outcome);}
 const v=running();v.jobs[0].cancel=true;assert.equal(project(v).jobs[0].state,'CANCEL_REQUESTED');
 v.jobs[0].cancel=false;v.jobs[0].events=[event('provider_error',1,{errorClass:'PROVIDER_ERROR'})];assert.equal(project(v).jobs[0].state,'FAILURE_REPORTED');
});
test('logical conflicts and duplicate process exits remain inconsistent',()=>{
 for(const patch of [{spawnIntent:true},{events:[event('turn_started')]},{terminal:true,outcome:null},{outcome:'FAILED'}])assert.equal(project(fixture(patch)).jobs[0].state,'INCONSISTENT');
 const v=completed();v.jobs[0].events.push(event('process_exit',3,{processExitCode:0}));assert.equal(project(v).jobs[0].state,'INCONSISTENT');
});
test('source time is preserved across re-reads and late/out-of-order evidence cannot become current',()=>{
 const v=running();v.jobs[0].events[0].observedAt=at-1000;const first=project(v),next=project(v,at+2000,at+2000);
 assert.equal(first.jobs[0].observedAt,next.jobs[0].observedAt);assert.notEqual(first.readAt,next.readAt);assert.equal(next.jobs[0].events.length,1);
 v.jobs[0].events=[event('turn_started',1,{},at+1)];assert.equal(project(v).jobs[0].state,'UNCONFIRMED');
 v.jobs[0].events=[event('turn_started',1,{},at),event('turn_completed',2,{},at-1)];assert.equal(project(v).jobs[0].state,'INCONSISTENT');
});
test('safe payload validation agrees with the reviewed neutral contract',()=>{
 const representatives=[event('session_started',1,{threadId:'thread_1'}),event('item_completed',1,{itemId:'item_1',itemType:'agent_message',itemStatus:'completed'}),event('process_exit',1,{signal:'SIGTERM'}),event('turn_failed',1,{errorClass:'PROVIDER_ERROR'})];
 for(const e of representatives){validatePayload(e.payload);const v=running();v.jobs[0].events=[e];assert.deepEqual(project(v).jobs[0].events[0].payload,e.payload);}
 for(const change of [{threadId:'unused'},{processExitCode:'0'},{errorClass:'RAW_PRIVATE_RESPONSE'},{output:'RAW_PRIVATE_CANARY'}]){const v=running();Object.assign(v.jobs[0].events[0].payload,change);assert.throws(()=>project(v));assert.throws(()=>validatePayload(v.jobs[0].events[0].payload));}
});
test('invalid scope, timestamps, sequence, duplicate IDs and excessive data fail closed',()=>{
 assert.throws(()=>workerEvidence({view:fixture(),config:{...config,projectId:'OTHER'},now:at,readAt:at}));
 for(const alter of [v=>{v.policyDigest='d'.repeat(64);},v=>{v.jobs[0].leaseUntil='1700000000000';},v=>{v.jobs[0].events[0].observedAt=-1;},v=>{v.jobs[0].events[0].seq=2;},v=>{v.jobs[0].events.push({...v.jobs[0].events[0],seq:2});},v=>{v.jobs.push(structuredClone(v.jobs[0]));},v=>{v.jobs[0].events[0].payload.itemId='mc_pair_SYNTHETIC';}]){const v=running();alter(v);assert.throws(()=>project(v));}
 const v=running();v.jobs[0].events=Array.from({length:129},(_,i)=>event('turn_started',i+1));assert.throws(()=>project(v));
});
test('projection is immutable, filters unrelated private fields and does not serialize getters',()=>{
 const v=running();v.pairingCode='SYNTHETIC_PAIRING_CANARY';v.worker.publicKey='SYNTHETIC_KEY_CANARY';const out=project(v);assert(!JSON.stringify(out).includes('CANARY'));assert.equal(Object.isFrozen(out.jobs[0].events[0].payload),true);
 v.jobs[0].events[0].payload.kind='turn_completed';assert.equal(out.jobs[0].events[0].payload.kind,'turn_started');assert.throws(()=>{out.jobs[0].events.push({});});
 let accessed=0;Object.defineProperty(v,'unsafe',{enumerable:true,get(){accessed++;return 'CANARY';}});assert.throws(()=>project(v));assert.equal(accessed,0);
});
