import test from 'node:test';import assert from 'node:assert/strict';
import {readTowerRunSources} from '../public/tower-run-sources.js';
import {readTowerCatalog,towerCatalogState} from '../public/tower-catalog.js';
import {projectCard} from '../public/tower-model.js';
const ids=['WOOSONG_BUDDY','MISSION_CONTROL'];
const summary={qualification:'PUBLIC_READ_ONLY_RUN_SUMMARY',status:'reported',tasks:[{runId:'historical-backfill',agentName:'Codex',featureTitle:'歷史補登：10/28 actual change',currentState:'completed',reportedState:'completed',eventAt:'2026-11-03T00:12:28.358Z',summary:'Retrospective only; actual developer/date preserved'}],active:[],blockers:[],events:[{runId:'historical-backfill',sequence:1,kind:'completed',eventAt:'2026-11-03T00:12:28.358Z',summary:'Recorded earlier change',activity:null}]};
test('verified Owner empty result plus catalog503/GitHub403 cannot suppress existing public Buddy history',async()=>{
 const catalog=await readTowerCatalog(()=>{throw Object.assign(Error('REGISTRATION_CATALOG_UNAVAILABLE'),{status:503,upstreamStatus:403});});assert.equal(towerCatalogState(catalog,{otherOwnerReady:true}).ownerReady,true);
 let requested;const result=await readTowerRunSources({projectIds:ids,ownerRuns:{},readPublic:async list=>{requested=list;return {WOOSONG_BUDDY:summary};}});assert.deepEqual(requested,ids);
 const card=projectCard({id:'WOOSONG_BUDDY',name:'Buddy',joeyStatus:'paused',updatedAt:'2026-10-03'},{runs:result.runs.WOOSONG_BUDDY});assert.equal(card.history.length,1);assert.equal(card.lastAgent,'Codex');assert.equal(card.state,'paused');assert.equal(card.version,null);assert.equal(card.updatedAt,'2026-11-03T00:12:28.358Z');assert.equal(card.timeline.length,1);assert.equal(catalog.diagnostic.upstreamStatus,403);
});
test('Owner unconfirmed/missing keys fall back per public project, while valid private summaries stay authoritative',async()=>{
 const good={status:'reported',tasks:[{runId:'private-current'}]},privateProject={status:'unconfirmed',tasks:[]};let requested;
 const result=await readTowerRunSources({projectIds:ids,ownerRuns:{WOOSONG_BUDDY:{status:'unconfirmed',tasks:[]},MISSION_CONTROL:good,PRIVATE_CATALOG_PROJECT:privateProject},readPublic:async list=>{requested=list;return {WOOSONG_BUDDY:summary,PRIVATE_CATALOG_PROJECT:summary};}});
 assert.deepEqual(requested,['WOOSONG_BUDDY']);assert.equal(result.runs.MISSION_CONTROL,good);assert.equal(result.runs.WOOSONG_BUDDY,summary);assert.equal(result.runs.PRIVATE_CATALOG_PROJECT,privateProject);
 for(const status of ['reported','active','stale','missing']){let reads=0;await readTowerRunSources({projectIds:['WOOSONG_BUDDY'],ownerRuns:{WOOSONG_BUDDY:{status,tasks:[]}},readPublic:async()=>{reads++;}});assert.equal(reads,0);}
});
test('logout uses only explicitly public fixed projects; public failure or wrong qualification never grants private access',async()=>{
 const guest=await readTowerRunSources({projectIds:ids,ownerRuns:null,readPublic:async()=>({WOOSONG_BUDDY:summary,PRIVATE_CATALOG_PROJECT:summary})});assert.deepEqual(Object.keys(guest.runs),['WOOSONG_BUDDY']);
 for(const readPublic of [()=>{throw Error('denied');},async()=>null,async()=>({WOOSONG_BUDDY:{...summary,qualification:'PRIVATE_REPOSITORY_AGENT_REPORTS'}})]){const r=await readTowerRunSources({projectIds:ids,ownerRuns:null,readPublic});assert.deepEqual(r.runs,{});}
});
