import test from 'node:test';import assert from 'node:assert/strict';
import {createWorkbenchPaneMotion,freshWorkbenchMotionKeys} from '../src/reporting/workbench-motion.mjs';

function fixture(){
 const frames=new Map(),effects=[];let id=0;const listeners=new Set(),query={matches:false,addEventListener:(_,f)=>listeners.add(f),removeEventListener:(_,f)=>listeners.delete(f)};
 const m=createWorkbenchPaneMotion({requestFrame:f=>{frames.set(++id,f);return id;},cancelFrame:id=>frames.delete(id)});m.connect(query);
 const pane=(visible=true)=>({dataset:{},isConnected:true,getClientRects:()=>visible?[{}]:[],animate:(frames,options)=>{let reject;const a={frames,options,cancelled:false,finished:new Promise((_,r)=>reject=r),cancel(){this.cancelled=true;reject();}};effects.push(a);return a;}});
 const panes=[pane(),pane(),pane(false)],apply=(binding,extra={})=>m.apply({binding,panes,...extra}),flush=()=>{for(const f of [...frames.values()])f();frames.clear();},reduce=value=>{query.matches=value;for(const f of listeners)f();};
 return{m,panes,apply,flush,reduce,effects,frames,listeners,query};
}
test('initial/idle renders do not animate; a changed tuple coordinates visible panes only',()=>{
 const f=fixture();f.apply('A');f.flush();f.apply('A');assert.equal(f.effects.length,0);f.apply('B');f.flush();assert.equal(f.effects.length,2);assert(f.panes.slice(0,2).every(n=>n.dataset.workbenchMotionBinding==='B'));assert.equal(f.panes[2].dataset.workbenchMotion,undefined);assert(f.effects.every(a=>a.options.duration===180));
});
test('rapid changes cancel queued and in-flight old selection effects',()=>{
 const f=fixture();f.apply('A');f.apply('B');f.apply('C');f.flush();assert.equal(f.effects.length,2);assert(f.panes.slice(0,2).every(n=>n.dataset.workbenchMotionBinding==='C'));f.apply('D');assert(f.effects.every(a=>a.cancelled));f.flush();assert(f.panes.slice(0,2).every(n=>n.dataset.workbenchMotionBinding==='D'));
});
test('Owner/freshness drift before the frame suppresses pending motion and recovery starts still',()=>{
 const f=fixture();f.apply('A');f.apply('B',{current:()=>false});f.flush();assert.equal(f.effects.length,0);f.apply('C');f.flush();assert.equal(f.effects.length,0);f.apply('D',{eligible:false});assert(f.panes.every(n=>!n.dataset.workbenchMotionBinding));
});
test('after a transient read gap only a validated new report can start arrival motion',()=>{
 const f=fixture();f.apply('A');f.m.reset();f.apply('B',{kind:'report'});f.flush();assert.equal(f.effects.length,2);assert(f.panes.slice(0,2).every(n=>n.dataset.workbenchMotion==='report'));f.m.reset();f.apply('C');f.flush();assert.equal(f.effects.length,2);
});
test('a short user selection survives a transient view reread, but refusal and expiry discard it',()=>{
 const f=fixture();f.apply('A');f.m.request('B');f.m.pause();f.apply('B');f.flush();assert.equal(f.effects.length,2);f.m.request('C');f.m.reset();f.apply('C');f.flush();assert.equal(f.effects.length,2);
 let now=0;const frames=[];const m=createWorkbenchPaneMotion({requestFrame:f=>{frames.push(f);return frames.length;},cancelFrame:()=>{},now:()=>now});m.apply({binding:'A',panes:[]});m.request('B');m.pause();now=2001;m.apply({binding:'B',panes:[]});assert.equal(frames.length,0);
});
test('reduced motion stops queued/in-flight effects immediately and is not replayed when restored',()=>{
 const f=fixture();f.apply('A');f.apply('B');f.reduce(true);f.flush();assert.equal(f.effects.length,0);f.reduce(false);f.apply('B');assert.equal(f.effects.length,0);f.apply('C');f.flush();f.reduce(true);assert(f.effects.every(a=>a.cancelled));assert(f.panes.every(n=>!n.dataset.workbenchMotion));f.reduce(false);f.apply('C');f.flush();assert.equal(f.effects.length,2);
});
test('remount preserves last presented tuple but cancels old DOM and removes preference listener',()=>{
 const f=fixture();f.apply('A');f.apply('B');f.m.disconnect();assert.equal(f.frames.size,0);assert.equal(f.listeners.size,0);f.m.connect(f.query);f.apply('B');f.flush();assert.equal(f.effects.length,2);f.m.reset();assert(f.panes.every(n=>!n.dataset.workbenchMotion));f.apply('B');f.flush();assert.equal(f.effects.length,2);
});
test('outgoing mount cleanup cannot cancel the replacement mount frame',()=>{
 const f=fixture(),oldMount={},newMount={};f.m.connect(f.query,oldMount);f.apply('A');f.m.request('B');f.m.connect(f.query,newMount);f.apply('B');f.m.disconnect(oldMount);assert.equal(f.frames.size,1);assert.equal(f.listeners.size,1);f.flush();assert.equal(f.effects.length,2);f.m.disconnect(newMount);assert(f.effects.every(a=>a.cancelled));assert.equal(f.listeners.size,0);
});
test('new event highlights reject stale/unknown runs, older/future events and dated file observations',()=>{
 const now=Date.parse('2026-10-11T20:00:00Z'),at=age=>new Date(now-age).toISOString();
 const projection={runs:[{report:{runId:'fresh'},presentation:{freshness:'FRESH'}},{report:{runId:'stale'},presentation:{freshness:'STALE'}}],events:[{key:'good',runId:'fresh',event:{eventAt:at(1000)}},{key:'stale',runId:'stale',event:{eventAt:at(1000)}},{key:'old',runId:'fresh',event:{eventAt:at(300001)}},{key:'future',runId:'fresh',event:{eventAt:at(-1)}},{key:'dated-file',runId:'fresh',event:{eventAt:at(1000),activity:{observedAt:at(300001)}}}]};
 assert.deepEqual(freshWorkbenchMotionKeys(projection,projection.events.map(e=>e.key),now),['good']);assert.deepEqual(freshWorkbenchMotionKeys(projection,[],now),[]);
});
