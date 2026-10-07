// Authored SYNTHETIC fixtures only. No real producer, tokens or private data.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {emptyReportState,reduceExecutionReport,restoreReportState,inspectExecutionReports} from '../docs/contracts/execution-report.mjs';
const t=n=>new Date(Date.UTC(2026,9,7,0,0,n)).toISOString();
const context=()=>({projectId:'SYNTHETIC_PROJECT',missionId:'synthetic-mission',baselineSha:'a'.repeat(40),sourceId:'synthetic-source',sourceRevision:'fixture-v1',sessions:[{bindingId:'fixture-agent',sessionId:'session-a'},{bindingId:'fixture-agent',sessionId:'session-b'},{bindingId:'other-fixture',sessionId:'session-c'}],evidenceIds:['fixture-receipt'],maxAgeMs:30000,maxValidityMs:60000,maxEvents:50});
const report=(patch={})=>({schemaVersion:'mc.execution-report.v1',eventId:'fixture-event-1',projectId:'SYNTHETIC_PROJECT',missionId:'synthetic-mission',baselineSha:'a'.repeat(40),sourceId:'synthetic-source',sourceRevision:'fixture-v1',bindingId:'fixture-agent',sessionId:'session-a',sequence:1,expectedRevision:0,eventAt:t(0),issuedAt:t(0),expiresAt:t(30),kind:'started',model:null,evidenceId:'fixture-receipt',...patch});
const started=()=>reduceExecutionReport(emptyReportState(),report(),context(),t(1)).state;
function rejected(s,r,code,at=t(2),c=context()){const before=JSON.stringify(s),out=reduceExecutionReport(s,r,c,at);assert.equal(out.accepted,false);assert.equal(out.error,code);assert.equal(out.state,s);assert.equal(JSON.stringify(s),before);return out;}
test('synthetic envelope binds exact task/source/version/session and freezes a copied acceptance',()=>{
 const s=emptyReportState(),r=report(),c=context(),out=reduceExecutionReport(s,r,c,t(1));assert.equal(out.accepted,true);assert.equal(out.state.revision,1);r.kind='completed';assert.equal(out.state.history[0].report.kind,'started');assert.ok(Object.isFrozen(out.state.history[0].report));assert.equal(s.history.length,0);
});
test('all authoritative project/mission/baseline/source/revision mismatches retain prior state',()=>{for(const field of ['projectId','missionId','baselineSha','sourceId','sourceRevision'])rejected(emptyReportState(),report({[field]:field==='baselineSha'?'b'.repeat(40):'other'}),'CONTEXT_MISMATCH');});
test('unknown or mismatched binding/session cannot be substituted',()=>{for(const p of [{sessionId:'unknown'},{bindingId:'other-fixture'},{bindingId:'fixture-agent',sessionId:'session-c'}])rejected(emptyReportState(),report(p),'UNKNOWN_SESSION');});
test('nullable model stays null; malformed fields and private/free-form extras rejected',()=>{
 assert.equal(started().history[0].report.model,null);
 for(const p of [{model:'/Users/private'},{model:'Bearer secret'},{model:5},{sequence:1.5},{expectedRevision:-1},{baselineSha:'abc'},{kind:'execute'},{eventId:'../secret'},{command:'rm -rf'},{identityEvidence:'VERIFIED'},{token:'secret'},{output:'raw log'}])rejected(emptyReportState(),report(p),'INVALID_REPORT');
 const noModel=report();delete noModel.model;rejected(emptyReportState(),noModel,'INVALID_REPORT');
});
test('bounded evidence references resolve only to authoritative safe IDs',()=>{rejected(emptyReportState(),report({evidenceId:'unknown'}),'UNKNOWN_EVIDENCE');rejected(emptyReportState(),report({evidenceId:'/agent/log'}),'UNKNOWN_EVIDENCE');assert.equal(reduceExecutionReport(emptyReportState(),report({evidenceId:null}),context(),t(1)).accepted,true);});
test('matching event replay is key-order independent and never renews expired validity',()=>{
 const s=started(),reordered=Object.fromEntries(Object.entries(report()).reverse()),out=reduceExecutionReport(s,reordered,context(),t(50));assert.equal(out.duplicate,true);assert.deepEqual(out.state,s);assert.ok(Object.isFrozen(out.state));assert.equal(inspectExecutionReports(out.state,context(),t(50)).reported.validity,'EXPIRED');
});
test('duplicate ID with changed bytes or extra undefined field conflicts before mutation',()=>{rejected(started(),report({kind:'completed'}),'EVENT_ID_CONFLICT');rejected(started(),report({extra:undefined}),'NON_JSON_DATA');});
test('CAS and strict sequence reject stale, gap and reordered synthetic reports',()=>{
 const s=started(),next=report({eventId:'fixture-event-2',sequence:2,kind:'progress',eventAt:t(2),issuedAt:t(2)});
 rejected(s,next,'REVISION_CONFLICT');for(const sequence of [1,3])rejected(s,{...next,expectedRevision:1,sequence},'SEQUENCE_CONFLICT');assert.equal(reduceExecutionReport(s,{...next,expectedRevision:1},context(),t(2)).accepted,true);
});
test('strict UTC calendar, future, issue order, age, expiry and maximum validity fail closed',()=>{
 for(const p of [{eventAt:'2026-02-30T00:00:00Z'},{eventAt:'2026-10-07T00:00:00+00:00'}])rejected(emptyReportState(),report(p),'INVALID_TIME');
 for(const p of [{eventAt:t(3),issuedAt:t(2)},{issuedAt:t(3)},{expiresAt:t(0)},{expiresAt:t(61)}])rejected(emptyReportState(),report(p),'INVALID_TIME_WINDOW');
 rejected(emptyReportState(),report(),'STALE_REPORT',t(30));rejected(emptyReportState(),report({expiresAt:t(60)}),'STALE_REPORT',t(31));
});
test('session starts explicitly; active-session substitution and repeated start are rejected',()=>{
 rejected(emptyReportState(),report({kind:'progress'}),'START_REQUIRED');const s=started();
 rejected(s,report({eventId:'next',sessionId:'session-b',expectedRevision:1}),'ACTIVE_SESSION_CONFLICT');
 rejected(s,report({eventId:'next',sequence:2,expectedRevision:1}),'SESSION_CLOSED');
});
test('expiry requires a new allowlisted session; completion never arises from timeout',()=>{
 const s=started();rejected(s,report({eventId:'late',kind:'progress',sequence:2,expectedRevision:1,eventAt:t(31),issuedAt:t(31),expiresAt:t(60)}),'SESSION_EXPIRED',t(31));
 const r=report({eventId:'recovery',sessionId:'session-b',expectedRevision:1,eventAt:t(31),issuedAt:t(31),expiresAt:t(60)}),out=reduceExecutionReport(s,r,context(),t(31));assert.equal(out.accepted,true);assert.equal(out.state.history.length,2);assert.equal(out.state.history[0].report.kind,'started');assert.equal(inspectExecutionReports(out.state,context(),t(32)).reported.kind,'started');
});
test('reported permission request grants nothing and disconnect/completion/failure close only their session',()=>{
 for(const kind of ['permission-needed','disconnected','completed','failed']){
  const s=started(),r=report({eventId:'next',kind,sequence:2,expectedRevision:1,eventAt:t(2),issuedAt:t(2)}),out=reduceExecutionReport(s,r,context(),t(2));assert.equal(out.accepted,true);const v=inspectExecutionReports(out.state,context(),t(3));assert.equal(v.reported.ownerAcceptance,'NOT_INFERRED');assert.equal(v.currentAgent,null);assert.equal(v.currentTask,null);
  if(kind!=='permission-needed'){rejected(out.state,report({...r,eventId:'resume',kind:'progress',sequence:3,expectedRevision:2}),'SESSION_CLOSED',t(3));assert.equal(v.reported.validity,'CLOSED');}
 }
});
test('caller-declared allowed identity never becomes verified even when impersonating another fixture session',()=>{
 const out=reduceExecutionReport(emptyReportState(),report({bindingId:'other-fixture',sessionId:'session-c',model:'synthetic-model'}),context(),t(1)),v=inspectExecutionReports(out.state,context(),t(2));assert.equal(v.reported.identityEvidence,'CALLER_DECLARED_IDENTITY_NOT_VERIFIED');assert.equal(v.reported.observation,'PRODUCER_ATTESTATION_NOT_PROCESS_OBSERVATION');assert.equal(v.runtimeConnected,false);assert.equal(v.scope,'ISOLATED_REPORT_CONTRACT_NOT_CONNECTED');
});
test('restart validates history without freshening read time, expiry or historical identity',()=>{
 const s=started(),restored=restoreReportState(JSON.parse(JSON.stringify(s)),context());assert.deepEqual(restored,s);const v=inspectExecutionReports(restored,context(),t(50));assert.equal(v.reported.receivedAt,t(1));assert.equal(v.reported.validity,'EXPIRED');assert.equal(v.currentAgent,null);assert.equal(v.history[0].report.bindingId,'fixture-agent');
 for(const alter of [x=>x.revision++,x=>x.history[0].report.sequence++,x=>x.history[0].receivedAt=t(40),x=>x.history[0].report.sourceRevision='different']){const bad=JSON.parse(JSON.stringify(s));alter(bad);assert.throws(()=>restoreReportState(bad,context()));}
});
test('history capacity fails closed without dropping dedupe/sequence receipts',()=>{
 const c={...context(),maxEvents:1},s=started();rejected(s,report({eventId:'next',kind:'progress',sequence:2,expectedRevision:1}),'HISTORY_CAPACITY',t(2),c);
});
test('read time and same-session event time cannot regress',()=>{
 const s=started();rejected(s,report({eventId:'next',kind:'progress',sequence:2,expectedRevision:1}),'READ_TIME_REGRESSION',t(0));assert.throws(()=>inspectExecutionReports(s,context(),t(0)));
 const second=reduceExecutionReport(s,report({eventId:'next',kind:'progress',sequence:2,expectedRevision:1,eventAt:t(5),issuedAt:t(5)}),context(),t(5)).state;
 rejected(second,report({eventId:'regress',kind:'progress',sequence:3,expectedRevision:2,eventAt:t(4),issuedAt:t(6)}),'TIME_REGRESSION',t(6));
});
test('contract has no IO or application wiring; private GET404 and nonGET403 remain unchanged',async()=>{
 const code=fs.readFileSync(new URL('../docs/contracts/execution-report.mjs',import.meta.url),'utf8');assert.doesNotMatch(code,/^\s*import[ (]|\bfetch\s*\(|Date\.now|new Date\(\)|writeFile|process\./m);
 for(const file of ['../api/index.mjs','../src/server.mjs','../src/api/routes.mjs','../public/app.js'])assert.doesNotMatch(fs.readFileSync(new URL(file,import.meta.url),'utf8'),/execution-report/);
 const {productionResponse}=await import('../api/index.mjs');for(const path of ['/docs/contracts/execution-report.mjs','/api/execution-reports']){assert.equal(productionResponse('GET',new URL('https://synthetic'+path)).status,404);for(const method of ['POST','PATCH','PUT','DELETE'])assert.equal(productionResponse(method,new URL('https://synthetic'+path)).status,403);}
});

test('new synthetic session cannot replace later history with an older source event',()=>{const s=started(),closed=reduceExecutionReport(s,report({eventId:'closed',kind:'disconnected',sequence:2,expectedRevision:1,eventAt:t(5),issuedAt:t(5)}),context(),t(5)).state;rejected(closed,report({eventId:'older',sessionId:'session-b',expectedRevision:2,eventAt:t(4),issuedAt:t(6)}),'TIME_REGRESSION',t(6));});

test('non-JSON serialization/accessor/inherited/symbol tricks cannot save unchecked private payload',()=>{
 for(const mutate of [r=>Object.defineProperty(r,'toJSON',{value:()=>({...r,kind:'execute',command:'private body'})}),r=>Object.defineProperty(r,'hidden',{value:'secret'}),r=>Object.defineProperty(r,'kind',{enumerable:true,get(){throw new Error('accessor executed');}}),r=>Object.setPrototypeOf(r,{toJSON(){return {};}}),r=>r[Symbol('hidden')]='private']){const r=report();mutate(r);rejected(emptyReportState(),r,'NON_JSON_DATA');}
 const c=context();Object.defineProperty(c,'toJSON',{value:()=>({})});rejected(emptyReportState(),report(),'NON_JSON_DATA',t(1),c);
 const bad=JSON.parse(JSON.stringify(started()));Object.defineProperty(bad.history[0].report,'toJSON',{value:()=>({})});assert.throws(()=>restoreReportState(bad,context()),/NON_JSON_DATA/);
});
test('duplicate from parsed valid restart snapshot returns deep immutable copy',()=>{
 const s=JSON.parse(JSON.stringify(started())),out=reduceExecutionReport(s,report(),context(),t(50));assert.equal(out.accepted,true);assert.equal(out.duplicate,true);assert.ok(Object.isFrozen(out.state));assert.ok(Object.isFrozen(out.state.history[0].report));s.history[0].report.kind='execute';assert.equal(out.state.history[0].report.kind,'started');
});
