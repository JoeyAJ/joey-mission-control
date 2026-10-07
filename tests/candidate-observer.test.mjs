// Synthetic Codex JSONL shapes only; no model process/session/auth source read.
import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';
import {createCandidateObserver,candidateObserverContext} from '../docs/contracts/candidate-observer.mjs';
import {spawnSync} from 'node:child_process';
import {JsonStore} from '../src/storage/json-store.mjs';
const t=n=>new Date(Date.UTC(2026,9,7,0,0,n)).toISOString();
async function fixture(testContext){const root=await fs.mkdtemp(path.join(os.tmpdir(),'mc-observer-candidate-'));testContext.after(()=>fs.rm(root,{recursive:true,force:true}));const options={root,qualification:'SYNTHETIC_FIXTURE'},observer=await createCandidateObserver(options);return {root,options,observer};}
const input=(patch={})=>({line:JSON.stringify({type:'thread.started',thread_id:'candidate-session-1'}),deliverySequence:1,sessionId:'candidate-session-1',expectedRevision:0,receivedAt:t(0),...patch});
test('standard synthetic events pass contract to immutable history, dropping raw command/message/model/identity claims',async tc=>{
 const {root,observer}=await fixture(tc);assert.equal((await observer.ingest(input())).accepted,true);
 const raw={type:'item.started',item:{type:'command_execution',command:'SYNTHETIC_PRIVATE_COMMAND',output:'SYNTHETIC_PRIVATE_OUTPUT'},model:'pretended',identity:'VERIFIED',message:'SYNTHETIC_PRIVATE_MESSAGE'};
 assert.equal((await observer.ingest(input({line:JSON.stringify(raw),deliverySequence:2,expectedRevision:1,receivedAt:t(1)}))).accepted,true);
 const bytes=await fs.readFile(path.join(root,'execution-reports.v1.json'),'utf8');assert.doesNotMatch(bytes,/SYNTHETIC_PRIVATE|pretended|VERIFIED"/);
 const v=await observer.inspect(t(2));assert.equal(v.revision,2);assert.equal(v.qualification,'SYNTHETIC_FIXTURE');assert.equal(v.runtimeConnected,false);assert.equal(v.currentAgent,null);assert.equal(v.context.projectId,'MISSION_CONTROL');assert.equal(v.history[0].sourceEventTime,null);assert.equal(v.history[0].timeBasis,'OBSERVER_RECEIVED_TIME_NOT_SOURCE_EVENT');assert.equal(v.history[0].report.model,null);
});
test('binding, unsupported/selfclaim events, malformed/oversized input and formal roots are rejected',async tc=>{
 const {observer}=await fixture(tc);for(const patch of [{line:'{'},{line:'x'.repeat(65537)},{line:'{"type":"working","verified":true}'},{sessionId:'other'},{line:'{"type":"thread.started","thread_id":"other"}'}])assert.equal((await observer.ingest(input(patch))).accepted,false);
 for(const root of [process.cwd(),'/workspace/mc-private-restore'])await assert.rejects(createCandidateObserver({root}),/isolated candidate/);await assert.rejects(createCandidateObserver({root:'/tmp/mc-observer-candidate-forbidden',qualification:'VERIFIED'}),/qualification/);
});
test('single-writer lock serializes two callers; duplicate/no-CAS failures do not rewrite accepted receipt',async tc=>{
 const {root,options,observer}=await fixture(tc);await observer.ingest(input());const other=await createCandidateObserver(options),a=input({line:'{"type":"turn.started"}',deliverySequence:2,expectedRevision:1,receivedAt:t(1)}),b={...a,line:'{"type":"item.started"}'};
 const results=await Promise.all([observer.ingest(a),other.ingest(b)]);assert.equal(results.filter(r=>r.accepted).length,1);assert.equal((await observer.inspect(t(2))).revision,2);
 const file=path.join(root,'execution-reports.v1.json'),before=await fs.readFile(file,'utf8');assert.equal((await observer.ingest(input())).duplicate,true);const stale=await observer.ingest(input({line:'{"type":"item.completed"}',deliverySequence:3,expectedRevision:1,receivedAt:t(2)}));assert.equal(stale.error,'REVISION_CONFLICT');assert.equal(await fs.readFile(file,'utf8'),before);
});
test('restart/replay does not freshen expiry; interruption requires new allowed session and retains historical receipts',async tc=>{
 const {options,observer}=await fixture(tc);await observer.ingest(input());const restarted=await createCandidateObserver(options);assert.equal((await restarted.inspect(t(61))).reported.validity,'EXPIRED');await restarted.ingest(input({receivedAt:t(61)}));assert.equal((await restarted.inspect(t(61))).reported.validity,'EXPIRED');assert.equal((await restarted.ingest(input({line:'{"type":"turn.started"}',deliverySequence:2,expectedRevision:1,receivedAt:t(61)}))).accepted,false);
 const recovery=input({line:'{"type":"thread.started","thread_id":"candidate-session-2"}',sessionId:'candidate-session-2',deliverySequence:2,expectedRevision:1,receivedAt:t(61)});assert.equal((await restarted.ingest(recovery)).accepted,true);const v=await restarted.inspect(t(62));assert.equal(v.history.length,2);assert.equal(v.history[0].receivedAt,t(0));assert.equal(v.currentTask,null);assert.equal(v.platformEventSource,'NOT_CONNECTED');
});
test('failed atomic write keeps previous bytes and corrupt snapshots fail without quarantine/reset; repair restores',async tc=>{
 const {root,observer}=await fixture(tc);await observer.ingest(input());const file=path.join(root,'execution-reports.v1.json'),before=await fs.readFile(file,'utf8'),original=JsonStore.prototype.write;
 JsonStore.prototype.write=async()=>{throw Error('Synthetic interruption before rename');};try{assert.equal((await observer.ingest(input({line:'{"type":"turn.started"}',deliverySequence:2,expectedRevision:1,receivedAt:t(1)}))).accepted,false);}finally{JsonStore.prototype.write=original;}
 assert.equal(await fs.readFile(file,'utf8'),before);await fs.writeFile(file,'{');await assert.rejects(observer.inspect(t(2)));assert.equal((await observer.ingest(input())).accepted,false);assert.equal(await fs.readFile(file,'utf8'),'{');await fs.writeFile(file,'[]');await assert.rejects(observer.inspect(t(2)));assert.equal((await observer.ingest(input())).accepted,false);assert.equal(await fs.readFile(file,'utf8'),'[]');await fs.writeFile(file,before);assert.equal((await observer.inspect(t(2))).revision,1);
});
test('unverified imported events and qualifications cannot upgrade current; changed source config cannot reuse store',async tc=>{
 const {root,observer}=await fixture(tc);await observer.ingest(input());const unverified=await createCandidateObserver({root,qualification:'UNVERIFIED_IMPORTED_JSONL'});await assert.rejects(unverified.inspect(t(1)));const changed=await createCandidateObserver({root,qualification:'SYNTHETIC_FIXTURE',context:{...candidateObserverContext,baselineSha:'b'.repeat(40)}});await assert.rejects(changed.inspect(t(1)));
});

test('stdin consumer rejects oversized unterminated input before storing and preserves previous bytes',async tc=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'mc-observer-candidate-cli-'));tc.after(()=>fs.rm(root,{recursive:true,force:true}));const run=input=>spawnSync(process.execPath,['docs/contracts/observer-stdin.mjs',root,'candidate-session-1'],{input,encoding:'utf8',timeout:5000});const first=run('{"type":"thread.started","thread_id":"candidate-session-1"}\n');assert.equal(first.status,0);const file=path.join(root,'execution-reports.v1.json'),before=await fs.readFile(file,'utf8');const oversized=run('x'.repeat(65537));assert.equal(oversized.status,1);assert.match(oversized.stdout,/INVALID_INPUT/);assert.equal(await fs.readFile(file,'utf8'),before);assert.doesNotMatch(oversized.stdout,/xxxx/);
});
