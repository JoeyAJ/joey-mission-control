import test from 'node:test';
import assert from 'node:assert/strict';
import {productionResponse} from '../api/index.mjs';
import {verifiedDecisionItems} from '../public/control-semantics.js';
import fs from 'node:fs/promises';
import {securityHeaders} from '../src/api/routes.mjs';
const request=(route,method='GET')=>productionResponse(method,new URL('https://fixture/api/index?route='+route));
test('production exposes verified snapshot and accepted UI APIs with fail-closed continuation',()=>{
 const health=request('health').body;assert.equal(health.readOnly,true);assert.equal(health.joeyAcceptance,'PASSED');
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
