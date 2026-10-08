// Local Request objects and synthetic RPC ports only: no live host, user or job.
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,generateKeyPairSync} from 'node:crypto';
import {createEdgeHandler} from '../edge/handler.mjs';
import {AUDIENCE,signedRequest} from '../src/protocol.mjs';
import {emptyPayload} from '../vendor/safe-payload.mjs';
import {artifact,artifactDigest,policyDigest} from '../edge/artifact.generated.mjs';
import {bootstrap} from '../edge/bootstrap.generated.mjs';
const origin=new URL(AUDIENCE).origin,root='/mc-worker-link-v1',runtime=origin+root;
const hash=x=>createHash('sha256').update(x).digest('hex');
const pair=generateKeyPairSync('ed25519'),publicKey=pair.publicKey.export({type:'spki',format:'pem'});
const code='mc_pair_'+'a'.repeat(43),job={jobId:'synthetic_job',attemptId:'synthetic_attempt',fence:1};
const post=body=>new Request(runtime,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});

test('documented runtime GET serves only the exact pinned public bootstrap without RPC',async()=>{
 let rpc=0;const h=createEdgeHandler({enabled:true,bootstrap,rpc:()=>{rpc++;}});
 const res=await h(new Request(runtime+'/bootstrap.mjs'));
 assert.equal(res.status,200);assert.equal(res.headers.get('cache-control'),'no-store');
 assert.equal(hash(Buffer.from(await res.arrayBuffer())),'6db4da07651c73613eaf00decdcbda37293a2ae86f3bf2fcb0d7d12ea5aa45a4');assert.equal(rpc,0);
});

test('only two exact function-prefixed paths reach routing; wrong prefixes and encodings are denied',async()=>{
 let rpc=0,reads=0;const h=createEdgeHandler({enabled:true,bootstrap,rpc:()=>{rpc++;}});
 for(const path of ['/functions/v1'+root+'/bootstrap.mjs','/other/bootstrap.mjs',root+'/',root+'/bootstrap.mjs/',root+'/extra',root+'/BOOTSTRAP.mjs','//mc-worker-link-v1/bootstrap.mjs','/MC-worker-link-v1/bootstrap.mjs',root+'/%62ootstrap.mjs',root+'/bootstrap%2Emjs']){
  const req={url:origin+path,method:'GET',get body(){reads++;throw Error('BODY_MUST_NOT_BE_READ');}};
  assert.equal((await h(req)).status,403,path);
 }
 assert.equal(rpc,0);assert.equal(reads,0);
});

test('query and fragment forms are denied before body or RPC, including empty query',async()=>{
 let rpc=0,reads=0;const h=createEdgeHandler({enabled:true,bootstrap,rpc:()=>{rpc++;}});
 for(const path of [root,root+'/bootstrap.mjs'])for(const suffix of ['?','?x=1','?action=claim','#x']){
  const req={url:origin+path+suffix,method:path===root?'POST':'GET',get body(){reads++;throw Error('BODY_MUST_NOT_BE_READ');}};
  assert.equal((await h(req)).status,403,path+suffix);
 }
 assert.equal(rpc,0);assert.equal(reads,0);
});

test('observable raw traversal and slash normalization cannot select an allowed route',async()=>{
 // A platform may canonicalize a URL before constructing Request. These test
 // the raw URL still observable by the handler, without claiming unseen input.
 let rpc=0;const h=createEdgeHandler({enabled:true,bootstrap,rpc:()=>{rpc++;}});
 for(const path of [root+'/x/../bootstrap.mjs',root+'/./bootstrap.mjs',root+'/../mc-worker-link-v1/bootstrap.mjs',root+'/%2e/bootstrap.mjs',root+'/%2e%2e/mc-worker-link-v1/bootstrap.mjs',root+'/%252e/bootstrap.mjs',root+'/%2fbootstrap.mjs',root+'//bootstrap.mjs',root+'/x\\..\\bootstrap.mjs']){
  assert.equal((await h({url:origin+path,method:'GET'})).status,403,path);
 }
 assert.equal(rpc,0);
});

test('exact GET-bootstrap and POST-machine verbs are enforced before body or RPC',async()=>{
 let rpc=0,reads=0;const h=createEdgeHandler({enabled:true,bootstrap,rpc:()=>{rpc++;}});
 for(const [path,methods]of [[root,['GET','HEAD','OPTIONS','PUT','PATCH','DELETE']],[root+'/bootstrap.mjs',['POST','HEAD','OPTIONS','PUT','DELETE']]])for(const method of methods){
  assert.equal((await h({url:origin+path,method,get body(){reads++;throw Error('BODY_MUST_NOT_BE_READ');}})).status,403,method+' '+path);
 }
 assert.equal(rpc,0);assert.equal(reads,0);
});

test('all seven signed machine actions preserve the public audience and Ed25519 checks',async()=>{
 const calls=[],h=createEdgeHandler({enabled:true,rpc:async r=>{calls.push(r);return r.action==='lookup'?{publicKey}:{ackAction:r.action};}});
 const cases=[['pair',{pairingCode:code,publicKey}],['identity',{}],['claim',{}],['spawn_intent',job],['control',job],['events',{...job,events:[{eventId:'synthetic_event',seq:1,observedAt:Date.now(),payload:emptyPayload('turn_completed')}]}],['finish',{...job,outcome:'COMPLETED'}]];
 for(const [action,body]of cases){const envelope=signedRequest(pair.privateKey,'synthetic_worker',action,body);assert.equal(envelope.request.audience,AUDIENCE);
  const res=await h(post(envelope));assert.equal(res.status,200,action);assert.equal((await res.json()).ackAction,action);
 }
 assert.equal(calls.filter(r=>r.action==='lookup').length,6);assert.equal(calls.filter(r=>r.action!=='lookup').length,7);
 const paired=calls.find(r=>r.action==='pair');assert.equal(paired.body.pairingHash,hash(code));assert(!JSON.stringify(calls).includes(code));
});

test('valid routing cannot authorize forged, changed-audience, expired or tampered envelopes',async()=>{
 let mutations=0;const other=generateKeyPairSync('ed25519'),h=createEdgeHandler({enabled:true,rpc:async r=>{if(r.action!=='lookup')mutations++;return {publicKey};}});
 const wrongAudience=signedRequest(pair.privateKey,'synthetic_worker','claim',{});wrongAudience.request.audience=AUDIENCE+'/extra';
 const tampered=signedRequest(pair.privateKey,'synthetic_worker','claim',{});tampered.request.requestId='changed_request';
 const missing=signedRequest(pair.privateKey,'synthetic_worker','claim',{});delete missing.signature;
 for(const envelope of [signedRequest(other.privateKey,'synthetic_worker','claim',{}),signedRequest(pair.privateKey,'synthetic_worker','claim',{},Date.now()-31001),signedRequest(pair.privateKey,'synthetic_worker','claim',{},Date.now()+31001),wrongAudience,tampered,missing])assert.equal((await h(post(envelope))).status,403);
 assert.equal(mutations,0);
});

test('artifact POST still requires exact Owner-approved pairing hash and matching digest acknowledgement',async()=>{
 let authorized=false;const calls=[],h=createEdgeHandler({enabled:true,artifact,artifactDigest,policyDigest,rpc:async r=>{calls.push(r);return {authorized,artifactDigest,policyDigest};}});
 const body={action:'bootstrap',workerId:'synthetic_worker',requestId:'synthetic_request',pairingCode:code};
 assert.equal((await h(post(body))).status,403);authorized=true;
 const res=await h(post(body));assert.equal(res.status,200);assert.equal(hash(Buffer.from(await res.arrayBuffer())),artifactDigest);
 assert.deepEqual(calls[0].body,{pairingHash:hash(code)});assert(!JSON.stringify(calls).includes(code));
 assert.equal((await h(post({...body,extra:true}))).status,403);assert.equal(calls.length,2);
});

test('disabled handler and disabled DB port prevent signed-route admission',async()=>{
 let calls=0;const off=createEdgeHandler({enabled:false,rpc:()=>{calls++;}});
 assert.equal((await off(new Request(runtime+'/bootstrap.mjs'))).status,503);assert.equal((await off(post(signedRequest(pair.privateKey,'synthetic_worker','claim',{})))).status,503);assert.equal(calls,0);
 const dbOff=createEdgeHandler({enabled:true,rpc:()=>{calls++;throw Error('VM_LINK_DISABLED');}});
 assert.equal((await dbOff(post(signedRequest(pair.privateKey,'synthetic_worker','claim',{})))).status,403);assert.equal(calls,1);
});
