import test from 'node:test';
import assert from 'node:assert/strict';
import {productionResponse} from '../api/index.mjs';
import {verifiedDecisionItems} from '../public/control-semantics.js';
import fs from 'node:fs/promises';
import {securityHeaders} from '../src/api/routes.mjs';
const request=(route,method='GET')=>productionResponse(method,new URL('https://fixture/api/index?route='+route));
test('production exposes verified snapshot and accepted UI APIs with fail-closed continuation',()=>{
 const health=request('health').body;assert.equal(health.readOnly,true);assert.equal(health.version,'0.3.0-e');assert.equal(health.candidateStage,'V0.3-E');assert.equal(health.joeyAcceptance,'PUBLIC_TEST_AUTHORIZED');
 const state=request('state').body;assert.equal(state.projects.length,4);assert.equal(state.deploymentObservation.mode,'verified_release_snapshot');
 for(const route of ['inbox','workspaces','handoffs','projects/NEXAEON'])assert.equal(request(route).status,200);
 for(const project of state.projects){assert.equal(verifiedDecisionItems(project).length,0);const result=request('projects/'+project.id+'/continue').body;assert.equal(result.canContinue,false);assert.equal(result.hermesPrompt,null);assert.match(result.conflicts.join(' '),/cannot inspect live Mac/);}
 assert.equal(request('projects/UNKNOWN').status,404);
});
test('all production writes are refused even with no route-specific loophole',()=>{
 for(const method of ['POST','PATCH','DELETE','PUT'])for(const route of ['inbox','sessions','projects/NEXAEON/continue'])assert.equal(request(route,method).status,403);
});
test('static production retains security headers and visibly identifies read-only snapshot controls',async()=>{
 const config=JSON.parse(await fs.readFile(new URL('../vercel.json',import.meta.url),'utf8'));
 const headers=Object.fromEntries(config.headers[0].headers.map(h=>[h.key,h.value]));for(const [key,value]of Object.entries(securityHeaders))assert.equal(headers[key],value);
 const ui=await fs.readFile(new URL('../public/app.js',import.meta.url),'utf8');assert.match(ui,/release\.snapshot/);assert.match(ui,/#workspace-list button/);assert.match(ui,/el\.disabled=true/);assert.match(ui,/renderWorkspaces\(snapshot\);renderRelease\(\)/);
});

test('V0.3-B production state mirrors documented missions with honest partial views and stable refresh',()=>{
 const manifests=request('projects').body;
 for(const m of manifests){const state=request('projects/'+m.project_id+'/project-state').body;assert.deepEqual(state,m.canonicalState);assert.deepEqual(state,request('projects/'+m.project_id+'/project-state').body);assert.equal(state.lifecycle,'UNKNOWN');assert.equal(state.metadata.missionSetReliability,'PARTIAL');assert.equal(state.decisions.length,0);assert.equal(state.ideas.length,0);assert.equal(state.auditLog.length,0);assert.ok(state.missions.length);assert.doesNotMatch(JSON.stringify(state),/\/Users\/|\/home\/|\/private\/|Bearer\s|ghp_|sk-/);assert.equal(request('projects/'+m.project_id+'/project-state','POST').status,403);}
 assert.equal(request('projects/NOPE/project-state').status,404);
});
test('public state refuses private input publication and preserves missing source references',async()=>{
 const {publicProjectState}=await import('../src/project-state/public-state.mjs');const state=structuredClone(request('projects/NEXAEON/project-state').body);
 state.sources[0].uri='/Users/private/project';const out=publicProjectState(state);assert.equal(out.sources[0].uri,null);assert.equal(state.sources[0].uri,'/Users/private/project');
 state.ideas.push({id:'private',projectId:state.id,content:'Private note',status:'INBOX',linkedMissionId:null,source:'JOEY',sourceRefs:[],createdAt:null,updatedAt:null});assert.throws(()=>publicProjectState(state),/publication approval/);
});

test('every public release route withholds private filesystem and credential references',()=>{
 const ids=request('projects').body.map(p=>p.project_id);
 const routes=['health','state','projects','inbox','handoffs','workspaces',...ids.flatMap(id=>['projects/'+id,'projects/'+id+'/continue',...['state','manifest','runtime','activity','product','project-state'].map(s=>'projects/'+id+'/'+s)])];
 for(const route of routes){const response=request(route);assert.equal(response.status,200,route);assert.doesNotMatch(JSON.stringify(response.body),/\/Users\/|\/home\/|\/private\/|Bearer\s|gh[pousr]_|sk-[A-Za-z0-9]|PRIVATE KEY/,route);}
});

test('public E withholds local registration and asset catalog endpoints',()=>{for(const route of ['proposals','asset-catalog']){assert.equal(request(route).status,404);assert.equal(request(route,'POST').status,403);}});
