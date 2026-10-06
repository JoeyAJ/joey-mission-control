import test from 'node:test';
import assert from 'node:assert/strict';
import {buildProjectProjection} from '../src/projection/project-projection.mjs';
import {parseHandoff} from '../src/canonical/handoff-adapter.mjs';
import {release} from '../src/release.mjs';
const source={classification:'canonical',sourcePath:'/canonical/CURRENT_STATE.md',sourceSection:'CURRENT_STATE',fingerprint:'a'.repeat(64),verificationStatus:'verified_current',readAt:'2026-10-05T00:00:00.000Z'};
const project=(overrides={})=>buildProjectProjection({id:'X',name:'X',entityType:'project',state:{sections:{'Current Stage':'Building'},source},next:{source,sections:{'Recommended Next Step':'Review release'}},...overrides});

test('V0.2 release status reflects the latest explicit Joey release authorization',()=>assert.equal(release.releaseStatus,'public-test'));
test('current mission is separate from next action and retains its own source',()=>{
  const p=project({state:{source,sections:{'Current Stage':'Building','Current Mission':'Implement review UI'}}});
  assert.equal(p.currentTask.value,'Implement review UI');assert.equal(p.nextAction.value,'Review release');
  const duplicated=project({state:{source,sections:{'Current Stage':'Building','Current Task':'Review release'}}});
  assert.equal(duplicated.currentTask.value,'Unknown');assert.equal(duplicated.currentTask.missingReason,'not_recorded');
  assert.equal(project().currentTask.value,'Unknown');
});
test('missing source, absent field, explicit unknown, and underived lifecycle remain distinct',()=>{
  assert.equal(project({state:{}}).version.missingReason,'source_unavailable');
  assert.equal(project().version.missingReason,'not_recorded');
  assert.equal(project({state:{source,metadata:{version:'Unknown'},sections:{}}}).version.missingReason,'unknown');
  assert.equal(project({state:{source,sections:{'Current Stage':'Something without lifecycle'}}}).phase.missingReason,'not_derived');
});
test('agent/model use only explicit canonical or non-conflicting entity handoff evidence',()=>{
  const p=project({state:{source,metadata:{last_ai:'Claude Code',model:'verified-model'},sections:{}}});
  assert.equal(p.lastAI.value,'Claude Code');assert.equal(p.model.value,'verified-model');assert.equal(p.lastAI.classification,'canonical');
  const handoff=parseHandoff('Timestamp: 2026-10-05T00:00:00Z\nProject: X\nTask: Review\nStatus: SUCCESS\nExecuted by: Codex\nModel: explicit-model\n','/handoff',new Set(['X']));
  assert.equal(project({handoff}).lastAI.value,'Codex');assert.equal(project({handoff}).model.value,'explicit-model');
  assert.equal(project({handoff:{...handoff,conflict:true}}).lastAI.value,'Unknown');
  assert.equal(project({handoff:{...handoff,entityId:'OTHER'}}).lastAI.value,'Unknown');
  assert.equal(project({session:{id:'s',ai:'guessed-agent',model:'guessed-model',state:'running'}}).lastAI.value,'Unknown');
  assert.equal(project({state:{source,sections:{'AI / Model':'OpenAI runtime models'}}}).model.value,'Unknown');
});
test('approvals and decisions preserve separate source sections without changing Continue gates',()=>{
  const p=project({next:{source,sections:{'Not Authorized Yet':'- Do not deploy','Decisions Needed From Joey':'- Choose a provider'}}});
  assert.equal(p.management.approvals[0].value,'Do not deploy');
  assert.equal(p.management.decisions[0].value,'Choose a provider');
  assert.deepEqual(p.approvalGates,['Do not deploy','Choose a provider']);
  assert.match(p.management.decisions[0].source.sourceSection,/Decisions Needed/);
});

test('local sessions cannot override canonical mission and absent operator sources stay unavailable',()=>{
 const p=project({state:{source,sections:{'Current Mission':'Canonical mission'}},session:{id:'s',state:'running',declaredTask:'Arbitrary local task'}});
 assert.equal(p.currentTask.value,'Canonical mission');
 const absent=project({state:{},next:{}});assert.equal(absent.lastAI.missingReason,'source_unavailable');assert.equal(absent.model.missingReason,'source_unavailable');
});
