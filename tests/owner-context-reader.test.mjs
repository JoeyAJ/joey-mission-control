import test from 'node:test';
import assert from 'node:assert/strict';
import {createOwnerContextReader} from '../src/continuity/owner-context-reader.mjs';
import {continuityDigest} from '../docs/contracts/private-continuity.mjs';
const subject='11111111-1111-4111-8111-111111111111',project='NEXAEON',claims={stage:{value:'SYNTHETIC_PRIVATE_CONTEXT',qualification:'SOURCE_RECORDED'}},pin=continuityDigest(claims);
const actor=()=>({status:'authenticated',subject,role:'OWNER',aal:'aal2',verified:true,sessionActive:true,memberActive:true,projects:[project],expiresAt:2000});
function fixture(){let current=actor(),calls=[];const options={enabled:true,ownerSubject:subject,inspectCurrentOwner:async()=>({...current}),rpc:async(name,args)=>{calls.push({name,args});return{data:name==='mc_owner_context_scope'?{projectId:project,contextHash:pin}:{projectId:project,contextHash:pin,filteredClaims:claims}};},digest:continuityDigest,now:()=>1000};return{options,calls,setActor:a=>current=a};}
test('inactive reader and unknown scope make no RPC or Auth calls',async()=>{
 let calls=0;const r=createOwnerContextReader({rpc:()=>calls++,inspectCurrentOwner:()=>calls++});await assert.rejects(r.read(project),/PRIVATE_READ_NOT_AUTHORIZED/);assert.equal(calls,0);assert.equal(r.view().status,'unconfigured');
 const f=fixture(),reader=createOwnerContextReader(f.options);await assert.rejects(reader.read('UNKNOWN'),/PRIVATE_READ_NOT_AUTHORIZED/);assert.equal(f.calls.length,0);
});
test('each read requires fixed current Owner, AAL2, membership, project and expiry',async()=>{
 for(const patch of [{subject:'22222222-2222-4222-8222-222222222222'},{role:'WRITER'},{aal:'aal1'},{verified:false},{sessionActive:false},{memberActive:false},{projects:[]},{expiresAt:1000}]){
  const f=fixture();f.setActor({...actor(),...patch});const reader=createOwnerContextReader(f.options);await assert.rejects(reader.read(project),/PRIVATE_READ_NOT_CONFIRMED/);assert.equal(f.calls.length,0);assert.equal(reader.view().privateContextLoaded,false);
 }
});
test('Owner-only lookup supplies the pin without public configuration or payload diagnostics',async()=>{
 const f=fixture(),r=createOwnerContextReader(f.options);assert.deepEqual(await r.read(project),claims);assert.deepEqual(f.calls,[{name:'mc_owner_context_scope',args:{project}},{name:'mc_owner_read_context',args:{project,requested_hash:pin}}]);assert.equal(r.view().privateContextLoaded,true);assert.doesNotMatch(JSON.stringify(r.view()),/SYNTHETIC_PRIVATE_CONTEXT|contextHash|filteredClaims|11111111/);r.invalidate();assert.equal(r.view().privateContextLoaded,false);
});
test('project, pin and returned content integrity are enforced',async()=>{
 for(const patch of [{projectId:'WOOSONG_BUDDY'},{contextHash:'f'.repeat(64)},{filteredClaims:{stage:'CHANGED'}},{filteredClaims:[]}]){
  const f=fixture();f.options.rpc=async name=>({data:name==='mc_owner_context_scope'?{projectId:project,contextHash:pin}:{projectId:project,contextHash:pin,filteredClaims:claims,...patch}});const r=createOwnerContextReader(f.options);await assert.rejects(r.read(project),/PRIVATE_READ_NOT_CONFIRMED/);assert.equal(r.view().privateContextLoaded,false);
 }
});
test('late read after logout invalidation exposes no value and never touches SDK session',async()=>{
 const f=fixture();let resolve;f.options.rpc=()=>new Promise(r=>resolve=r);const r=createOwnerContextReader(f.options),pending=r.read(project),rejected=assert.rejects(pending,/PRIVATE_READ_NOT_CONFIRMED/);await new Promise(r=>setImmediate(r));r.invalidate();resolve({data:{projectId:project,contextHash:pin,filteredClaims:claims}});await rejected;assert.equal(r.view().privateContextLoaded,false);
});
test('loss of membership while transport runs denies the completed private response',async()=>{
 const f=fixture();f.options.rpc=async name=>{if(name==='mc_owner_context_scope')return{data:{projectId:project,contextHash:pin}};f.setActor({...actor(),memberActive:false});return{data:{projectId:project,contextHash:pin,filteredClaims:claims}};};const r=createOwnerContextReader(f.options);await assert.rejects(r.read(project),/PRIVATE_READ_NOT_CONFIRMED/);assert.equal(r.view().privateContextLoaded,false);
});
test('a newer forbidden scope invalidates an older in-flight private response',async()=>{
 const f=fixture();let resolve;f.options.rpc=()=>new Promise(r=>resolve=r);const r=createOwnerContextReader(f.options),pending=r.read(project),rejected=assert.rejects(pending,/PRIVATE_READ_NOT_CONFIRMED/);await new Promise(r=>setImmediate(r));await assert.rejects(r.read('UNKNOWN'),/PRIVATE_READ_NOT_AUTHORIZED/);resolve({data:{projectId:project,contextHash:pin,filteredClaims:claims}});await rejected;assert.equal(r.view().privateContextLoaded,false);
});
test('digest is checked against the cloned value exposed to the private viewer',async()=>{
 const f=fixture(),response=structuredClone(claims);f.options.rpc=async name=>({data:name==='mc_owner_context_scope'?{projectId:project,contextHash:pin}:{projectId:project,contextHash:pin,filteredClaims:response}});f.options.digest=async value=>{response.stage.value='SYNTHETIC_CHANGED_AFTER_REPLY';return continuityDigest(value);};const r=createOwnerContextReader(f.options);assert.deepEqual(await r.read(project),claims);
});
test('lookup errors, wrong project, bad pin and unexpected fields stop before content read',async()=>{
 for(const data of [null,{projectId:'WOOSONG_BUDDY',contextHash:pin},{projectId:project,contextHash:'bad'},{projectId:project,contextHash:pin,filteredClaims:claims}]){
  const f=fixture();f.options.rpc=async(name,args)=>{f.calls.push(name);return{data};};const r=createOwnerContextReader(f.options);await assert.rejects(r.read(project),/PRIVATE_READ_NOT_CONFIRMED/);assert.deepEqual(f.calls,['mc_owner_context_scope']);assert.equal(r.view().privateContextLoaded,false);
 }
});
test('membership lost during lookup stops before the private content RPC',async()=>{
 const f=fixture();f.options.rpc=async name=>{f.calls.push(name);f.setActor({...actor(),memberActive:false});return{data:{projectId:project,contextHash:pin}};};const r=createOwnerContextReader(f.options);await assert.rejects(r.read(project),/PRIVATE_READ_NOT_CONFIRMED/);assert.deepEqual(f.calls,['mc_owner_context_scope']);
});
test('dispose prevents any later read and removes in-memory private values',async()=>{
 const f=fixture(),r=createOwnerContextReader(f.options);await r.read(project);r.dispose();await assert.rejects(r.read(project),/PRIVATE_READ_NOT_AUTHORIZED/);assert.equal(r.view().privateContextLoaded,false);assert.equal(r.view().status,'closed');
});
