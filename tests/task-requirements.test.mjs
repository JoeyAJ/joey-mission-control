import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {createDevelopmentTask,reviseDevelopmentTask} from '../src/tasks/development-task.mjs';
import {createTaskRequirements,taskRequirementsKey,taskRequirementsStatus,validateTaskRequirements} from '../src/tasks/task-requirements.mjs';
import {createRepositoryRun,appendRepositoryRunEvent,validateRepositoryRun} from '../src/reporting/repository-run-contract.mjs';
import {repositoryReportFixture} from './helpers/repository-report-fixture.mjs';
import {loadSchema,validate} from '../src/api/validation.mjs';
const scope={projectId:'WOOSONG_BUDDY',track:'BASELINE'},taskId='task_'+'2'.repeat(24),now=Date.parse('2026-10-11T12:00:00.000Z'),request={feature:'原始完整需求\n界😀',acceptance:'Specific acceptance',constraints:'Existing scope'};
const task=()=>createDevelopmentTask(scope,request,{taskId,now});
const run=(binding)=>createRepositoryRun({schemaVersion:'mc.repository-run.v2',taskKind:'FEATURE',taskRequirements:binding,scope:{...scope,repositoryId:'Synthetic/buddy',ref:'main',path:'README.md',baselineSha:'a'.repeat(40),entryDigest:'b'.repeat(64)},runId:'synthetic-bound',taskId,featureTitle:'Synthetic feature',agentName:'Synthetic Agent',workRef:'feature/synthetic',eventId:'start',summary:'Synthetic start',now});
test('binding digests complete normalized request and scoped ID/revision; timestamps do not change requirements identity',async()=>{
 const t=task(),b=await createTaskRequirements(t);assert.equal(b.requestDigest,createHash('sha256').update(taskRequirementsKey(t)).digest('hex'));assert.deepEqual(await createTaskRequirements({...t,updatedAt:new Date(now+1).toISOString()}),b);
 for(const k of ['feature','acceptance','constraints']){const changed=reviseDevelopmentTask(t,{...request,[k]:request[k]+' changed'},{now:now+1});assert.equal(taskRequirementsStatus(b,await createTaskRequirements(changed)),'MISMATCH');const sameRevision={...t,request:changed.request};assert.notEqual((await createTaskRequirements(sameRevision)).requestDigest,b.requestDigest);}
 for(const patch of [{taskId:'task_'+'3'.repeat(24)},{projectId:'NEXAEON'},{projectId:'JOEY_ASSET_SYSTEM',track:'UNIVERSITY_CANDIDATE'}])assert.notEqual((await createTaskRequirements({...t,...patch})).requestDigest,b.requestDigest);
 assert.equal(taskRequirementsStatus(b,b),'MATCH');assert.equal(taskRequirementsStatus(undefined,b),'LEGACY_UNBOUND');assert.equal(taskRequirementsStatus(b,null),'UNCONFIRMED');
});
test('strict additive report header validates schema and retains unchanged legacy bytes; malformed binding cannot establish a run',async()=>{
 const b=await createTaskRequirements(task()),report=run(b),schema=await loadSchema('repository-run-report');validateRepositoryRun(report,{now});assert(validate(schema,report).valid);const legacy=run(undefined),raw=JSON.stringify(legacy);assert.equal(JSON.stringify(validateRepositoryRun(legacy,{now})),raw);assert(!Object.hasOwn(legacy,'taskRequirements'));
 for(const bad of [null,{}, {...b,revision:0},{...b,revision:1.2},{...b,requestDigest:'x'.repeat(64)},{...b,request:'private full request'}]){assert.throws(()=>validateTaskRequirements(bad));assert.throws(()=>validateRepositoryRun({...report,taskRequirements:bad},{now}));assert.equal(validate(schema,{...report,taskRequirements:bad}).valid,false);}
 assert.throws(()=>validateRepositoryRun({...report,taskId:'legacy-human-task'},{now}));const next=appendRepositoryRunEvent(report,{id:'progress',sequence:2,eventAt:new Date(now+1).toISOString(),kind:'progress',summary:'Synthetic progress',result:null,delivery:null},{expectedSequence:1,now:now+1}).report;assert.deepEqual(next.taskRequirements,b);
});
test('portable real Git helper binds packet task and registration digest, rejects downgrade/tamper/header revision change and preserves old reports',async()=>{
 const f=repositoryReportFixture({projectId:scope.projectId});try{
  const legacy=f.run('start',{runId:'synthetic-legacy'});assert.equal(legacy.exitCode,0,legacy.error);const oldBlob=legacy.output.fileSha,t=task(),b=await createTaskRequirements(t),packet={...f.packet,developmentTask:t,taskRequirements:b},file=path.join(f.temporary,'packet.json');fs.writeFileSync(file,JSON.stringify(packet));
  const options={runId:'synthetic-bound',taskId,taskRequirements:b,schemaVersion:'mc.repository-run.v2',taskKind:'FEATURE',predecessorRunId:'synthetic-legacy'};const before=f.head();let r=f.run('start',{...options,taskRequirements:undefined});assert.notEqual(r.exitCode,0);assert.equal(f.head(),before);r=f.run('start',{...options,taskRequirements:{...b,requestDigest:'f'.repeat(64)}});assert.notEqual(r.exitCode,0);assert.equal(f.head(),before);
  fs.writeFileSync(file,JSON.stringify({...packet,developmentTask:{...t,request:{...request,acceptance:'tampered after handoff'}}}));r=f.run('start',options);assert.notEqual(r.exitCode,0);assert.equal(f.head(),before);fs.writeFileSync(file,JSON.stringify(packet));r=f.run('start',options);assert.equal(r.exitCode,0,r.error);const start=r.output,header=JSON.parse(f.remote(['show',f.head()+':'+start.path]));assert.deepEqual(header.taskRequirements,b);assert.equal(f.remote(['rev-parse',f.head()+':'+legacy.output.path]).trim(),oldBlob);
  const revised=reviseDevelopmentTask(t,request,{now:now+1}),b2=await createTaskRequirements(revised);fs.writeFileSync(file,JSON.stringify({...f.packet,developmentTask:revised,taskRequirements:b2}));const boundHead=f.head();r=f.run('append',{...options,taskRequirements:b2,kind:'progress',expectedFileSha:start.fileSha,expectedSequence:1});assert.equal(r.error,'RUN_REGISTRATION_SCOPE_MISMATCH');assert.equal(f.head(),boundHead);
  const successor=f.run('start',{...options,runId:'synthetic-bound-revision-2',taskRequirements:b2,predecessorRunId:'synthetic-bound'});assert.equal(successor.exitCode,0,successor.error);assert.equal(f.remote(['rev-parse',f.head()+':'+start.path]).trim(),start.fileSha);assert.equal(f.remote(['rev-parse',f.head()+':'+legacy.output.path]).trim(),oldBlob);
 }finally{f.dispose();}
});
