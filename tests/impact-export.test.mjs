import test from 'node:test';
import assert from 'node:assert/strict';
import {createImpactExportServer,exportMilestone} from '../src/reporting/impact-export.mjs';
const secret='a'.repeat(48),sha='b'.repeat(40);
const observation={status:'FOUND',runs:[{report:{projectId:'NEXAEON',track:'BASELINE',featureTitle:'PRIVATE TITLE',events:[{kind:'completed',eventAt:'2026-11-06T00:00:00Z',summary:'PRIVATE SUMMARY',result:{codeSha:sha,tests:[{name:'private test',outcome:'PASS'}]}}]}}]};
const ci={codeSha:sha,qualification:'GITHUB_ACTIONS_EXACT_COMMIT',checks:1,checkedAt:'2026-11-06T01:00:00Z'};
test('export contains bounded version evidence; Agent completion is not acceptance',()=>{
 const value=exportMilestone('NEXAEON',observation,ci);assert.equal(value.productAccepted,false);assert.equal(value.version.codeSha,sha);
 assert.ok(!JSON.stringify(value).includes('PRIVATE'));assert.ok(!JSON.stringify(value).includes('private test'));
 assert.equal(exportMilestone('NEXAEON',{...observation,status:'PARTIAL'},ci),null);
 assert.equal(exportMilestone('NEXAEON',observation,{...ci,codeSha:'c'.repeat(40)}),null);
 assert.equal(exportMilestone('UNKNOWN',observation,ci),null);
});
test('MC integration requires dedicated authentication, rejects unknown scope and independently checks exact CI SHA',async()=>{
 let reads=0;const server=createImpactExportServer({environment:{NEXAEON_IMPACT_SYNC_SECRET:secret},read:async()=>{reads++;return structuredClone(observation);},verify:async()=>ci});
 assert.equal((await server.handle({method:'GET',headers:{}},{project:'NEXAEON'})).status,401);assert.equal(reads,0);
 const req={method:'GET',headers:{authorization:'Bearer '+secret}};
 assert.equal((await server.handle(req,{project:'PRIVATE_PROJECT'})).status,404);
 const result=await server.handle(req,{project:'NEXAEON'});assert.equal(result.status,200);assert.equal(result.headers['Cache-Control'],'private, no-store');
});
test('a pending/failing or empty CI response cannot export a completed report',async()=>{
 for(const payload of [{check_runs:[],total_count:0},{check_runs:[{head_sha:sha,app:{slug:'github-actions'},status:'completed',conclusion:'failure'}],total_count:1},{check_runs:[{head_sha:sha,app:{slug:'github-actions'},status:'completed',conclusion:'success'}],total_count:101}]){
  const server=createImpactExportServer({environment:{NEXAEON_IMPACT_SYNC_SECRET:secret},read:async()=>observation,fetchImpl:async()=>({ok:true,json:async()=>payload})});
  assert.equal((await server.handle({method:'GET',headers:{authorization:'Bearer '+secret}},{project:'NEXAEON'})).status,409);
 }
});
test('public CI fallback checks repo identity and never sends the private credential',async()=>{
 const calls=[];const server=createImpactExportServer({environment:{NEXAEON_IMPACT_SYNC_SECRET:secret,MC_GITHUB_READ_TOKEN:'private-contents-only'},read:async()=>observation,fetchImpl:async(url,options)=>{
  calls.push({url,options});
  if(calls.length===1)return{ok:false,status:403};
  if(calls.length===2)return{ok:true,json:async()=>({full_name:'JoeyAJ/nexaeon-web',private:false,visibility:'public',archived:false,disabled:false})};
  return{ok:true,json:async()=>({total_count:1,check_runs:[{head_sha:sha,app:{slug:'github-actions'},status:'completed',conclusion:'success'}]})};
 }});
 assert.equal((await server.handle({method:'GET',headers:{authorization:'Bearer '+secret}},{project:'NEXAEON'})).status,200);
 assert.equal(calls.length,3);assert.equal(calls[1].options.headers.Authorization,undefined);assert.equal(calls[2].options.headers.Authorization,undefined);
});
test('private or mismatched repository identity cannot use the public CI fallback',async()=>{
 for(const identity of [{full_name:'JoeyAJ/nexaeon-web',private:true,visibility:'private',archived:false,disabled:false},{full_name:'Other/repo',private:false,visibility:'public',archived:false,disabled:false}]){
  let calls=0;const server=createImpactExportServer({environment:{NEXAEON_IMPACT_SYNC_SECRET:secret},read:async()=>observation,fetchImpl:async()=>++calls===1?{ok:false,status:403}:{ok:true,json:async()=>identity}});
  const result=await server.handle({method:'GET',headers:{authorization:'Bearer '+secret}},{project:'NEXAEON'});
  assert.equal(result.body.error,'IMPACT_CI_READ_ACCESS_REQUIRED');assert.equal(calls,2);
 }
});
