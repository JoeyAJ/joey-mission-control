// Synthetic ports only; no live Owner action, VM command, credential or job.
import test from 'node:test';import assert from 'node:assert/strict';
import {createOwnerVmLink} from '../../../../src/continuity/owner-vm-link.mjs';
import {vmBootstrapCommand,vmBootstrapDigest} from '../../../../src/continuity/owner-vm-link-command.mjs';
const config={enabled:true,projectId:'NEXAEON',policyDigest:'a'.repeat(64),artifactDigest:'b'.repeat(64)};
const session={status:'authenticated',verified:true,aal:'aal2',memberActive:true};
function fixture(options={}){
 const calls=[];let gate=null,auth=null,view={enabled:true,release:'0.1.1',...config,worker:options.initialWorker||null,jobs:[]};
 const ui=createOwnerVmLink({config,inspectSession:()=>auth?auth():Promise.resolve(session),rpc:async r=>{
  calls.push(r);if(r.action==='approve_pair'){
   view={...view,worker:{workerId:r.body.workerId,enabled:false,revoked:false,paired:false,keyDigest:null},jobs:[{jobId:'synthetic_job',attemptId:'synthetic_attempt',workerId:r.body.workerId,fence:1,task:'SMOKE_CONNECTION_V1',claimed:false,spawnIntent:false,cancel:false,terminal:false,outcome:null,events:[]}]};
   if(gate)await gate;return{workerId:r.body.workerId,jobId:'synthetic_job',...config};
  }return structuredClone(view);
 },...options});
 return{ui,calls,setGate:p=>{gate=p;},setAuth:f=>{auth=f;},view:()=>view};
}
async function prepared(f){await f.ui.refresh();const worker=f.ui.prepareTerminal();f.ui.confirmTerminalReady({explicit:true});return worker;}
test('terminal preparation is idempotent and never creates code or calls Owner mutation',async()=>{
 const f=fixture();await f.ui.refresh();const n=f.calls.length,w=f.ui.prepareTerminal();assert.equal(f.ui.prepareTerminal(),w);assert.equal(f.calls.length,n);assert.equal(f.ui.snapshot().pairingCode,null);assert.match(w,/^ubuntu-1-/);f.ui.dispose();
});
test('pairing approval requires loaded state and explicit terminal-wait confirmation',async()=>{
 const f=fixture();await assert.rejects(f.ui.approvePair());await f.ui.refresh();f.ui.prepareTerminal();await assert.rejects(f.ui.approvePair());assert.throws(()=>f.ui.confirmTerminalReady());assert.equal(f.calls.filter(x=>x.action==='approve_pair').length,0);f.ui.dispose();
});
test('command and approved worker agree; no secret is in command or RPC body',async()=>{
 const f=fixture(),w=await prepared(f),command=vmBootstrapCommand(w);const ack=await f.ui.approvePair();
 assert.equal(ack.workerId,w);assert.equal(f.calls.find(x=>x.action==='approve_pair').body.workerId,w);assert.equal(command.split('\n').length,1);assert(command.includes(vmBootstrapDigest));assert(command.includes("node \"$mc_bootstrap_path\" '"+w+"'"));
 const code=f.ui.snapshot().pairingCode;assert.equal(code.length,51);assert(!command.includes(code));assert(!JSON.stringify(f.calls).includes(code));f.ui.dispose();
});
test('hide clears secret while retaining command, terminal state and readback',async()=>{
 const f=fixture(),w=await prepared(f),before=f.ui.snapshot().view;f.ui.clearPairingCode();assert.equal(f.ui.snapshot().preparedWorker,w);assert.equal(f.ui.snapshot().terminalReady,true);assert.equal(f.ui.snapshot().view,before);
 await f.ui.approvePair();const view=f.ui.snapshot().view;f.ui.clearPairingCode();assert.equal(f.ui.snapshot().pairingCode,null);assert.equal(f.ui.snapshot().view,view);assert.equal(f.ui.snapshot().preparedWorker,w);assert.equal(f.ui.snapshot().codeClearedReason,'PAGE_HIDDEN');assert.equal(f.calls.filter(x=>x.action==='approve_pair').length,1);f.ui.dispose();
});
test('readback of a previously revoked worker retains the new prepared terminal',async()=>{
 const f=fixture({initialWorker:{workerId:'ubuntu-1-11111111-1111-4111-8111-111111111111',enabled:false,revoked:true,paired:false,keyDigest:null}}),w=await prepared(f);
 f.ui.clearPairingCode();await f.ui.refresh();assert.equal(f.ui.snapshot().preparedWorker,w);assert.equal(f.ui.snapshot().terminalReady,true);assert.equal(f.ui.snapshot().pairingCode,null);assert.equal(f.calls.filter(x=>x.action==='approve_pair').length,0);
 const ack=await f.ui.approvePair();assert.equal(ack.workerId,w);f.ui.dispose();
});
test('hide during Auth inspection prevents a new pairing approval',async()=>{
 const f=fixture();await prepared(f);let resolve;f.setAuth(()=>new Promise(r=>{resolve=r;}));const task=f.ui.approvePair();
 while(!resolve)await new Promise(r=>setImmediate(r));f.ui.clearPairingCode();resolve(session);await assert.rejects(task);assert.equal(f.calls.filter(x=>x.action==='approve_pair').length,0);assert.equal(f.ui.snapshot().pairingCode,null);f.ui.dispose();
});
test('hide during committed approval cannot reintroduce a code or duplicate job',async()=>{
 const f=fixture();await prepared(f);let resolve;f.setGate(new Promise(r=>{resolve=r;}));const task=f.ui.approvePair();
 while(!f.calls.some(x=>x.action==='approve_pair'))await new Promise(r=>setImmediate(r));f.ui.clearPairingCode();resolve();const ack=await task;
 assert.equal(ack.codeAvailable,false);assert.equal(f.ui.snapshot().pairingCode,null);assert.equal(f.ui.snapshot().view.jobs.length,1);await assert.rejects(f.ui.approvePair());assert.throws(()=>f.ui.prepareTerminal());assert.equal(f.calls.filter(x=>x.action==='approve_pair').length,1);f.ui.dispose();
});
test('expiry clears the code without resetting readback or creating a replacement',async()=>{
 let expire,delay;const f=fixture({setTimer:(fn,ms)=>{expire=fn;delay=ms;return 1;},clearTimer:()=>{}});await prepared(f);await f.ui.approvePair();assert(delay>0&&delay<=600000);expire();assert.equal(f.ui.snapshot().pairingCode,null);assert.equal(f.ui.snapshot().codeClearedReason,'EXPIRED');assert.equal(f.ui.snapshot().view.jobs.length,1);assert.equal(f.calls.filter(x=>x.action==='approve_pair').length,1);f.ui.dispose();
});
test('logout or project clear removes command preparation and sensitive state',async()=>{
 const f=fixture();await prepared(f);await f.ui.approvePair();f.ui.clear();const s=f.ui.snapshot();assert.equal(s.preparedWorker,null);assert.equal(s.pairingCode,null);assert.equal(s.view,null);assert.equal(s.terminalReady,false);f.ui.dispose();
});
test('command rejects shell syntax, unrelated IDs and wrong machine prefixes',()=>{
 for(const id of ['830ab50c-37e7-49cc-b82e-47b84be12af4','ubuntu-1-$(id)','ubuntu-2-07f72d78-29d3-47cc-a649-6fae8085f0f1','ubuntu-1-07f72d78-29d3-47cc-a649-6fae8085f0f1\n'])assert.throws(()=>vmBootstrapCommand(id));
});
