import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,verify} from 'node:crypto';
import {Buffer} from 'node:buffer';
import {appChecksConfigured,createAppChecksCredential} from '../src/reporting/github-app-checks-credential.mjs';
import {createImpactExportServer} from '../src/reporting/impact-export.mjs';

const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const pem=privateKey.export({type:'pkcs8',format:'pem'}),time=Date.parse('2026-11-06T07:00:00Z'),repository='JoeyAJ/nexaeon-web';
const environment={MC_GITHUB_APP_ID:'123',MC_GITHUB_APP_INSTALLATION_ID:'456',MC_GITHUB_APP_PRIVATE_KEY:pem};
const payload=(token='synthetic-installation-token',at=time)=>({token,expires_at:new Date(at+3600000).toISOString(),permissions:{checks:'read',metadata:'read'},repositories:[{full_name:repository}]});
test('App JWT is RS256, time bounded and token mint requests only one allowlisted repo with Checks read',async()=>{
 let calls=0;const provider=createAppChecksCredential({environment,now:()=>time,repositories:[repository],fetchImpl:async(url,options)=>{
  calls++;assert.equal(url,'https://api.github.com/app/installations/456/access_tokens');assert.equal(options.method,'POST');assert.equal(options.redirect,'error');
  assert.deepEqual(JSON.parse(options.body),{repositories:['nexaeon-web'],permissions:{checks:'read'}});
  const [head,claims,signature]=options.headers.Authorization.slice(7).split('.');
  assert.deepEqual(JSON.parse(Buffer.from(head,'base64url')),{alg:'RS256',typ:'JWT'});
  assert.deepEqual(JSON.parse(Buffer.from(claims,'base64url')),{iss:'123',iat:time/1000-60,exp:time/1000+540});
  assert.ok(verify('RSA-SHA256',Buffer.from(head+'.'+claims),publicKey,Buffer.from(signature,'base64url')));
  return Response.json(payload());
 }});
 assert.equal(await provider.get(repository),'synthetic-installation-token');assert.equal(calls,1);
 await assert.rejects(provider.get('Other/private'),{code:'IMPACT_APP_SCOPE_DENIED'});assert.equal(calls,1);
});
test('warm requests share a mint, refresh before expiry and keep repository caches separate',async()=>{
 let at=time,calls=0;const other='JoeyAJ/woosongbuddy';
 const provider=createAppChecksCredential({environment,now:()=>at,repositories:[repository,other],fetchImpl:async(_url,options)=>{
  const n=++calls;await Promise.resolve();const repo=JSON.parse(options.body).repositories[0];return Response.json({...payload('token-'+n,at),repositories:[{full_name:'JoeyAJ/'+repo}]});
 }});
 assert.deepEqual(await Promise.all([provider.get(repository),provider.get(repository)]),['token-1','token-1']);
 assert.equal(await provider.get(other),'token-2');assert.equal(await provider.get(repository),'token-1');
 at+=3480001;assert.equal(await provider.get(repository),'token-3');
 provider.invalidate(repository,'token-1');assert.equal(await provider.get(repository),'token-3');
 provider.invalidate(repository,'token-3');assert.equal(await provider.get(repository),'token-4');assert.equal(calls,4);
});
test('partial App config and malformed private keys fail closed before network access without exposing config',async()=>{
 assert.equal(appChecksConfigured({}),false);assert.equal(appChecksConfigured({MC_GITHUB_APP_ID:'123'}),true);
 for(const env of [{MC_GITHUB_APP_ID:'123'},{...environment,MC_GITHUB_APP_PRIVATE_KEY:'PRIVATE MALFORMED KEY'},{...environment,MC_GITHUB_APP_INSTALLATION_ID:'../123'}]){
  let calls=0;const p=createAppChecksCredential({environment:env,repositories:[repository],fetchImpl:async()=>{calls++;}});
  await assert.rejects(p.get(repository),e=>e.code==='IMPACT_APP_CONFIG_INVALID'&&!e.message.includes('PRIVATE'));assert.equal(calls,0);
 }
});
test('App credentials accept literal newline escapes from environment storage',async()=>{
 const p=createAppChecksCredential({environment:{...environment,MC_GITHUB_APP_PRIVATE_KEY:pem.replaceAll('\n','\\n')},repositories:[repository],now:()=>time,fetchImpl:async()=>Response.json(payload())});
 assert.equal(await p.get(repository),'synthetic-installation-token');
});
test('token response rejects excess permission, wrong repository, invalid expiration and malformed credentials',async()=>{
 for(const change of [{permissions:{checks:'write'}},{permissions:{checks:'read',contents:'read'}},{repositories:[{full_name:'Other/private'}]},{expires_at:new Date(time+60000).toISOString()},{expires_at:new Date(time+7200000).toISOString()},{token:'bad token'},{token:''}]){
  const p=createAppChecksCredential({environment,repositories:[repository],now:()=>time,fetchImpl:async()=>Response.json({...payload(),...change})});
  await assert.rejects(p.get(repository),{code:'IMPACT_APP_TOKEN_UNAVAILABLE'});
 }
});
test('token transport errors and provider error bodies stay private; failed mint can recover on next request',async()=>{
 let calls=0;const p=createAppChecksCredential({environment,repositories:[repository],now:()=>time,fetchImpl:async()=>++calls===1?new Response('PRIVATE PROVIDER ERROR',{status:403}):Response.json(payload())});
 await assert.rejects(p.get(repository),e=>e.code==='IMPACT_APP_TOKEN_UNAVAILABLE'&&e.upstreamStatus===403&&!JSON.stringify(e).includes('PRIVATE'));
 assert.equal(await p.get(repository),'synthetic-installation-token');
 const rate=createAppChecksCredential({environment,repositories:[repository],now:()=>time,fetchImpl:async()=>new Response('PRIVATE',{status:403,headers:{'x-ratelimit-remaining':'0'}})});
 await assert.rejects(rate.get(repository),{code:'IMPACT_APP_RATE_LIMITED'});
});

const sha='b'.repeat(40),secret='a'.repeat(48),req={method:'GET',headers:{authorization:'Bearer '+secret}};
const observation={status:'FOUND',runs:[{report:{projectId:'NEXAEON',track:'BASELINE',events:[{kind:'completed',eventAt:new Date(time).toISOString(),result:{codeSha:sha,tests:[{outcome:'PASS'}]}}]}}]};
const checks=()=>Response.json({total_count:1,check_runs:[{head_sha:sha,app:{slug:'github-actions'},status:'completed',conclusion:'success'}]});
test('export uses App credentials only for CI, refreshes one rejected token, and never leaks them',async()=>{
 let mints=0,reads=0;const seen=[];
 const server=createImpactExportServer({environment:{...environment,NEXAEON_IMPACT_SYNC_SECRET:secret,MC_GITHUB_READ_TOKEN:'legacy-private-credential'},now:()=>time,read:async()=>observation,fetchImpl:async(url,options)=>{
  seen.push({url,auth:options.headers.Authorization});
  if(url.includes('/access_tokens'))return Response.json(payload('mint-'+(++mints)));
  return ++reads===1?new Response('',{status:401}):checks();
 }});
 assert.equal((await server.handle({method:'GET',headers:{}},{project:'NEXAEON'})).status,401);assert.equal(seen.length,0);
 const result=await server.handle(req,{project:'NEXAEON'});assert.equal(result.status,200);assert.equal(mints,2);assert.equal(reads,2);
 assert.ok(seen.filter(x=>x.url.includes('/check-runs')).every(x=>/^Bearer mint-/.test(x.auth)));
 assert.ok(!JSON.stringify(result).includes('mint-'));assert.ok(!JSON.stringify(result).includes('legacy-private'));
 await server.handle(req,{project:'NEXAEON'});assert.equal(mints,2);
});
test('configured App failures never fall back to personal credential or anonymous reads',async()=>{
 for(const status of [401,403,404]){
  let mints=0,reads=0;const server=createImpactExportServer({environment:{...environment,NEXAEON_IMPACT_SYNC_SECRET:secret,MC_GITHUB_READ_TOKEN:'PRIVATE'},read:async()=>observation,now:()=>time,fetchImpl:async(url)=>{
   if(url.includes('/access_tokens')){mints++;return Response.json(payload());}reads++;return new Response('',{status});
  }});
  const result=await server.handle(req,{project:'NEXAEON'});assert.equal(result.status,503);assert.equal(mints,status===401?2:1);assert.equal(reads,status===401?2:1);
 }
 const partial=createImpactExportServer({environment:{MC_GITHUB_APP_ID:'123',NEXAEON_IMPACT_SYNC_SECRET:secret},read:async()=>observation,fetchImpl:async()=>assert.fail('no network for invalid config')});
 assert.deepEqual((await partial.handle(req,{project:'NEXAEON'})).body,{error:'IMPACT_APP_CONFIG_INVALID',phase:'app-configuration'});
});
