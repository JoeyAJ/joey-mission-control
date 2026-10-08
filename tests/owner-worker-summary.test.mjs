// Synthetic private views only. No operational payload, credentials or live jobs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {workerWorkSummary} from '../src/continuity/owner-worker-summary.mjs';
const at=1700000000000,config={enabled:true,projectId:'NEXAEON',policyDigest:'a'.repeat(64),artifactDigest:'b'.repeat(64)};
const event=(kind,seq,changes={})=>({eventId:'synthetic_event_'+seq,seq,observedAt:at-1000+seq,payload:{kind,threadId:null,itemId:null,itemType:null,itemStatus:null,commandExitCode:null,processExitCode:null,signal:null,errorClass:null,...changes}});
const job=(fence,patch={})=>({jobId:'synthetic_job_'+fence,attemptId:'synthetic_attempt_'+fence,workerId:'synthetic_worker',fence,task:'SMOKE_CONNECTION_V1',claimed:true,spawnIntent:true,cancel:false,terminal:false,outcome:null,leaseUntil:at+5000,expiresAt:at+60000,events:[event('turn_started',1)],...patch});
const complete=fence=>job(fence,{terminal:true,outcome:'COMPLETED',events:[event('turn_completed',1),event('process_exit',2,{processExitCode:0})]});
const view=(jobs=[])=>({enabled:true,release:'0.1.1',policyDigest:config.policyDigest,artifactDigest:config.artifactDigest,worker:{workerId:'synthetic_worker',enabled:true,revoked:false,paired:true,keyDigest:'c'.repeat(64)},jobs});
const summary=(v,options={})=>workerWorkSummary({view:v,config,readAt:at,now:at,...options});

test('latest work and last matching completion use fences rather than response order',()=>{
 const s=summary(view([complete(3),job(4),complete(2)]));
 assert.equal(s.latest.fence,4);assert.equal(s.currentWork,true);assert.equal(s.lastConfirmed.fence,3);
 assert.equal(s.lastConfirmed.completedAt,at-998);assert.equal(s.readAt,at);
 assert.equal(s.actor,null);assert.equal(s.model,null);assert.equal(s.automaticExecution,false);assert.equal(s.canonicalSubmit,false);
 assert(!JSON.stringify(s).includes('payload'));assert(Object.isFrozen(s.lastConfirmed));
});
test('completion and worker pairing never establish current execution or machine online status',()=>{
 const s=summary(view([complete(1)]));assert.equal(s.currentState,'NO_ACTIVE_JOB_REPORTED');assert.equal(s.currentWork,false);
 assert.equal(s.lastConfirmed.state,'COMPLETED_CONFIRMED');assert.equal(summary(view()).currentState,'NO_JOB_REPORTED');
});
test('read interruption and freshness expiry preserve completion while removing current work',()=>{
 const v=view([complete(1),job(2)]);
 for(const options of [{unconfirmed:true},{now:at+15000},{now:at+5000}]){
  const s=summary(v,options);assert.equal(s.currentWork,false);assert.equal(s.lastConfirmed.fence,1);assert.notEqual(s.lastConfirmed.completedAt,s.readAt);
 }
 assert.equal(summary(v,{unconfirmed:true}).currentState,'READ_UNCONFIRMED');
 assert.equal(summary(v,{now:at+15000}).currentState,'READBACK_EXPIRED');
});
test('revocation, broker disable and mismatched worker cannot establish activity',()=>{
 for(const alter of [v=>v.worker.revoked=true,v=>v.worker.enabled=false,v=>v.enabled=false,v=>v.worker.workerId='synthetic_other_worker']){
  const v=view([job(2),complete(1)]);alter(v);assert.equal(summary(v).currentWork,false);assert.equal(summary(v).lastConfirmed.fence,1);
 }
});
test('cancelled or failed latest work does not overwrite earlier matching completion',()=>{
 for(const outcome of ['CANCELLED','FAILED','UNKNOWN']){
  const s=summary(view([complete(1),job(2,{terminal:true,outcome,cancel:outcome==='CANCELLED',events:[]})]));
  assert.equal(s.lastConfirmed.fence,1);assert.equal(s.currentWork,false);assert.equal(s.latest.state,outcome);
 }
});
test('conflicting completion is withheld rather than picked optimistically',()=>{
 const bad=complete(2);bad.events.pop();const s=summary(view([bad,complete(1)]));
 assert.equal(s.currentState,'INCONSISTENT');assert.equal(s.lastConfirmed.fence,1);
 assert.equal(summary(view([bad])).lastConfirmed,null);
});
test('invalid private scope or payload fails closed and private extras never enter summary',()=>{
 const v=view([complete(1)]);v.pairingCode='SYNTHETIC_SECRET_CANARY';v.worker.publicKey='SYNTHETIC_KEY_CANARY';
 assert(!JSON.stringify(summary(v)).includes('CANARY'));
 v.jobs[0].events[0].payload.output='SYNTHETIC_RAW_CANARY';assert.throws(()=>summary(v));
 assert.throws(()=>workerWorkSummary({view:view(),config:{...config,projectId:'OTHER'},readAt:at,now:at}));
});
