import test from 'node:test';
import assert from 'node:assert/strict';
import {publicTowerSummary,createPublicTowerRunServer} from '../src/reporting/public-tower-runs.mjs';
const raw={status:'reported',tasks:[{runId:'r1',agentName:'Cursor',featureTitle:'v1.1 · x',currentState:'completed',reportedState:'completed',eventAt:'2026-10-23T06:56:15.000Z',expiresAt:null,summary:'done https://github.com/JoeyAJ/private-repo token ghp_ABCDEFGHIJKLMNOP',repositoryId:'JoeyAJ/joey-asset-system',workRef:'cursor/x',source:{providerBlobId:'a'.repeat(40)},result:{codeSha:'b'.repeat(40),tests:[{name:'t',outcome:'PASS'}]},delivery:{deployment:{}},deliveryReadiness:{}}],events:[{runId:'r1',sequence:1,kind:'completed',eventAt:'2026-10-23T06:56:15.000Z',summary:'s',activity:{path:'secret/path.md'}}]};
test('guest run summary keeps display fields only and strips repository links and tokens',()=>{
 const s=publicTowerSummary(raw),json=JSON.stringify(s);
 assert.deepEqual(Object.keys(s.tasks[0]).sort(),['agentName','currentState','eventAt','expiresAt','featureTitle','reportedState','runId','summary']);
 for(const leak of ['JoeyAJ','ghp_','cursor/x','providerBlobId','codeSha','secret/path','delivery'])assert.equal(json.includes(leak),false,leak);
 assert.equal(s.events[0].activity,null);assert.equal(s.qualification,'PUBLIC_READ_ONLY_RUN_SUMMARY');
});
test('guest run endpoint is GET-only, scoped to configured projects, and never needs an Owner token',async()=>{
 const server=createPublicTowerRunServer({environment:{},read:async()=>({status:'NO_REPORTS',runs:[]})});
 assert.equal((await server.handle({method:'POST'},{project:'JOEY_ASSET_SYSTEM'})).status,405);
 assert.equal((await server.handle({method:'GET'},{project:'../x'})).status,400);
 assert.equal((await server.handle({method:'GET'},{project:'NOT_A_PROJECT'})).status,404);
 const ok=await server.handle({method:'GET'},{project:'NEXAEON'});assert.equal(ok.status,200);assert.equal(ok.body.runs.qualification,'PUBLIC_READ_ONLY_RUN_SUMMARY');
});
import {publicStatusMap,createPublicTowerStatusServer} from '../src/reporting/public-tower-runs.mjs';
test('guest status exposes only Joey status labels for project ids',async()=>{
 assert.deepEqual(publicStatusMap({JOEY_ASSET_SYSTEM:'push',X_Y:'paused',draft_1:'removed',NEXAEON:'go',BAD:{a:1}}),{JOEY_ASSET_SYSTEM:'push',X_Y:'paused'});
 const calls=[];const s=createPublicTowerStatusServer({supabase:{origin:'https://db.example',publishableKey:'sb_publishable_x'},fetchImpl:async(u,o)=>{calls.push([u,o]);return {ok:true,json:async()=>({JOEY_ASSET_SYSTEM:'push',draft_a:'removed'})};}});
 assert.equal((await s.handle({method:'POST'})).status,405);
 const r=await s.handle({method:'GET'});assert.equal(r.status,200);assert.deepEqual(r.body.statuses,{JOEY_ASSET_SYSTEM:'push'});assert.match(calls[0][0],/rpc\/mc_public_tower_status$/);
});
