import test from 'node:test';import assert from 'node:assert/strict';
import {registrationGitFixture} from './helpers/project-registration-git-fixture.mjs';
import {REGISTRY_PATH,INDEX_PATH,LEDGER_PATH} from '../src/onboarding/project-registration-catalog.mjs';
import {registrationMemoryPaths} from '../src/onboarding/project-registry-writer.mjs';
test('fixed public host is readable but complete private registration is denied before every remote mutation',async()=>{
 const f=await registrationGitFixture({catalogVisibility:'public'});try{
  const head=f.head();assert.ok(await f.port.readSnapshot());
  const r=await f.server().handle(f.req);assert.equal(r.status,409);assert.equal(r.body.error,'REGISTRATION_PRIVATE_IDENTITY_MISMATCH');
  assert.equal(f.state.commits,0);assert.equal(f.head(),head);assert.equal(f.state.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.cleanup();}
});
test('host becoming public during authorization callback is rejected at final writer guard, including fixture-tagged ports',async()=>{
 const f=await registrationGitFixture();try{
  const head=f.head(),projectId=f.draft.project.projectId;let makePublic=false,callbacks=0;
  f.state.mutate=(u,data)=>{if(makePublic&&u.pathname==='/repos/JoeyAJ/joey-mission-control'){data.private=false;data.visibility='public';}};
  const files=Object.fromEntries([REGISTRY_PATH,INDEX_PATH,LEDGER_PATH,...registrationMemoryPaths(projectId)].map(p=>[p,'Synthetic private material never published']));
  await assert.rejects(f.port.commitFiles({expectedHeadSha:head,projectId,files,beforeMutation:async()=>{callbacks++;makePublic=true;}}),e=>e.code==='REGISTRATION_PRIVATE_IDENTITY_MISMATCH');
  assert.equal(callbacks,1);assert.equal(f.state.commits,0);assert.equal(f.head(),head);assert.equal(f.state.requests.filter(r=>r.method!=='GET').length,0);
 }finally{await f.cleanup();}
});
