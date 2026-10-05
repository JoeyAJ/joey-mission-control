import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {attentionItems} from '../public/presentation.js';
import {buildProjectProjection} from '../src/projection/project-projection.mjs';
import {createDefaultDeps} from '../src/server.mjs';
import {release} from '../src/release.mjs';
const source={classification:'canonical',sourcePath:'/canonical/NEXT_ACTIONS.md',sourceSection:'Decisions Needed From Joey',fingerprint:'a'.repeat(64),verificationStatus:'documented',readAt:'2026-10-05T00:00:00Z'};
const claim=value=>({value,classification:'canonical',source});
const project=overrides=>({management:{approvals:[],decisions:[]},conflicts:[],workspaceObservation:{observedAt:new Date().toISOString()},sourceFingerprints:[{path:'/canonical'}],...overrides});
test('missing, unverified, deferred, negative and unavailable evidence never becomes a Joey decision',()=>{
 for(const value of ['Unknown','Not recorded','Source unavailable','No decision required','Awaiting verification','尚未記錄','資料待補全','尚無已校對摘要','Model not recorded','Next Action has no verified summary','Decide later whether to deploy']){
  const p=project({currentTask:{value:'Unknown'},management:{approvals:[claim(value)],decisions:[claim(value)]}});
  assert.equal(attentionItems(p).filter(x=>['approval','decision'].includes(x.type)).length,0,value);
 }
 const p=project({management:{approvals:[],decisions:[{...claim('Joey must choose provider'),source:{...source,verificationStatus:'unverified'}}]}});
 assert.equal(attentionItems(p).filter(x=>x.type==='decision').length,0);
});
test('explicit canonical decisions and Joey approval blockers qualify; prohibitions alone do not',()=>{
 const p=project({blocker:claim('WHAT: Joey must authorize remote changes | WHY: Remote changes affect student data | STATUS: pending'),management:{approvals:[claim('Do not deploy')],decisions:[claim('WHAT: Choose school SSO or email OTP? | WHY: Login requires an identity provider | STATUS: pending')]}});
 const items=attentionItems(p);assert.equal(items.filter(x=>x.type==='decision').length,2);assert.equal(items.filter(x=>x.type==='approval').length,0);
 assert.equal(items.find(x=>x.type==='decision').issue.source,source);
});
test('derived project attention cannot treat missing decision-section entries as approval',()=>{
 const p=buildProjectProjection({id:'X',name:'X',entityType:'project',state:{source,sections:{'Current Stage':'Building'}},next:{source,sections:{'Decisions Needed From Joey':'尚未記錄'}},git:{observedAt:new Date().toISOString()}});
 assert.notEqual(p.attention.value,'awaiting_approval');
});
test('workspace create/edit/transition preserves canonical truth, missions, phase, Agent/Model and Handoff',async()=>{
 const dataRoot=await fs.mkdtemp(path.join(os.tmpdir(),'mc-round2-'));const deps=createDefaultDeps({dataRoot});
 const before=await deps.getState();
 const p=before.projects[0];
 const fields=['status','phase','currentStage','currentTask','lastCompleted','lastAI','model','sourceFingerprints'];
 const stable=x=>JSON.parse(JSON.stringify(x,(key,value)=>key==='readAt'?undefined:value));
 const truth=p=>stable(Object.fromEntries(fields.map(key=>[key,p[key]])));
 const session=await deps.createSession({entityId:p.id,ai:'Unverified assignment',model:'Unverified model',workspaceId:'test',path:p.where.localPath.value,declaredTask:'Everything completed and accepted'});
 await deps.updateSession(session.id,{ai:'Edited intent',model:'Edited model',declaredTask:'Phase completed',state:'running'});
 await deps.updateSession(session.id,{state:'waiting_for_joey'});
 const after=await deps.getState();assert.deepEqual(truth(after.projects.find(x=>x.id===p.id)),truth(p));
 assert.deepEqual(stable(after.handoffs),stable(before.handoffs));
 assert.equal(release.releaseStatus,'accepted');
 for(const patch of [{status:'Completed'},{phase:'DEPLOY'},{acceptance:'passed'},{verifiedAgentHistory:['x']},{state:'completed'}])await assert.rejects(()=>deps.updateSession(session.id,patch));
 assert.deepEqual((await fs.readdir(dataRoot)).sort(),['sessions.v1.json']);
});

test('negated, satisfied and verification-pending Joey evidence never requests action',()=>{
 for(const value of ['Joey approval is not needed','Awaiting verification of Joey approval','Joey approval already obtained','Joey does not need to approve','No decisions pending','Joey approved deployment yesterday','Joey must not choose a provider','No approval needed from Joey','Joey confirmation has been received','Joey approval pending verification','No Joey approval is needed','Joey approval is unnecessary','Joey is not required to approve']){
  const p=project({management:{approvals:[claim(value)],decisions:[claim(value)]}});assert.equal(attentionItems(p).filter(x=>['approval','decision'].includes(x.type)).length,0,value);
 }
 const p=buildProjectProjection({id:'X',name:'X',entityType:'project',state:{source,sections:{'Current Stage':'Building'}},next:{source,sections:{Blockers:'None'}},git:{observedAt:new Date().toISOString()}});assert.notEqual(p.attention.value,'blocker');
});

test('verified decisions about previously approved options remain actionable',()=>{
 for(const value of ['Joey must choose one of the approved providers','Which already authorized model should Joey select?','Should completed items be archived?'])assert.equal(attentionItems(project({management:{approvals:[],decisions:[claim('WHAT: '+value+' | WHY: The next stage depends on the selected option | STATUS: pending')]}})).filter(x=>x.type==='decision').length,1,value);
});
