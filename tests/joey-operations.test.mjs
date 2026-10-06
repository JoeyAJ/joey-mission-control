import test from 'node:test';
import assert from 'node:assert/strict';
import {renderOperations,operationLabels} from '../public/joey-operations.js';
import {candidate} from '../src/candidate.mjs';
const el=(tag,value,cls)=>({tag,textContent:value,className:cls,dataset:{},events:{},children:[],append(...n){this.children.push(...n);},addEventListener(k,f){this.events[k]=f;}});
const walk=n=>[n,...n.children.flatMap(walk)];
test('operations preserve exact recorded task and distinguish current from historical execution',()=>{
 const input={project_id:'NEXAEON',runtime:{currentMission:'Recorded task',currentAgent:null,currentModel:null,lastAgent:'Codex',lastModel:'Recorded model',lastCompletedAction:'Scoped completion',nextAction:'Inspect evidence',missionStatus:'Awaiting sync',lastSyncedAt:'2026-10-06T00:00:00Z',fields:{lastAgent:{status:'Active',source:{kind:'canonical_handoff',fingerprint:'abc',sourceSection:'Agent'}}}}};const before=JSON.stringify(input),root=renderOperations(input,{el,locale:'en'}),nodes=walk(root);assert.equal(JSON.stringify(input),before);assert.match(nodes.find(n=>n.dataset.field==='currentAgent').children[1].textContent,/Not confirmed/);assert.equal(nodes.find(n=>n.dataset.field==='lastAgent').children[1].textContent,'Codex');assert.ok(JSON.stringify(root).includes('canonical_handoff'));assert.ok(JSON.stringify(root).includes('2026-10-06T00:00:00Z'));
});
test('unknown state does not become approval, ready execution or fabricated completion',()=>{
 const root=renderOperations({project_id:'NEXAEON'},{el,locale:'en'});assert.doesNotMatch(walk(root).map(n=>n.textContent||'').join(' '),/NO_APPROVAL_REQUIRED|No recorded pending approval|APPROVED|Completed|Online/);assert.ok(JSON.stringify(root).includes('UNKNOWN'));
});
test('snapshot entry only opens existing project inspection without mutation or execution',()=>{
 const calls=[],root=renderOperations({project_id:'NEXAEON',runtime:{approvalStatus:'AWAITING_JOEY_APPROVAL',approvalItems:[{what:'Confirm scope',why:'Scope incomplete'}],restrictions:['Do not deploy']}},{el,locale:'en',readOnly:true,onInspect:id=>calls.push(id)});assert.ok(JSON.stringify(root).includes('not live Mac state'));assert.ok(JSON.stringify(root).includes('AWAITING_JOEY_APPROVAL'));assert.deepEqual(calls,[]);walk(root).find(n=>n.className?.includes('operations-inspect')).events.click();assert.deepEqual(calls,['NEXAEON']);
});
test('operations withhold private filesystem and credential references even in local source content',()=>{
 const root=renderOperations({project_id:'TEST',runtime:{nextAction:'Inspect /Users/private/file',blocker:'Bearer secret',restrictions:['/home/private/data'],fields:{blocker:{status:'Active',source:{sourcePath:'/Users/joey/private',sourceSection:'/private/data'}}}}},{el,locale:'en'});assert.doesNotMatch(JSON.stringify(root),/\/Users\/|\/home\/|\/private\/|Bearer secret/);assert.ok(JSON.stringify(root).includes('Private reference withheld'));
});
test('C is explicitly accepted for its authorized release and has labels in all locales',()=>{assert.equal(candidate.candidateAcceptance,'PASSED');assert.equal(candidate.deployAuthorized,true);for(const locale of ['zh-TW','en','ko'])assert.deepEqual(Object.keys(operationLabels(locale)),Object.keys(operationLabels('en')));});

test('local server serves the operations module required by Joey View',async()=>{const {createApp}=await import('../src/server.mjs');let status,headers,body;await createApp({})({headers:{host:'127.0.0.1'},method:'GET',url:'/joey-operations.js'},{writeHead:(s,h)=>{status=s;headers=h;},end:b=>body=b});assert.equal(status,200);assert.match(headers['Content-Type'],/javascript/);assert.match(body,/export function renderOperations/);});
