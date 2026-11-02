import test from 'node:test';
import assert from 'node:assert/strict';
import {readTowerCatalog,towerCatalogState,catalogNotice} from '../public/tower-catalog.js';
import {withMissionControlProject} from '../public/mission-control-project.js';
test('verified catalog establishes Owner readiness even when runs and ideas fail',async()=>{
 const engine={projectId:'AI_INTERACTIVE_EXPERIENCE_ENGINE',name:'PRIVATE_ENGINE'};
 const read=await readTowerCatalog(async()=>[engine]),state=towerCatalogState(read);
 assert.equal(state.ownerReady,true);assert.deepEqual(state.projects,[engine]);
 const cards=withMissionControlProject([...['NEXAEON','WOOSONG_BUDDY','NAMYOUNG_WEB3D','JOEY_ASSET_SYSTEM'].map(id=>({id})),...state.projects.map(p=>({id:p.projectId}))]);
 assert.equal(cards.length,6);assert.equal(new Set(cards.map(p=>p.id)).size,6);
});
test('auth absence, invalid reply and read failure cannot masquerade as an empty verified catalog',async()=>{
 const absent=await readTowerCatalog(async()=>null),failed=await readTowerCatalog(async()=>{throw Error('PRIVATE_INTERNAL_PATH');});
 assert.equal(absent.status,'signin');assert.equal(failed.status,'unavailable');assert.deepEqual(failed.projects,[]);
 assert.equal(towerCatalogState(absent).ownerReady,false);
 const other=towerCatalogState(failed,{otherOwnerReady:true});assert.equal(other.ownerReady,true);assert.deepEqual(other.projects,[]);
 const empty=await readTowerCatalog(async()=>[]);assert.equal(empty.status,'ready');assert.equal(towerCatalogState(empty).ownerReady,true);
 for(const locale of ['zh-TW','ko','en']){
  const guest=catalogNotice('unavailable',{guest:true,locale}),owner=catalogNotice('unavailable',{locale});
  assert.ok(guest.message);assert.equal(guest.retry,null);assert.ok(owner.retry);assert.ok(owner.message);
  assert.doesNotMatch(JSON.stringify([guest,owner]),/PRIVATE_INTERNAL_PATH|PRIVATE_ENGINE|AI_INTERACTIVE/);
  assert.equal(catalogNotice('ready',{locale}),null);
 }
});

test('stalled catalog read becomes explicit unavailable and late content is never adopted',async()=>{let resolve;const read=await readTowerCatalog(()=>new Promise(r=>resolve=r),{timeoutMs:5});assert.equal(read.status,'unavailable');resolve([{name:'PRIVATE_LATE'}]);await Promise.resolve();assert.deepEqual(read.projects,[]);});

import {createTowerRefresh} from '../public/tower-refresh.js';
test('manual retry starts immediately, avoids duplicate reads and clears scheduled polling',async()=>{
 const timers=new Map();let resolve,reads=0,id=0;
 const refresh=createTowerRefresh({read:()=>{reads++;return new Promise(r=>resolve=r);},render(){},setTimer:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clearTimer:i=>timers.delete(i)});
 refresh.schedule();refresh.refresh();assert.equal(reads,1);refresh.refresh();assert.equal(reads,1);resolve({ready:true,changed:true});await new Promise(r=>setImmediate(r));assert.equal(refresh.phase,'ready');
});
