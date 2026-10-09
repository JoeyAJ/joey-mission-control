import test from 'node:test';
import assert from 'node:assert/strict';
import {taskRunPresentation} from '../src/continuity/task-workflow-view.mjs';
import {retainLastConfirmed,renderPhaseOverview} from '../public/joey-operations.js';
import {renderLinkageStatus} from '../public/proposal-navigation.js';
import {productionResponse} from '../api/index.mjs';
const now=Date.parse('2026-10-09T16:00:00Z'),at=delta=>new Date(now+delta).toISOString();
const node=(tag,textContent='',className='')=>({tag,textContent,className,dataset:{},children:[],append(...values){this.children.push(...values);},setAttribute(){},addEventListener(){}}),doc={createElement:node},walk=n=>[n,...n.children.flatMap(walk)];
test('completed parent records stay last known and cannot become current execution from a fresh reread',()=>{
 const run={runId:'finished-stage',status:'completed',validity:'CLOSED',sourceQualification:'PARENT_IMPORTED_VISIBLE_SUMMARY',eventAt:null,receivedAt:at(-86400000),emitterAttached:false,deliveryLeaseActive:false};
 const before=JSON.stringify(run),view=taskRunPresentation(run,{now});assert.equal(view.status,'completed');assert.equal(view.currentExecution,'UNKNOWN');assert.equal(view.eventAt,null);assert.equal(view.receivedAt,run.receivedAt);assert.equal(view.stale,false);assert.equal(taskRunPresentation(run,{now,readFailed:true}).stale,true);assert.equal(JSON.stringify(run),before);
});
test('progress, block and future receipt freshness depends on the record rather than consumer read time',()=>{
 for(const status of ['progress','blocked','started']){const run={runId:'reported',status,validity:'RECENT_REPORTED_SUMMARY',receivedAt:at(-300000),eventAt:null};assert.equal(taskRunPresentation(run,{now}).stale,true);assert.equal(taskRunPresentation({...run,receivedAt:at(-1)},{now}).stale,false);assert.equal(taskRunPresentation({...run,receivedAt:at(1)},{now}).stale,true);assert.equal(taskRunPresentation(run,{now}).currentExecution,'UNKNOWN');}
 assert.equal(taskRunPresentation({status:'planned',receivedAt:null},{now}).stale,false);assert.equal(taskRunPresentation({status:'unexpected'},{now}).status,'unknown');
});
test('snapshot source time and consumer read time are distinct and latest state stays unconfirmed',()=>{
 const options={doc,locale:'en',readOnly:true,sourceAsOf:at(-86400000),lastReadAt:at(0)},first=renderLinkageStatus(options),second=renderLinkageStatus({...options,lastReadAt:at(60000)});assert.equal(first.dataset.sourceFreshness,'LATEST_NOT_RECHECKED');assert.equal(second.dataset.sourceFreshness,'LATEST_NOT_RECHECKED');for(const root of [first,second]){const text=walk(root).map(n=>n.textContent).join('\n');assert(text.includes(at(-86400000)));assert(text.includes('does not renew source event time'));}assert.notDeepEqual(walk(first).map(n=>n.textContent),walk(second).map(n=>n.textContent));
});
test('failed reads preserve four source dates and historical identity without a renewed source claim',()=>{
 const manifests=productionResponse('GET',new URL('https://fixture/api?route=projects')).body,before=JSON.stringify(manifests),retained=retainLastConfirmed(new Map(manifests.map(m=>[m.project_id,m])),at(0));
 for(const original of manifests){const current=retained.get(original.project_id);assert.equal(current.phase.stageDate,original.phase.stageDate);assert.equal(current.phase.lastDevelopmentAgent,original.phase.lastDevelopmentAgent);assert.equal(current.sourceReadout.sourceDate,original.sourceReadout.sourceDate);const root=renderPhaseOverview(current,{el:node,locale:'en',readOnly:true}),text=walk(root).map(n=>n.textContent).join('\n');assert(text.includes('Latest project state is unconfirmed'));assert(text.includes('Agent / model for this historical stage'));assert.equal(current.runtime.currentAgent,null);}
 assert.equal(JSON.stringify(manifests),before);
});
