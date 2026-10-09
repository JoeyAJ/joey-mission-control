import test from 'node:test';
import assert from 'node:assert/strict';
import {buildAgentContinuationPackage,requireContinuationSelection} from '../src/continuity/agent-continuation-package.mjs';
import {createSupabaseTaskEventReader} from '../src/continuity/supabase-task-event-reader.mjs';
import {taskRecordOperation} from '../src/continuity/task-event-record.mjs';
const now=Date.now(),a='a'.repeat(40),b='b'.repeat(40),digest='c'.repeat(64),selection={agent:'Replacement Agent',provider:'Owner provider',model:'explicit-model-version'};
const source=sha=>({qualification:'REMOTE_FILE_READ',repositoryId:'JoeyAJ/joey-mission-control',requestedRef:'codex/mc-command-center-checkpoint-20261006',path:'HANDOFF.md',resolvedCommitSha:sha,contentSha256:digest,readAt:new Date(now).toISOString()});
const doc='# Handoff\nProject: MISSION_CONTROL\n## Current task progress — today\nThe publication is complete.\n### Completed\nPublished read-only stage.\n### Blockers\nActual runner is absent.\n### Next Action\nPrepare the approved local slice.\n## Decision Required\nOLD PENDING PUBLICATION\n## Next Action\nOLD PUBLICATION TODO';
const original={runId:'original',executionKind:'PARENT_REPORTED_PROGRESS',selection:{qualification:'PARENT_REPORTED_EXECUTOR_NOT_OWNER_SELECTION',agent:'Codex',provider:'unknown',requestedModel:null},handoffSource:source(a),sourceQualification:'PARENT_IMPORTED_VISIBLE_SUMMARY',identityQualification:'PARENT_REPORTED_NOT_RUNTIME_VERIFIED',status:'completed',actualModel:null,modelQualification:'UNKNOWN',eventAt:null,receivedAt:new Date(now).toISOString()};
const handoff=()=>({qualification:'READ_ONLY_REPOSITORY_HANDOFF',projectId:'MISSION_CONTROL',executionAuthorized:false,sourceStatus:'FOUND',freshness:'RECENT_DOCUMENT',providerNeutral:true,source:source(b),document:doc,progress:{task:'Continue MC',recordedStatus:'LOCAL_VERIFIED'},taskEventContext:{taskId:'mc-development-current',runId:'original',runHandoffSource:source(a),latestSourceChanged:true,durableRevision:3,sourceQualification:'PARENT_IMPORTED_VISIBLE_SUMMARY',storageQualification:'SUPABASE_DURABLE_PARENT_MANAGED_RECORD'}});
const checkpoint={runId:'original',kind:'completed',publicSummary:'Real parent-reported publication completed.',sourceQualification:'PARENT_IMPORTED_VISIBLE_SUMMARY',eventAt:null,receivedAt:new Date(now).toISOString()};
const build=patch=>buildAgentContinuationPackage({handoff:handoff(),runs:[original],latestEvent:checkpoint,ownerSelection:selection,...patch});
test('latest stage wins over historical publication instructions, with complete original history',()=>{
 const prior=JSON.stringify(original),p=build();assert.equal(p.progress.completed.documentSection,'Published read-only stage.');assert.equal(p.progress.blockers.documentSection,'Actual runner is absent.');assert.equal(p.progress.next.documentSection,'Prepare the approved local slice.');assert.doesNotMatch(JSON.stringify(p.progress),/OLD PUBLICATION|OLD PENDING/);
 assert.equal(p.document.content,doc);assert.equal(p.source.resolvedCommitSha,b);assert.equal(p.runHistory[0].handoffSource.resolvedCommitSha,a);assert.equal(p.runHistory[0].selection.requestedModel,null);assert.equal(p.runHistory[0].actualModel,null);assert.equal(JSON.stringify(original),prior);assert.equal(p.targetSelection.model,selection.model);assert.equal(p.runner.status,'NOT_CONNECTED');assert.equal(p.runner.dispatchAvailable,false);assert.equal(p.executionAuthorized,false);
});
test('missing latest-stage fields remain unknown and never borrow superseded historical sections',()=>{
 const h=handoff();h.document=doc.replace(/### Completed[\s\S]*?## Decision Required/,'## Decision Required');const p=build({handoff:h});assert.equal(p.progress.next.documentSection,null);assert.equal(p.progress.next.sourceFactsMissing,true);assert.equal(p.progress.blockers.documentSection,null);assert.equal(p.progress.completed.reportedCheckpoint.summary,checkpoint.publicSummary);assert.equal(p.progress.next.intakeSteps.length,5);
});
test('multiple original model versions and source pins remain immutable after Owner replaces all target fields',()=>{
 const second={...original,runId:'second',executionKind:'AGENT_TASK',selection:{qualification:'OWNER_SELECTION',agent:'Historical agent',provider:'Historical provider',requestedModel:'historical-model-v2'},handoffSource:source(b),sourceQualification:'CODEX_CLI_PUBLIC_STREAM',identityQualification:'CALLER_DECLARED_NOT_VERIFIED',actualModel:'historical-model-v2',modelQualification:'REPORTED_NOT_VERIFIED'};
 const runs=[original,second],before=JSON.stringify(runs),p=build({runs});assert.equal(p.runHistory.length,2);assert.equal(p.runHistory[1].selection.requestedModel,'historical-model-v2');assert.equal(p.runHistory[1].actualModel,'historical-model-v2');assert.equal(p.targetSelection.model,selection.model);assert.equal(JSON.stringify(runs),before);assert.equal(p.runner.currentModel,null);
});
test('every target field is explicit, with no defaults, secret values or false connected provider',()=>{
 for(const field of ['agent','provider','model']){for(const value of [null,'','auto','unknown','default'])assert.throws(()=>requireContinuationSelection({...selection,[field]:value}),/REQUIRED/);}
 assert.throws(()=>requireContinuationSelection({...selection,model:'Bearer SYNTHETIC_VALUE'}),/UNSAFE/);assert.equal(build({ownerSelection:null}).targetSelection,null);
 const arbitrary=build({ownerSelection:{agent:'Custom agent',provider:'Custom provider',model:'Owner exact model'}});assert.equal(arbitrary.runner.status,'NOT_CONNECTED');
});
test('unsafe source, model history and payloads fail closed; unknown fields and getters are excluded',()=>{
 for(const secret of ['password=SYNTHETIC_VALUE','github_pat_SYNTHETIC_VALUE','Bearer SYNTHETIC_VALUE','eyJzZWNyZXQ.synthetic.signature','rawModelPayload: SYNTHETIC_VALUE','-----BEGIN PRIVATE KEY-----']){const h=handoff();h.document+='\n'+secret;assert.throws(()=>build({handoff:h}),/UNSAFE/);}
 assert.throws(()=>build({runs:[{...original,actualModel:'sk-SYNTHETICVALUE'}]}),/UNSAFE/);const h=handoff();Object.defineProperty(h,'rawModelPayload',{get(){throw Error('UNKNOWN_GETTER_MUST_NOT_RUN');}});const r={...original};Object.defineProperty(r,'credentials',{get(){throw Error('UNKNOWN_GETTER_MUST_NOT_RUN');}});assert.doesNotMatch(JSON.stringify(build({handoff:h,runs:[r]})),/credentials|rawModelPayload/);
 Object.defineProperty(h,'document',{get(){throw Error('KNOWN_GETTER_MUST_NOT_RUN');}});assert.throws(()=>build({handoff:h}),/METADATA_INVALID/);
});
function readerFixture({change=false}={}){
 const taskId='mc-development-current',record={schemaVersion:1,projectId:'MISSION_CONTROL',taskId,chainId:'synthetic-continuation',operations:[]},register={runId:'original',executionKind:'PARENT_REPORTED_PROGRESS',sourceQualification:'PARENT_IMPORTED_VISIBLE_SUMMARY',ownerSelection:{agent:'Codex',provider:'unknown',model:null},handoff:{...handoff(),source:source(a)}};
 record.operations.push(taskRecordOperation(record,{kind:'register',input:register,now:()=>now}).operation);
 const event={eventId:'synthetic-completion',projectId:'MISSION_CONTROL',taskId,runId:'original',agent:'Codex',provider:'unknown',requestedModel:null,actualModel:null,sequence:1,eventAt:null,kind:'completed',summaryCode:'RUN_COMPLETED',safeErrorCategory:null,handoffSha:a,processEvidence:null,publicSummary:checkpoint.publicSummary};
 record.operations.push(taskRecordOperation(record,{kind:'append',input:event,expectedOffset:0,now:()=>now}).operation);
 let calls=0;const reader=createSupabaseTaskEventReader({now:()=>now,rpc:async()=>{const revision=record.operations.length+(change&&calls>0?1:0);calls++;return {data:{schemaVersion:1,projectId:'MISSION_CONTROL',taskId,revision,record,expiresAt:now+60000},error:null};},sourceReader:{refresh:async()=>({status:'connected',observation:{status:'FOUND',projectId:'MISSION_CONTROL',source:source(b)}}),handoff:async()=>handoff()}});
 return {reader,taskId,calls:()=>calls};
}
test('reader prepares direct takeover without a target model and preserves original history',async()=>{
 const f=readerFixture();const direct=(await f.reader.continuation({taskId:f.taskId,runId:'original'})).packet;assert.equal(direct.targetSelection,null);assert.match(direct.entryInstructions,/private repository JoeyAJ/);assert.match(direct.entryInstructions,/does not authorize deployment, SQL/);
 const overview=(await f.reader.overview({taskId:f.taskId,runId:'original'})).packet;assert.equal(overview.targetSelection,null);
 const p=(await f.reader.continuation({taskId:f.taskId,runId:'original',ownerSelection:selection})).packet;assert.equal(p.source.resolvedCommitSha,b);assert.equal(p.runHistory[0].handoffSource.resolvedCommitSha,a);assert.equal(p.runHistory[0].actualModel,null);assert.equal(p.progress.completed.reportedCheckpoint.summary,checkpoint.publicSummary);
});
test('reader refuses journal changes between fresh source and second authenticated read',async()=>{
 const f=readerFixture({change:true});await assert.rejects(f.reader.continuation({taskId:f.taskId,runId:'original',ownerSelection:selection}),/DURABLE_EVENT_RESPONSE_INVALID|EVENT_CHAIN_CHANGED/);
});
test('direct entry indexes verified files, signed developer and optional model without inventing absent facts',()=>{
 const h=handoff();h.progress.lastAgent='Cursor';h.source.documentTimestamp=new Date(now).toISOString();
 h.contextDocuments=[{path:'README.md',status:'FOUND',qualification:'REMOTE_FILE_READ',resolvedCommitSha:b,providerBlobId:a,contentSha256:digest},{path:'docs/PRODUCT_CHARTER.md',status:'MISSING',qualification:'REMOTE_FILE_READ',resolvedCommitSha:b,providerBlobId:null,contentSha256:null}];
 const p=build({handoff:h,ownerSelection:null});assert.equal(p.projectSnapshot.lastDeveloper.agent,'Cursor');assert.equal(p.projectSnapshot.lastDeveloper.sourceSha,b);assert.equal(p.projectSnapshot.lastDeveloper.qualification,'HANDOFF_SIGNED_DEVELOPER');assert.equal(p.runHistory[0].selection.agent,'Codex');assert.equal(p.projectSnapshot.contextDocuments[1].url,null);assert.match(p.entryInstructions,/README.md — https:\/\/github.com/);assert.match(p.entryInstructions,/Context unavailable: docs\/PRODUCT_CHARTER.md/);assert.match(p.entryInstructions,/actual development Agent/);assert.equal(p.targetSelection,null);
 assert.equal(build({ownerSelection:{agent:'Cursor'}}).targetSelection.model,null);
 const unknown=build({ownerSelection:null});assert.equal(unknown.projectSnapshot.lastDeveloper.agent,null);assert.equal(unknown.projectSnapshot.updatedAt,null);assert.deepEqual(unknown.projectSnapshot.contextDocuments,[]);
 for(const patch of [{path:'docs/MISSING_INVENTED.md'},{resolvedCommitSha:a},{providerBlobId:'invalid'}]){const changed={...h,contextDocuments:[{...h.contextDocuments[0],...patch}]};assert.throws(()=>build({handoff:changed}),/SOURCE_INVALID/);}
 assert.throws(()=>build({ownerSelection:{agent:'Cursor',model:'Bearer SYNTHETIC_VALUE'}}),/UNSAFE/);
});
