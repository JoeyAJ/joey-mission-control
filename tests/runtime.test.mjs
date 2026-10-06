import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import {runtimeState,activities} from '../src/agent/runtime.mjs';
import {manifest,publicManifest} from '../src/agent/control.mjs';
import {loadSchema,validate} from '../src/api/validation.mjs';
import {createApp} from '../src/server.mjs';
import {MissionService,validLedger} from '../src/agent/mission-service.mjs';
import {JsonStore} from '../src/storage/json-store.mjs';
import {productionResponse} from '../api/index.mjs';
const snapshot=JSON.parse(await fs.readFile(new URL('../deployment/production-snapshot.json',import.meta.url)));
const p=snapshot.projects[0];
test('runtime distinguishes absent recorded fields from unavailable sync and preserves restrictions',()=>{
 const q=structuredClone(p);q.currentTask={value:'Unknown',source:{sourcePath:'fixture'},missingReason:'not_recorded'};q.lastAI={value:'Unknown',source:null,missingReason:'source_unavailable'};q.blocker={value:'None',source:{sourcePath:'fixture'}};q.conflicts=[];q.management={};q.approvalGates=['Do not deploy'];
 const r=runtimeState(q);assert.equal(r.missionStatus,'Not recorded');assert.equal(r.fields.lastAgent.status,'Awaiting sync');assert.equal(r.currentMission,null);assert.equal(r.blocker,null);assert.equal(r.approvalRequired,false);assert.deepEqual(r.restrictions,['Do not deploy']);assert.doesNotMatch(JSON.stringify(r),/"Unknown"/);
});
test('all source-backed runtime and activity records validate with provenance',async()=>{
 const rs=await loadSchema('project-runtime'),as=await loadSchema('agent-activity');
 for(const q of snapshot.projects){const m=manifest(q,{handoff:snapshot.handoffs.byEntity[q.id],handoffs:snapshot.handoffs.history,generatedAt:snapshot.generatedAt});assert.deepEqual(validate(rs,m.runtime).errors,[]);for(const a of m.activity)assert.deepEqual(validate(as,a).errors,[]);assert.match(m.runtime.sourceRepo,/github.com/);assert.equal(m.runtime.baselineSha,q.where.storedCommit.value);assert.notEqual(m.runtime.sourceRepo,m.runtime.localWorkspace);}
});
test('conflicting handoff is excluded and recorded Agent/model never invented',()=>{
 const h={entityId:p.id,status:'SUCCESS',timestamp:'2026-10-05T00:00:00Z',task:'fixture',sourcePath:'fixture',fingerprint:'a'.repeat(64)};
 assert.equal(activities(p,{handoffs:[{...h,conflict:true}]}).length,0);const a=activities(p,{handoffs:[h,h]});assert.equal(a.length,1);assert.equal(a[0].agent,null);assert.equal(a[0].model,null);
});
test('completed local result overrides stale canonical completion while preserving baseline',()=>{
 const record={mission_id:'fixture',project_id:p.id,task:'fixture mission',assigned_agent:'Codex',model:'recorded model',status:'COMPLETED',result:'verified result',started_at:'2026-10-04T00:00:00Z',completed_at:'2026-10-05T00:00:00Z',approval:{required:false,status:'APPROVED'},next_action:'Review candidate',blockers:[]};
 const r=runtimeState(p,{history:[record]});assert.equal(r.lastCompletedAction,'verified result');assert.equal(r.lastCompletedAt,record.completed_at);assert.equal(r.missionStatus,'Completed');assert.equal(r.currentAgent,null);assert.equal(r.lastAgent,'Codex');assert.equal(r.baselineSha,p.where.storedCommit.value);assert.equal(r.stateSource,'local_mission_overlay');
});
test('runtime/activity API reads same durable ledger and rejects unauthorized or malformed approval writes',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'mc-runtime-'));const missions=new MissionService(new JsonStore(root,'missions.json',validLedger));const server=http.createServer(createApp({token:'fixture-token',getState:async()=>snapshot,getProject:async id=>snapshot.projects.find(v=>v.id===id),missions}));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+server.address().port;
 async function request(url,method='GET',body,authorized=true){return fetch(base+url,{method,headers:{'content-type':'application/json',...(authorized?{'x-mission-control-token':'fixture-token'}:{})},...(body?{body:JSON.stringify(body)}:{})});}
 try{
 const input={project_id:p.id,task:'fixture mission',assigned_agent:'Codex',model:'fixture model',baseline_sha:p.where.storedCommit.value};assert.equal((await request('/api/missions','POST',input,false)).status,403);
 const created=await request('/api/missions','POST',input);assert.equal(created.status,201);let m=await created.json();assert.equal((await request('/api/missions','POST',input)).status,409);
 for(const [status,extra] of [['READY',{}],['RUNNING',{check_in:{verified:true}}],['AWAITING_APPROVAL',{approval:{required:true,status:'AWAITING_JOEY_APPROVAL'}}]]){const res=await request('/api/missions/'+m.mission_id,'PATCH',{expected_revision:m.revision,status,...extra});assert.equal(res.status,200);m=await res.json();}
 const r=await (await request('/api/projects/'+p.id+'/runtime')).json();assert.equal(r.approvalStatus,'AWAITING_JOEY_APPROVAL');assert.equal(r.missionStatus,'Awaiting Joey approval');assert.equal((await (await request('/api/projects/'+p.id+'/activity')).json()).at(-1).missionId,m.mission_id);
 const list=await (await request('/api/projects')).json();assert.deepEqual(list.find(v=>v.project_id===p.id).runtime,r);
 assert.equal((await request('/api/missions/'+m.mission_id,'PATCH',{expected_revision:m.revision,status:'READY',approval:{required:false,status:'APPROVED',joey_accepted:'yes'}})).status,400);
 assert.equal((await request('/api/missions/'+m.mission_id,'PATCH',{expected_revision:0,status:'READY'})).status,409);
 const persisted=new MissionService(new JsonStore(root,'missions.json',validLedger));assert.equal((await persisted.list())[0].status,'AWAITING_APPROVAL');
 assert.equal((await request('/api/projects/NOPE/runtime')).status,404);
 }finally{await new Promise(resolve=>server.close(resolve));await fs.rm(root,{recursive:true,force:true});}
});
test('public runtime/activity remain snapshot-only and writes fail closed',()=>{
 for(const route of ['runtime','activity']){const result=productionResponse('GET',new URL('https://fixture/?route=projects/'+p.id+'/'+route));assert.equal(result.status,200);assert.doesNotMatch(JSON.stringify(result.body),/\/Users\/|local:\/\/missions/);assert.equal(productionResponse('PATCH',new URL('https://fixture/?route=projects/'+p.id+'/'+route)).status,403);}
});

test('planned assignments do not fabricate Agent execution and public runtime is an explicit allowlist',()=>{const m=manifest(p,{history:[{mission_id:'fixture',task:'planned',assigned_agent:'Never executed',model:'assigned only',status:'PLANNED',blockers:[],approval:{required:false}}]});assert.notEqual(m.runtime.lastAgent,'Never executed');m.runtime.injected={password:'secret'};m.activity.push({projectId:p.id,action:'fixture',status:'planned',secret:{token:'secret'},requiresApproval:false});const safe=publicManifest(m);assert.equal(Object.hasOwn(safe.runtime,'injected'),false);assert.equal(Object.hasOwn(safe.activity.at(-1),'secret'),false);assert.doesNotMatch(JSON.stringify(safe),/\"password\"|\"token\"/);assert.equal(m.mission.approval_required,m.runtime.approvalRequired);});
