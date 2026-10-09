import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createTaskEventChain,prepareTaskEventRun,prepareTaskEventHandoff} from '../src/continuity/task-event-chain.mjs';
import {createRemoteHandoffReader} from '../src/continuity/remote-handoff-reader.mjs';
import {readRemoteHandoff} from '../src/canonical/remote-handoff-adapter.mjs';
import {productionResponse} from '../api/index.mjs';
const A='a'.repeat(40),B='b'.repeat(40),DIGEST='d'.repeat(64),TIME=Date.parse('2026-10-09T08:20:00.000Z'),OWNER='11111111-1111-4111-8111-111111111111';
const selection={agent:'replaceable-agent',provider:'provider-a',model:'model-a'};
const t=ms=>new Date(TIME+ms).toISOString();
function handoff(patch={}){return {qualification:'READ_ONLY_REPOSITORY_HANDOFF',projectId:'MISSION_CONTROL',providerNeutral:true,executionAuthorized:false,sourceStatus:'FOUND',freshness:'RECENT_DOCUMENT',source:{qualification:'REMOTE_FILE_READ',repositoryId:'fixture/private',requestedRef:'candidate',path:'HANDOFF.md',resolvedCommitSha:A,contentSha256:DIGEST,readAt:t(0)},...patch};}
function fixture(options={}){let now=TIME;const chain=createTaskEventChain({projectId:'MISSION_CONTROL',taskId:'independent-task',chainId:'chain-1',now:()=>now,...options});const register=patch=>chain.registerRun({runId:'run-1',ownerSelection:selection,handoff:handoff(),sourceQualification:'SYNTHETIC_FIXTURE',...patch});register();return {chain,register,time:ms=>now=TIME+ms};}
function event(sequence=1,kind='started',patch={}){return {eventId:'event-'+sequence,projectId:'MISSION_CONTROL',taskId:'independent-task',runId:'run-1',agent:selection.agent,provider:selection.provider,requestedModel:selection.model,actualModel:null,sequence,eventAt:null,kind,summaryCode:{started:'RUN_STARTED',progress:'WORK_PROGRESS',blocked:'PERMISSION_REQUIRED',completed:'RUN_COMPLETED',failed:'RUN_FAILED'}[kind],safeErrorCategory:['blocked','failed'].includes(kind)?kind==='blocked'?'PERMISSION_REQUIRED':'UNSPECIFIED_FAILURE':null,handoffSha:A,...patch};}
const append=(chain,e)=>chain.append(e,{expectedOffset:chain.snapshot().eventCount});

test('ordered started/progress/blocked/resumed/completed events preserve task identity and explicit unknown actual model',()=>{
 const {chain,time}=fixture();for(const [index,kind]of ['started','progress','blocked','progress','completed'].entries()){time(index*1000);append(chain,event(index+1,kind,{eventAt:t(index*1000)}));}
 const view=chain.inspectRun('run-1');assert.equal(view.status,'completed');assert.equal(view.sequence,5);assert.equal(view.actualModel,null);assert.equal(view.modelQualification,'UNKNOWN');assert.equal(view.validity,'CLOSED');assert.equal(view.currentModel,null);assert.equal(view.runtimeConnected,false);assert.equal(view.executionAuthorized,false);
 assert.throws(()=>append(chain,event(6,'progress')),/RUN_CLOSED/);assert.equal(chain.snapshot().eventCount,5);
});

test('Owner selection is required per run, never assigned to the task or inferred as actual model; replacing provider creates a new run',()=>{
 const {chain,register}=fixture();assert.throws(()=>register({runId:'unspecified',ownerSelection:{...selection,model:null}}),/MODEL_DECISION_REQUIRED/);
 assert.throws(()=>register({runId:'implicit',ownerSelection:{...selection,provider:null}}),/AGENT_PROVIDER_DECISION_REQUIRED/);
 append(chain,event());register({runId:'run-2',ownerSelection:{agent:'other-agent',provider:'provider-b',model:'model-b'}});
 assert.equal(chain.snapshot().taskId,'independent-task');assert.equal(chain.inspectRun('run-1').selection.requestedModel,'model-a');assert.equal(chain.inspectRun('run-2').selection.requestedModel,'model-b');assert.equal(chain.inspectRun('run-2').actualModel,null);
 assert.throws(()=>register({ownerSelection:{...selection,model:'model-b'}}),/RUN_ID_CONFLICT/);assert.equal(register().duplicate,true);
});

test('fallback or changing actual model cannot silently produce progress/completion; mismatch is retained as a blocked/failed receipt',()=>{
 const {chain}=fixture();append(chain,event(1,'started',{actualModel:'model-a'}));
 assert.throws(()=>append(chain,event(2,'completed',{actualModel:'model-b'})),/MODEL_MISMATCH/);
 append(chain,event(2,'blocked',{actualModel:'model-b',summaryCode:'MODEL_MISMATCH',safeErrorCategory:'MODEL_MISMATCH'}));
 assert.equal(chain.inspectRun('run-1').actualModel,'model-b');assert.equal(chain.inspectRun('run-1').modelQualification,'REPORTED_MISMATCH');
 assert.throws(()=>append(chain,event(3,'progress')),/MODEL_MISMATCH/);
 append(chain,event(3,'failed',{actualModel:'model-b',summaryCode:'MODEL_MISMATCH',safeErrorCategory:'MODEL_MISMATCH'}));assert.equal(chain.inspectRun('run-1').status,'failed');
});

test('idempotent sanitized retries do not append, renew time or bypass conflicts; offset and per-run sequence prevent gaps',()=>{
 const {chain,time}=fixture();const original=event();append(chain,original);time(1000);
 assert.equal(chain.append({...original,rawModelPayload:'DIFFERENT_IGNORED_PRIVATE_VALUE'},{expectedOffset:0}).duplicate,true);assert.equal(chain.readPage().events[0].receivedAt,t(0));
 assert.throws(()=>chain.append(event(2,'progress'),{expectedOffset:0}),/OFFSET_CONFLICT/);
 assert.throws(()=>append(chain,event(3,'progress')),/SEQUENCE_CONFLICT/);
 assert.throws(()=>append(chain,{...original,actualModel:'model-a'}),/EVENT_ID_CONFLICT/);
 assert.equal(chain.snapshot().eventCount,1);
});

test('cursor resumes exactly once, survives appended events, and cannot cross task/run/chain or invent anchors',()=>{
 const {chain,register}=fixture();append(chain,event());append(chain,event(2,'progress'));register({runId:'run-2'});
 append(chain,event(1,'started',{runId:'run-2',eventId:'other-run-1'}));
 const first=chain.readPage({limit:1});assert.equal(first.events[0].sequence,1);assert.equal(first.hasMore,true);
 const rest=chain.readPage({cursor:first.cursor});assert.deepEqual(rest.events.map(e=>e.eventId),['event-2','other-run-1']);assert.equal(rest.hasMore,false);
 append(chain,event(3,'completed'));assert.deepEqual(chain.readPage({cursor:rest.cursor}).events.map(e=>e.eventId),['event-3']);
 for(const patch of [{projectId:'OTHER'},{taskId:'other'},{chainId:'other'},{runId:'run-2'},{offset:100},{anchorEventId:'invented'}])assert.throws(()=>chain.readPage({cursor:{...first.cursor,...patch}}),/CURSOR_SCOPE_MISMATCH/);
 const only=chain.readPage({runId:'run-2'});assert.equal(only.events.length,1);assert.equal(chain.readPage({runId:'run-2',cursor:only.cursor}).events.length,0);
});

test('unknown logs/credentials/payloads are discarded without evaluating accessors; free prose and sensitive identifiers are refused',()=>{
 const {chain}=fixture();let touched=false;const input=event();Object.defineProperty(input,'rawModelPayload',{enumerable:true,get(){touched=true;throw Error('SECRET_GETTER');}});input.credentials='SYNTHETIC_PRIVATE_SECRET';input.command='SYNTHETIC_COMMAND';input.stdout='SYNTHETIC_RAW_OUTPUT';append(chain,input);
 assert.equal(touched,false);assert.doesNotMatch(JSON.stringify(chain.snapshot())+JSON.stringify(chain.readPage()),/SYNTHETIC_PRIVATE|SYNTHETIC_COMMAND|SYNTHETIC_RAW_OUTPUT|rawModelPayload|credentials/);
 assert.throws(()=>append(chain,event(2,'progress',{summaryCode:'arbitrary private prose'})),/INVALID_EVENT/);
 assert.throws(()=>append(chain,event(2,'progress',{actualModel:'Bearer SYNTHETIC_TOKEN'})),/INVALID_IDENTIFIER/);
 const getter=event(2,'progress');Object.defineProperty(getter,'actualModel',{get(){touched=true;return 'model-a';}});assert.throws(()=>append(chain,getter),/INVALID_METADATA/);assert.equal(touched,false);
});

test('source time is never invented; future/regressing timestamps, wrong scopes and pins do not alter accepted history',()=>{
 const {chain,time}=fixture();append(chain,event());assert.equal(chain.readPage().events[0].eventAt,null);assert.equal(chain.readPage().events[0].timeBasis,'RECEIVER_TIME_NOT_SOURCE_EVENT');
 for(const patch of [{projectId:'OTHER'},{taskId:'other'},{runId:'unknown'},{agent:'other'},{provider:'other'},{requestedModel:'other'},{handoffSha:B}])assert.throws(()=>append(chain,event(2,'progress',patch)));
 assert.throws(()=>append(chain,event(2,'progress',{eventAt:t(1)})),/EVENT_TIME_INVALID/);time(1000);append(chain,event(2,'progress',{eventAt:t(1000)}));
 assert.throws(()=>append(chain,event(3,'progress',{eventAt:t(999)})),/EVENT_TIME_INVALID/);time(999);assert.throws(()=>append(chain,event(3,'progress')),/RECEIVED_TIME_REGRESSION/);
 assert.equal(chain.snapshot().eventCount,2);
});

test('bounded memory preserves cursors and old receipts without truncation; stale inspection and disposal do not create live state',()=>{
 const {chain,time,register}=fixture({maxEvents:1,maxRuns:1});append(chain,event());assert.throws(()=>append(chain,event(2,'progress')),/EVENT_CAPACITY/);assert.throws(()=>register({runId:'run-2'}),/RUN_CAPACITY/);
 const before=chain.readPage();time(300000);assert.equal(chain.inspectRun('run-1').validity,'STALE');assert.deepEqual(chain.readPage(),before);chain.dispose();assert.throws(()=>chain.readPage(),/CHAIN_CLOSED/);assert.throws(()=>chain.snapshot(),/CHAIN_CLOSED/);
});

function readerFixture(){
 let now=TIME,sha=A,content='# Handoff\nProject: MISSION_CONTROL\nTimestamp: '+t(0)+'\nTask: Independent task\nStatus: COMPLETED\n## Summary\nSYNTHETIC_SOURCE_ONLY\n## Next Action\nRead latest source.',unavailable=false,member=true,reads=0;
 const configuration={projectId:'MISSION_CONTROL',repositoryId:'fixture/private',ref:'candidate',path:'HANDOFF.md',legacyPath:null,expectedBaseline:A};
 const repository={resolveRevision:async()=>{reads++;if(unavailable)throw Error('SYNTHETIC_OUTAGE');return {commitSha:sha};},readFile:async({commitSha})=>({status:'FOUND',entryType:'file',commitSha,content})};
 const reader=createRemoteHandoffReader({enabled:true,ownerSubject:OWNER,configuration,now:()=>now,inspectCurrentOwner:async()=>({status:'authenticated',subject:OWNER,role:'OWNER',aal:'aal2',verified:true,sessionActive:true,memberActive:member,projects:['MISSION_CONTROL'],expiresAt:now+60000}),sourceRead:()=>readRemoteHandoff({configuration,reader:repository,now:()=>now}),digestText:async text=>createHash('sha256').update(text).digest('hex'),setTimer:()=>1,clearTimer:()=>{}});
 const chain=createTaskEventChain({projectId:'MISSION_CONTROL',taskId:'independent-task',chainId:'integration-chain',now:()=>now});
 return {reader,chain,reads:()=>reads,time:value=>now=TIME+value,revision:value=>{sha=value;content=content.replace('SYNTHETIC_SOURCE_ONLY','SYNTHETIC_CHANGED_SOURCE');},unavailable:value=>unavailable=value,member:value=>member=value};
}

test('existing Owner-reader integration rechecks current SHA for registration and handoff; historical run pin stays intact after branch drift',async()=>{
 const f=readerFixture();await prepareTaskEventRun({...f,runId:'run-1',ownerSelection:selection,sourceQualification:'SYNTHETIC_FIXTURE'});append(f.chain,event());append(f.chain,event(2,'completed'));
 f.time(1000);f.revision(B);const packet=await prepareTaskEventHandoff({...f,runId:'run-1',ownerSelection:{agent:'next-agent',provider:'provider-b',model:'model-b'}});
 assert.equal(packet.source.resolvedCommitSha,B);assert.equal(packet.taskEventContext.runHandoffSource.resolvedCommitSha,A);assert.equal(packet.taskEventContext.latestSourceChanged,true);assert.equal(packet.targetSelection.model,'model-b');assert.equal(packet.taskEventContext.reportedRun.selection.requestedModel,'model-a');assert.equal(packet.currentModel,null);assert.equal(packet.executionAuthorized,false);assert.equal(packet.taskEventContext.cursor.offset,2);assert.equal(f.reads(),2);
 assert.equal(f.chain.readPage({cursor:packet.taskEventContext.cursor}).events.length,0);f.reader.dispose();
});

test('outage, Owner revocation, stale source and conflicting handoff refuse continuation instead of reusing last confirmed source',async()=>{
 const f=readerFixture();await prepareTaskEventRun({...f,runId:'run-1',ownerSelection:selection});f.unavailable(true);await assert.rejects(prepareTaskEventHandoff({...f,runId:'run-1'}),/CURRENT_HANDOFF_UNAVAILABLE/);f.unavailable(false);f.member(false);await assert.rejects(prepareTaskEventHandoff({...f,runId:'run-1'}),/CURRENT_HANDOFF_UNAVAILABLE/);f.reader.dispose();
 const {register}=fixture();for(const patch of [{sourceStatus:'STALE'},{freshness:'STALE_DOCUMENT'},{projectId:'OTHER'},{executionAuthorized:true}])assert.throws(()=>register({runId:'invalid',handoff:handoff(patch)}),/HANDOFF_REQUIRED/);
 const stale=handoff();stale.source.readAt=t(-300001);assert.throws(()=>register({runId:'stale',handoff:stale}),/HANDOFF_OBSERVATION_STALE/);
});

test('events appended during asynchronous source checking invalidate the prepared continuation',async()=>{
 const f=readerFixture();await prepareTaskEventRun({...f,runId:'run-1',ownerSelection:selection});let finish;const original=f.reader;const delayed={refresh:()=>new Promise(resolve=>finish=async()=>resolve(await original.refresh())),handoff:value=>original.handoff(value)};
 const pending=prepareTaskEventHandoff({...f,reader:delayed,runId:'run-1'});append(f.chain,event());await finish();await assert.rejects(pending,/EVENT_CHAIN_CHANGED_DURING_READ/);f.reader.dispose();
});

test('missing Owner model stops before repository IO; handoff cannot substitute SHA after refresh or leak extra top-level payload',async()=>{
 const f=readerFixture();await assert.rejects(prepareTaskEventRun({...f,runId:'missing',ownerSelection:{...selection,model:null}}),/MODEL_DECISION_REQUIRED/);assert.equal(f.reads(),0);
 await prepareTaskEventRun({...f,runId:'run-1',ownerSelection:selection});
 const changed={refresh:()=>f.reader.refresh(),handoff:async choice=>{const packet=await f.reader.handoff(choice);packet.source.resolvedCommitSha=B;return packet;}};
 await assert.rejects(prepareTaskEventHandoff({...f,reader:changed,runId:'run-1'}),/HANDOFF_CHANGED_DURING_READ/);
 let touched=false;const decorated={refresh:()=>f.reader.refresh(),handoff:async choice=>{const packet=await f.reader.handoff(choice);Object.defineProperty(packet,'rawModelPayload',{enumerable:true,get(){touched=true;throw Error('SYNTHETIC_SECRET');}});return packet;}};
 const packet=await prepareTaskEventHandoff({...f,reader:decorated,runId:'run-1'});assert.equal(touched,false);assert.equal(Object.hasOwn(packet,'rawModelPayload'),false);assert.equal(packet.modelDecisionRequired,true);f.reader.dispose();
});

test('malformed, secret-looking and stale source metadata are refused and returned pages cannot mutate chain state',()=>{
 const {chain,register}=fixture();for(const source of [{requestedRef:undefined},{repositoryId:'github_pat_SYNTHETIC/repo'},{readAt:'2026-02-30T08:20:00.000Z'},{readAt:t(5001)}]){const packet=handoff();Object.assign(packet.source,source);assert.throws(()=>register({runId:'invalid',handoff:packet}));}
 const input=event();append(chain,input);input.requestedModel='mutated';const page=chain.readPage();page.events[0].agent='mutated';page.cursor.offset=99;const snapshot=chain.snapshot();snapshot.runs[0].selection.provider='mutated';assert.equal(chain.readPage().events[0].agent,selection.agent);assert.equal(chain.inspectRun('run-1').selection.provider,selection.provider);
});

test('new models and SHA changes cannot silently change a task repository, branch or handoff path',async()=>{
 const {register}=fixture();for(const scope of [{repositoryId:'other/private'},{requestedRef:'other-branch'},{path:'docs/other.md'}]){const packet=handoff();Object.assign(packet.source,scope);assert.throws(()=>register({runId:'other-scope',handoff:packet}),/HANDOFF_SCOPE_CHANGED/);}
 const f=readerFixture();await prepareTaskEventRun({...f,runId:'run-1',ownerSelection:selection});
 const substituted={refresh:()=>f.reader.refresh(),handoff:async choice=>{const packet=await f.reader.handoff(choice);packet.source.repositoryId='other/private';return packet;}};
 await assert.rejects(prepareTaskEventHandoff({...f,reader:substituted,runId:'run-1'}),/HANDOFF_SCOPE_CHANGED/);f.reader.dispose();
});

test('event module and source stay outside public routes; snapshot and visible-summary qualification never verify producer identity',()=>{
 const {chain,register}=fixture();register({runId:'visible-summary',sourceQualification:'EXECUTOR_VISIBLE_SUMMARY'});assert.equal(chain.inspectRun('visible-summary').identityQualification,'CALLER_DECLARED_NOT_VERIFIED');assert.equal(chain.snapshot().storage,'MEMORY_ONLY');
 for(const route of ['task-events','private/task-events','task-event-chain','src/continuity/task-event-chain.mjs']){assert.equal(productionResponse('GET',new URL('https://fixture/api/index?route='+route)).status,404);assert.equal(productionResponse('POST',new URL('https://fixture/api/index?route='+route)).status,403);}
});
