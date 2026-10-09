import test from 'node:test';
import assert from 'node:assert/strict';
import {taskRecordOperation,replayTaskEventRecord} from '../src/continuity/task-event-record.mjs';
import {createSupabaseTaskEventReader} from '../src/continuity/supabase-task-event-reader.mjs';
const taskId='mc-development-current',runId='parent-progress-stage',sha='a'.repeat(40),digest='b'.repeat(64),time=Date.now();
const source=pin=>({qualification:'REMOTE_FILE_READ',repositoryId:'JoeyAJ/joey-mission-control',requestedRef:'codex/mc-command-center-checkpoint-20261006',path:'HANDOFF.md',resolvedCommitSha:pin,contentSha256:digest,readAt:new Date(time).toISOString()});
const handoff=pin=>({qualification:'READ_ONLY_REPOSITORY_HANDOFF',projectId:'MISSION_CONTROL',providerNeutral:true,executionAuthorized:false,sourceStatus:'FOUND',freshness:'RECENT_DOCUMENT',source:source(pin)});
const register=()=>({runId,executionKind:'PARENT_REPORTED_PROGRESS',sourceQualification:'PARENT_IMPORTED_VISIBLE_SUMMARY',ownerSelection:{agent:'Codex',provider:'unknown',model:null},handoff:handoff(sha)});
const event=()=>({eventId:'parent-stage-checkpoint',projectId:'MISSION_CONTROL',taskId,runId,agent:'Codex',provider:'unknown',requestedModel:null,actualModel:null,sequence:1,eventAt:null,kind:'progress',summaryCode:'WORK_PROGRESS',safeErrorCategory:null,handoffSha:sha,processEvidence:null,publicSummary:'Verified local development: 62 affected tests and six browser cases passed. Cloud execution remains disabled.'});
function record(){const value={schemaVersion:1,projectId:'MISSION_CONTROL',taskId,chainId:'parent-chain',operations:[]};value.operations.push(taskRecordOperation(value,{kind:'register',input:register(),now:()=>time}).operation);value.operations.push(taskRecordOperation(value,{kind:'append',input:event(),expectedOffset:0,now:()=>time}).operation);return value;}
const response=value=>({schemaVersion:1,projectId:'MISSION_CONTROL',taskId,record:value,revision:value.operations.length,expiresAt:time+60000,lease:{runId,fence:1,expiresAt:time}});

test('parent progress has no fake start, model choice or process evidence and replays a scoped cursor',()=>{
 const value=record(),chain=replayTaskEventRecord(value,{taskId,now:()=>time}),page=chain.readPage();
 assert.deepEqual(page.events.map(e=>e.kind),['progress']);assert.equal(page.events[0].sourceQualification,'PARENT_IMPORTED_VISIBLE_SUMMARY');assert.equal(page.events[0].actualModel,null);assert.equal(page.events[0].processEvidence,null);assert.equal(chain.inspectRun(runId).selection.qualification,'PARENT_REPORTED_EXECUTOR_NOT_OWNER_SELECTION');assert.equal(chain.inspectRun(runId).selection.requestedModel,null);
 const before=JSON.stringify(value),retry=taskRecordOperation(value,{kind:'append',input:event(),expectedOffset:0,now:()=>time+1});assert.equal(retry.result.duplicate,true);assert.equal(JSON.stringify(value),before);assert.equal(replayTaskEventRecord(value,{taskId,now:()=>time}).readPage({cursor:page.cursor}).events.length,0);
 const unsafe={...event()};Object.defineProperty(unsafe,'reasoning',{get(){throw Error('MUST_NOT_READ');}});assert.equal(taskRecordOperation(value,{kind:'append',input:unsafe,expectedOffset:1,now:()=>time}).result.duplicate,true);
});

test('parent metadata cannot impersonate a CLI stream, selected model, process or source event',()=>{
 const empty={schemaVersion:1,projectId:'MISSION_CONTROL',taskId,chainId:'parent-chain',operations:[]};
 assert.throws(()=>taskRecordOperation(empty,{kind:'register',input:{...register(),sourceQualification:'CODEX_CLI_PUBLIC_STREAM'},now:()=>time}),/PARENT_SOURCE/);
 assert.throws(()=>taskRecordOperation(empty,{kind:'register',input:{...register(),ownerSelection:{agent:'Codex',provider:'unknown',model:'inferred'}},now:()=>time}),/DOES_NOT_SELECT_MODEL/);
 const value=record();for(const change of [{actualModel:'inferred'},{kind:'started'},{eventAt:new Date(time).toISOString()},{processEvidence:{event:'spawn',pid:1,exitCode:null,signal:null,outputBytes:0}},{publicSummary:'password=do-not-persist'}])assert.throws(()=>taskRecordOperation(value,{kind:'append',input:{...event(),...change},expectedOffset:1,now:()=>time}),/PARENT_SUMMARY/);
});

test('Owner reader preserves parent qualification and original pin while preparing a latest-source handoff',async()=>{
 const value=record(),latest='c'.repeat(40),sourceReader={refresh:async()=>({status:'connected',observation:{status:'FOUND',projectId:'MISSION_CONTROL',source:source(latest)}}),handoff:async()=>handoff(latest)},reader=createSupabaseTaskEventReader({rpc:async()=>({data:response(value),error:null}),sourceReader,now:()=>time});
 const page=await reader.events({taskId});assert.equal(page.runs[0].emitterAttached,false);assert.equal(page.runs[0].deliveryLeaseActive,false);assert.equal(page.runtimeConnected,false);assert.equal(page.runs[0].currentModel,null);
 const packet=(await reader.handoff({taskId,runId,ownerSelection:{}})).packet;assert.equal(packet.source.resolvedCommitSha,latest);assert.equal(packet.taskEventContext.runHandoffSource.resolvedCommitSha,sha);assert.equal(packet.taskEventContext.sourceQualification,'PARENT_IMPORTED_VISIBLE_SUMMARY');assert.equal(packet.executionAuthorized,false);
 assert.throws(()=>reader.importSummary(),/WRITER_NOT_EXPOSED/);
});

test('reader denies expired sessions and inconsistent records before disclosing parent progress',async()=>{
 const value=record();for(const data of [response(value),{...response(value),expiresAt:time},{...response(value),revision:9}]){
  const reader=createSupabaseTaskEventReader({rpc:async()=>({data,error:data.expiresAt===time+60000&&data.revision===2?{message:'SYNTHETIC_DENIED',status:403}:null}),now:()=>time});await assert.rejects(reader.events({taskId}),/DENIED|INVALID/);
 }
});

test('SDK outages remain retryable and never become an Owner permission denial',async()=>{
 for(const reply of [{data:null,error:{message:'SYNTHETIC_UPSTREAM_PRIVATE_DETAIL'},status:503},{data:null,error:{code:'PGRST003',message:'SYNTHETIC_DATABASE_TIMEOUT'},status:504},{data:null,error:{code:'PGRST300',message:'SYNTHETIC_CONFIGURATION_ERROR'},status:500},{data:null,error:{message:'TypeError: Failed to fetch'},status:0}]){
  const reader=createSupabaseTaskEventReader({rpc:async()=>reply,now:()=>time});
  await assert.rejects(reader.events({taskId}),error=>error.status===503&&error.message==='OWNER_EVENT_READ_UNAVAILABLE');
 }
 const reader=createSupabaseTaskEventReader({rpc:async()=>{throw Error('SYNTHETIC_NETWORK_PRIVATE_DETAIL');},now:()=>time});
 await assert.rejects(reader.events({taskId}),error=>error.status===503&&error.message==='OWNER_EVENT_READ_UNAVAILABLE');
});

test('actual SDK permission denial and expired authorization retain immediate purge semantics',async()=>{
 for(const reply of [{error:{message:'SYNTHETIC_DENIED'},status:401},{error:{status:403,message:'SYNTHETIC_DENIED'}},...['42501','28000','28P01','PGRST301','PGRST302','PGRST303'].map(code=>({error:{code,message:'SYNTHETIC_DENIED'}})),{error:{code:'P0001',message:'OWNER_SESSION_DENIED'}},{data:{...response(record()),expiresAt:time},error:null}]){
  const reader=createSupabaseTaskEventReader({rpc:async()=>reply,now:()=>time});
  await assert.rejects(reader.events({taskId}),error=>error.status===401||error.status===403);
 }
});
