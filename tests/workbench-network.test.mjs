import test from 'node:test';
import assert from 'node:assert/strict';
import {workbenchNetworkModel} from '../src/reporting/workbench-network.mjs';
const fixture=()=>({status:'confirmed',runs:[{report:{runId:'run',featureTitle:'Reported task'}},{report:{runId:'peer',featureTitle:'Other task'}}],events:[{key:'second',runId:'run',event:{kind:'progress',sequence:2,activity:{path:'src/app.mjs'}}},{key:'first',runId:'run',event:{kind:'started',sequence:1}},{key:'peer-event',runId:'peer',event:{kind:'completed',sequence:1}}],files:[{key:'file',runId:'run',path:'src/app.mjs',history:[{key:'second'}]},{key:'unobserved',runId:'run',path:'HANDOFF.md',history:[]},{key:'peer-file',runId:'peer',path:'private-peer.mjs',history:[]}]});
test('graph uses only the selected validated task and its recorded relationships',()=>{const model=workbenchNetworkModel({projection:fixture(),runId:'run'});assert.equal(model.nodes.length,5);assert.equal(model.edges.length,6);assert(!JSON.stringify(model).includes('private-peer'));assert(model.edges.every(e=>model.nodes.some(n=>n.id===e.from)&&model.nodes.some(n=>n.id===e.to)));});
test('recorded event order is explicit and distinct from membership; no dependency is inferred',()=>{const p=fixture();p.events[0].event.summary='depends on an invented hidden task';const model=workbenchNetworkModel({projection:p,runId:'run'});assert.deepEqual(model.edges.filter(e=>e.kind==='event-order'),[{from:'event:first',to:'event:second',kind:'event-order'}]);assert.equal(model.edges.filter(e=>e.kind==='reported-event').length,2);assert(!model.edges.some(e=>e.kind.includes('dependency')));});
test('unobserved manifest files have a declaration edge and no fabricated observation',()=>{const model=workbenchNetworkModel({projection:fixture(),runId:'run'});assert(model.edges.some(e=>e.to==='file:unobserved'&&e.kind==='declared-file'));assert(!model.edges.some(e=>e.from==='file:unobserved'));});
test('file observations require a matching validated event and actual reported path',()=>{const p=fixture();p.files[0].history.push({key:'peer-event'},{key:'first'});p.files[1].history.push({key:'second'});const model=workbenchNetworkModel({projection:p,runId:'run'});assert.deepEqual(model.edges.filter(e=>e.kind==='file-observation'),[{from:'file:file',to:'event:second',kind:'file-observation'}]);});
test('unconfirmed, empty and unknown-run inputs yield no private graph',()=>{for(const status of ['unconfirmed','empty'])assert.deepEqual(workbenchNetworkModel({projection:{...fixture(),status},runId:'run'}),{nodes:[],edges:[]});assert.deepEqual(workbenchNetworkModel({projection:fixture(),runId:'absent'}),{nodes:[],edges:[]});});
test('project, explicitly attributed Agent and outcome edges come only from selected report fields',()=>{
 const p=fixture();p.runs[0].report.projectId='MISSION_CONTROL';p.runs[0].report.agentName='Recorded Agent';p.events[0].event.result={codeSha:'a'.repeat(40),handoff:{path:'HANDOFF.md'}};
 const m=workbenchNetworkModel({projection:p,runId:'run'});
 assert.deepEqual(m.nodes.filter(n=>['project','agent','outcome'].includes(n.type)).map(n=>[n.type,n.label]),[['project','MISSION_CONTROL'],['agent','Recorded Agent'],['outcome','HANDOFF.md']]);
 assert(m.edges.some(e=>e.kind==='reported-project'&&e.from==='project'&&e.to==='task'));
 assert(m.edges.some(e=>e.kind==='reported-agent'&&e.from==='agent'&&e.to==='task'));
 assert.equal(m.edges.filter(e=>e.kind==='reported-outcome').length,1);
 delete p.runs[0].report.agentName;delete p.events[0].event.result;
 assert(!workbenchNetworkModel({projection:p,runId:'run'}).nodes.some(n=>['agent','outcome'].includes(n.type)));
});
