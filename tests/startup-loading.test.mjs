import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
const source=await fs.readFile(new URL('../public/app.js',import.meta.url),'utf8');
const reloadSource=source.split('\n').find(line=>line.startsWith('async function reload(){'));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
function harness(api){const c={api,releaseInfo:null,state:null,manifests:new Map(),pendingProposals:[],assetCatalog:null,inboxItems:[],publicCaseSnapshot:null,observerView:null,lastSuccessfulRead:null,readFailed:false,externalDataChange:false,readingData:false,$:()=>({classList:{contains:()=>false}}),renderDataStatus(){},renderRelease(){},renderInbox(){},renderHuman(){},render(snapshot){c.state=snapshot;},retainLastConfirmed:m=>m};return{c,reload:vm.runInNewContext(reloadSource+'\nreload',c)};}
const health={readOnly:true,candidateStage:'V0.3-E'},snapshot={projects:[],generatedAt:'fixture'},cases={cases:[{id:'fixture'}]};
test('startup awaits late health and case source before committing any successful snapshot',async()=>{
 const late=deferred(),caseSource=deferred(),calls=[];const{c,reload}=harness(async route=>{calls.push(route);if(route==='/api/health')return late.promise;if(route==='/api/state')return snapshot;if(route==='/api/projects')return[];if(route==='/api/public-cases')return caseSource.promise;throw Error(route);});
 const run=reload();await Promise.resolve();assert.deepEqual(calls,['/api/health']);assert.equal(c.state,null);assert.equal(c.lastSuccessfulRead,null);
 late.resolve(health);await new Promise(r=>setImmediate(r));assert.ok(calls.includes('/api/public-cases'));assert.equal(c.state,null);assert.equal(c.publicCaseSnapshot,null);assert.equal(c.lastSuccessfulRead,null);
 caseSource.resolve(cases);await run;assert.equal(c.state,snapshot);assert.equal(c.publicCaseSnapshot,cases);assert.ok(c.lastSuccessfulRead);assert.equal(c.readFailed,false);
 assert.doesNotMatch(source,/api\('\/api\/health'\)\.then/);assert.match(source,/reload\(\)\.then\(\(\)=>reloadInbox\(\)\)\.catch\(notifyError\)/);
});
test('first case-source 503 leaves no successful-read claim and refresh recovers atomically',async()=>{
 let failed=true;const{c,reload}=harness(async route=>{if(route==='/api/health')return health;if(route==='/api/state')return snapshot;if(route==='/api/projects')return[];if(route==='/api/public-cases'){if(failed)throw Error('503');return cases;}throw Error(route);});
 await assert.rejects(reload(),/503/);assert.equal(c.readFailed,true);assert.equal(c.readingData,false);assert.equal(c.state,null);assert.equal(c.publicCaseSnapshot,null);assert.equal(c.lastSuccessfulRead,null);
 failed=false;await reload();assert.equal(c.state,snapshot);assert.equal(c.publicCaseSnapshot,cases);assert.ok(c.lastSuccessfulRead);assert.equal(c.readFailed,false);
 const lastRead=c.lastSuccessfulRead;failed=true;await assert.rejects(reload(),/503/);assert.equal(c.state,snapshot);assert.equal(c.publicCaseSnapshot,cases);assert.equal(c.lastSuccessfulRead,lastRead);assert.equal(c.readFailed,true);
});
test('failed health remains failed and a retry resolves mode before loading data',async()=>{
 let failed=true;const calls=[];const{c,reload}=harness(async route=>{calls.push(route);if(route==='/api/health'){if(failed)throw Error('health unavailable');return health;}if(route==='/api/state')return snapshot;if(route==='/api/projects')return[];if(route==='/api/public-cases')return cases;throw Error(route);});
 await assert.rejects(reload(),/health unavailable/);assert.deepEqual(calls,['/api/health']);assert.equal(c.releaseInfo,null);assert.equal(c.readFailed,true);assert.equal(c.lastSuccessfulRead,null);failed=false;await reload();assert.equal(c.readFailed,false);assert.equal(c.publicCaseSnapshot,cases);
});

test('observer fetch failure retains all last confirmed sources; retry commits together',async()=>{
 let failed=true;const previous={revision:1};const{c,reload}=harness(async route=>{if(route==='/api/health')return {...health,candidateObserver:true};if(route==='/api/observer'){if(failed)throw Error('503 observer');return {revision:2};}if(route==='/api/state')return snapshot;if(route==='/api/projects')return [];if(route==='/api/public-cases')return cases;});c.observerView=previous;await assert.rejects(reload(),/503 observer/);assert.equal(c.observerView,previous);assert.equal(c.state,null);assert.equal(c.lastSuccessfulRead,null);failed=false;await reload();assert.equal(c.observerView.revision,2);assert.equal(c.state,snapshot);assert.equal(c.readFailed,false);
});
