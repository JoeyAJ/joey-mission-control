import test from 'node:test';
import assert from 'node:assert/strict';
import {createTowerStore} from '../public/tower-sync.js';

const memory=(seed={})=>{const data={...seed};return {data,getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=String(v);}};};
const cloud=()=>{const state={};return {state,push:async(key,id,entry)=>{state[key]||={};if(entry===null)delete state[key][id];else state[key][id]=entry;},fetch:async()=>structuredClone(state)};};
const tick=()=>new Promise(r=>setTimeout(r,0));

test('changed entries are pushed one by one while signed in; unsynced keys stay local',async()=>{
 const local=memory(),c=cloud();let online=true;const store=createTowerStore({local,push:c.push,isOnline:()=>online});
 store.storage.setItem('mc.tower.reviews.v1',JSON.stringify({A:{runId:'r1',decision:'accepted'}}));await tick();
 assert.deepEqual(c.state.reviews,{A:{runId:'r1',decision:'accepted'}});
 store.storage.setItem('mc.tower.handoffs.v1',JSON.stringify({B:{agent:'codex'}}));store.storage.setItem('mc.tower.handoffs.v1','{}');await tick();await tick();
 assert.deepEqual(c.state.handoffs,{});
 store.storage.setItem('mc.tower.localIdeas.v1','[1]');await tick();assert.equal(c.state.localIdeas,undefined);
});

test('first sync uploads existing local records, later syncs take the cloud copy',async()=>{
 const local=memory({'mc.tower.ideaDecisions.v1':JSON.stringify({draft_a:'go'})}),c=cloud();c.state.reviews={X:{runId:'r9',decision:'changes'}};
 const store=createTowerStore({local,push:c.push,isOnline:()=>true});
 assert.equal(await store.sync(c.fetch),true);
 assert.deepEqual(c.state.ideaDecisions,{draft_a:'go'});assert.deepEqual(JSON.parse(local.data['mc.tower.reviews.v1']),{X:{runId:'r9',decision:'changes'}});
 // Another device removed the decision: the cloud wins on the next sync.
 delete c.state.ideaDecisions.draft_a;local.data['mc.tower.ideaDecisions.v1']=JSON.stringify({draft_a:'go'});
 assert.equal(await store.sync(c.fetch),true);assert.deepEqual(JSON.parse(local.data['mc.tower.ideaDecisions.v1']),{});
 assert.equal(await store.sync(c.fetch),false);
});

test('changes made while signed out or during a failed push are kept and sent later',async()=>{
 const local=memory(),c=cloud();let online=false,fail=false;
 const store=createTowerStore({local,push:async(...a)=>{if(fail)throw Error('offline');return c.push(...a);},isOnline:()=>online});
 store.storage.setItem('mc.tower.handoffs.v1',JSON.stringify({A:{agent:'hermes'}}));await tick();
 assert.equal(store.pending(),1);assert.equal(c.state.handoffs,undefined);
 online=true;fail=true;assert.equal(await store.sync(c.fetch),false);assert.equal(store.pending(),1);
 fail=false;await store.sync(c.fetch);assert.equal(store.pending(),0);assert.deepEqual(c.state.handoffs,{A:{agent:'hermes'}});
 assert.deepEqual(JSON.parse(local.data['mc.tower.handoffs.v1']),{A:{agent:'hermes'}});
});
